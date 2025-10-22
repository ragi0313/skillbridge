// Modified version with manual processing fallback for unverified Xendit accounts

import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth/getSession"
import { db } from "@/db"
import { users, mentors, creditWithdrawals, creditTransactions } from "@/db/schema"
import { eq, and, desc } from "drizzle-orm"
import { Xendit } from "xendit-node"

const xendit = new Xendit({
  secretKey: process.env.XENDIT_SECRET_KEY!
})

const Payout = xendit.Payout

const CREDIT_TO_PHP_RATE = 11.2
const WITHDRAWAL_FEE_PERCENTAGE = 3
const MIN_WITHDRAWAL_CREDITS = 10

// Check if we're in production mode with verified business account
const IS_XENDIT_VERIFIED = process.env.XENDIT_BUSINESS_VERIFIED === 'true'

// POST - Request withdrawal with fallback for unverified accounts
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== "mentor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      creditsAmount,
      payoutMethod = 'xendit_transfer',
      bankCode,
      accountHolderName,
      accountNumber
    } = body

    // Validation
    if (!creditsAmount || creditsAmount < MIN_WITHDRAWAL_CREDITS) {
      return NextResponse.json({
        error: `Minimum withdrawal is ${MIN_WITHDRAWAL_CREDITS} credits`
      }, { status: 400 })
    }

    if (payoutMethod === 'xendit_transfer') {
      if (!bankCode || !accountHolderName || !accountNumber) {
        return NextResponse.json({
          error: "Bank details are required for Xendit transfers"
        }, { status: 400 })
      }
    }

    // Get mentor record
    const [mentor] = await db
      .select({
        id: mentors.id,
        creditsBalance: mentors.creditsBalance,
        userId: mentors.userId,
      })
      .from(mentors)
      .innerJoin(users, eq(mentors.userId, users.id))
      .where(eq(users.id, session.id))
      .limit(1)

    if (!mentor) {
      return NextResponse.json({ error: "Mentor not found" }, { status: 404 })
    }

    // Check available balance
    const pendingWithdrawals = await db
      .select()
      .from(creditWithdrawals)
      .where(and(
        eq(creditWithdrawals.mentorId, mentor.id),
        eq(creditWithdrawals.status, 'pending')
      ))

    const pendingCredits = pendingWithdrawals.reduce((sum, w) => sum + w.creditsAmount, 0)
    const availableCredits = mentor.creditsBalance - pendingCredits

    if (creditsAmount > availableCredits) {
      return NextResponse.json({
        error: "Insufficient available credits",
        availableCredits
      }, { status: 400 })
    }

    // Calculate amounts
    const phpAmount = creditsAmount * CREDIT_TO_PHP_RATE
    const platformFee = phpAmount * (WITHDRAWAL_FEE_PERCENTAGE / 100)
    const netAmount = phpAmount - platformFee

    // Create withdrawal record
    const [withdrawal] = await db
      .insert(creditWithdrawals)
      .values({
        mentorId: mentor.id,
        creditsAmount,
        usdAmount: phpAmount.toString(),
        platformFee: platformFee.toString(),
        netAmount: netAmount.toString(),
        status: 'pending',
        payoutMethod,
        xenditChannelCode: bankCode,
        bankDetails: {
          bankCode,
          accountHolderName,
          accountNumber
        }
      })
      .returning()

    // DECISION POINT: Automatic vs Manual Processing
    if (IS_XENDIT_VERIFIED && payoutMethod === 'xendit_transfer') {
      // PRODUCTION MODE: Process withdrawal automatically via Xendit
      try {
        await processXenditWithdrawal(
          withdrawal.id,
          netAmount,
          bankCode,
          accountHolderName,
          accountNumber
        )

        return NextResponse.json({
          success: true,
          data: {
            withdrawalId: withdrawal.id,
            creditsAmount,
            phpAmount,
            platformFee,
            netAmount,
            status: 'processing',
            processingType: 'automatic',
            estimatedProcessingTime: '1-3 business days',
            message: 'Withdrawal is being processed automatically via Xendit'
          }
        })
      } catch (xenditError) {
        console.error("[XENDIT_WITHDRAWAL] Automatic processing failed:", xenditError)

        // Fall back to manual processing
        await db
          .update(creditWithdrawals)
          .set({
            status: 'pending',
            metadata: {
              processingType: 'manual_fallback',
              autoProcessingError: xenditError instanceof Error ? xenditError.message : 'Unknown error'
            }
          })
          .where(eq(creditWithdrawals.id, withdrawal.id))

        return NextResponse.json({
          success: true,
          data: {
            withdrawalId: withdrawal.id,
            creditsAmount,
            phpAmount,
            platformFee,
            netAmount,
            status: 'pending',
            processingType: 'manual',
            estimatedProcessingTime: '3-5 business days',
            message: 'Withdrawal request submitted. Our admin team will process this manually within 3-5 business days.'
          }
        })
      }
    } else {
      // TEST MODE or UNVERIFIED: Queue for manual processing
      return NextResponse.json({
        success: true,
        data: {
          withdrawalId: withdrawal.id,
          creditsAmount,
          phpAmount,
          platformFee,
          netAmount,
          status: 'pending',
          processingType: 'manual',
          estimatedProcessingTime: '3-5 business days',
          message: IS_XENDIT_VERIFIED
            ? 'Withdrawal request submitted for manual processing'
            : 'Withdrawal request submitted. Currently in test mode - admin will process manually.',
          notice: !IS_XENDIT_VERIFIED
            ? 'Note: Platform is using test payment gateway. In production, withdrawals will be processed automatically within 1-3 business days.'
            : undefined
        }
      })
    }

  } catch (error) {
    console.error("[XENDIT_WITHDRAWALS_POST] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Process Xendit withdrawal (only called when verified)
async function processXenditWithdrawal(
  withdrawalId: number,
  netAmount: number,
  bankCode: string,
  accountHolderName: string,
  accountNumber: string
) {
  try {
    await db
      .update(creditWithdrawals)
      .set({
        status: 'processing',
        processedAt: new Date(),
      })
      .where(eq(creditWithdrawals.id, withdrawalId))

    const payout = await Payout.createPayout({
      idempotencyKey: `withdrawal_${withdrawalId}_${Date.now()}`,
      data: {
        referenceId: `withdrawal_${withdrawalId}_${Date.now()}`,
        channelCode: `PH_${bankCode}`, // Add PH_ prefix for Philippine banks
        channelProperties: {
          accountHolderName: accountHolderName,
          accountNumber: accountNumber
        },
        description: `SkillBridge Credit Withdrawal - ID: ${withdrawalId}`,
        amount: Math.round(netAmount * 100) / 100,
        currency: 'PHP',
        metadata: {
          withdrawalId: withdrawalId.toString(),
          type: 'credit_withdrawal',
          platform: 'skillbridge'
        }
      }
    })

    await db
      .update(creditWithdrawals)
      .set({
        status: 'completed',
        xenditDisbursementId: payout.id,
        completedAt: new Date(),
        metadata: {
          xenditPayout: payout,
          bankCode,
          processingType: 'automatic'
        },
      })
      .where(eq(creditWithdrawals.id, withdrawalId))

    // Deduct credits from mentor balance
    const [withdrawal] = await db
      .select()
      .from(creditWithdrawals)
      .where(eq(creditWithdrawals.id, withdrawalId))
      .limit(1)

    if (withdrawal) {
      const [mentor] = await db
        .select({ creditsBalance: mentors.creditsBalance })
        .from(mentors)
        .where(eq(mentors.id, withdrawal.mentorId))
        .limit(1)

      if (mentor) {
        const newBalance = mentor.creditsBalance - withdrawal.creditsAmount

        await db
          .update(mentors)
          .set({ creditsBalance: newBalance })
          .where(eq(mentors.id, withdrawal.mentorId))

        await db
          .insert(creditTransactions)
          .values({
            userId: withdrawal.mentorId,
            type: 'credit_withdrawal',
            direction: 'debit',
            amount: withdrawal.creditsAmount,
            balanceBefore: mentor.creditsBalance,
            balanceAfter: newBalance,
            description: `Credit withdrawal - ₱${withdrawal.netAmount} transferred via Xendit (automatic)`,
            metadata: {
              withdrawalId: withdrawal.id,
              xenditPayoutId: payout.id,
              processingType: 'automatic'
            },
          })
      }
    }
  } catch (error) {
    console.error(`[XENDIT_WITHDRAWAL] Processing failed for withdrawal ${withdrawalId}:`, error)

    await db
      .update(creditWithdrawals)
      .set({
        status: 'failed',
        failureReason: `Xendit error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      })
      .where(eq(creditWithdrawals.id, withdrawalId))

    throw error
  }
}
