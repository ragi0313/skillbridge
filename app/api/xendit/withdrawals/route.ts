import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth/getSession"
import { db } from "@/db"
import { users, mentors, creditWithdrawals, creditTransactions } from "@/db/schema"
import { eq, and, desc } from "drizzle-orm"
import { Xendit } from "xendit-node"

const xendit = new Xendit({ 
  secretKey: process.env.XENDIT_SECRET_KEY! 
})

// Use the correct way to access Payout API (Xendit calls disbursements "Payouts")
const Payout = xendit.Payout

// Credit to PHP conversion rate (1 credit = ₱11.2)
const CREDIT_TO_PHP_RATE = 11.2

// Platform withdrawal fee percentage (e.g., 3% processing fee)
const WITHDRAWAL_FEE_PERCENTAGE = 3

// Minimum withdrawal amount in credits
const MIN_WITHDRAWAL_CREDITS = 10

// GET - Get withdrawal history and available balance
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== "mentor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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

    // Get withdrawal history
    const withdrawals = await db
      .select()
      .from(creditWithdrawals)
      .where(eq(creditWithdrawals.mentorId, mentor.id))
      .orderBy(desc(creditWithdrawals.createdAt))

    // Calculate available balance (excluding pending withdrawals)
    const pendingWithdrawals = withdrawals
      .filter(w => w.status === 'pending' || w.status === 'processing')
      .reduce((sum, w) => sum + w.creditsAmount, 0);

    const availableCredits = mentor.creditsBalance - pendingWithdrawals

    return NextResponse.json({
      success: true,
      data: {
        totalCredits: mentor.creditsBalance,
        availableCredits: Math.max(0, availableCredits),
        pendingWithdrawalCredits: pendingWithdrawals,
        withdrawals: withdrawals.map(w => ({
          id: w.id,
          creditsAmount: w.creditsAmount,
          usdAmount: w.usdAmount,
          platformFee: w.platformFee,
          netAmount: w.netAmount,
          status: w.status,
          payoutMethod: w.payoutMethod,
          createdAt: w.createdAt,
          processedAt: w.processedAt,
          completedAt: w.completedAt,
          failureReason: w.failureReason,
        })),
        conversionRate: CREDIT_TO_PHP_RATE,
        withdrawalFeePercentage: WITHDRAWAL_FEE_PERCENTAGE,
        minimumWithdrawal: MIN_WITHDRAWAL_CREDITS,
      }
    })
  } catch (error) {
    console.error("[XENDIT_WITHDRAWALS_GET] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Request withdrawal via Xendit
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

    // Validate required bank details for Xendit transfers
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
        preferredPaymentProvider: users.preferredPaymentProvider,
      })
      .from(mentors)
      .innerJoin(users, eq(mentors.userId, users.id))
      .where(eq(users.id, session.id))
      .limit(1)

    if (!mentor) {
      return NextResponse.json({ error: "Mentor not found" }, { status: 404 })
    }

    // Check available balance (excluding pending withdrawals)
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

    // Use database transaction to ensure atomicity
    const result = await db.transaction(async (tx) => {
      // Create withdrawal record
      const [withdrawal] = await tx
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

      // IMMEDIATELY deduct credits from mentor's balance
      // This prevents double-spending (mentor can't request multiple withdrawals with same credits)
      const [updatedMentor] = await tx
        .update(mentors)
        .set({ creditsBalance: mentor.creditsBalance - creditsAmount })
        .where(eq(mentors.id, mentor.id))
        .returning({ newBalance: mentors.creditsBalance })

      // Record credit transaction
      await tx
        .insert(creditTransactions)
        .values({
          userId: mentor.userId,
          type: 'withdrawal',
          direction: 'debit',
          amount: creditsAmount,
          balanceBefore: mentor.creditsBalance,
          balanceAfter: updatedMentor.newBalance,
          description: `Withdrawal request - Converting ${creditsAmount} credits to ₱${phpAmount.toFixed(2)}`,
          metadata: {
            withdrawalId: withdrawal.id,
            phpAmount,
            platformFee,
            netAmount,
            bankCode,
            payoutMethod,
          },
        })

      return { withdrawal, newBalance: updatedMentor.newBalance }
    })

    const withdrawal = result.withdrawal

    // Process withdrawal immediately via Xendit
    if (payoutMethod === 'xendit_transfer') {
      try {
        await processXenditWithdrawal(
          withdrawal.id,
          mentor.id,
          netAmount,
          bankCode,
          accountHolderName,
          accountNumber
        )
      } catch (xenditError) {
        console.error("[XENDIT_WITHDRAWAL] Processing failed:", xenditError)

        // Refund credits back to mentor since Xendit failed
        await db.transaction(async (tx) => {
          // Update withdrawal status to failed
          await tx
            .update(creditWithdrawals)
            .set({
              status: 'failed',
              failureReason: `Xendit error: ${xenditError instanceof Error ? xenditError.message : 'Unknown error'}`,
              processedAt: new Date(),
            })
            .where(eq(creditWithdrawals.id, withdrawal.id))

          // Refund credits back to mentor
          const [refundedMentor] = await tx
            .update(mentors)
            .set({ creditsBalance: result.newBalance + creditsAmount })
            .where(eq(mentors.id, mentor.id))
            .returning({ refundedBalance: mentors.creditsBalance })

          // Record refund transaction
          await tx
            .insert(creditTransactions)
            .values({
              userId: mentor.userId,
              type: 'refund',
              direction: 'credit',
              amount: creditsAmount,
              balanceBefore: result.newBalance,
              balanceAfter: refundedMentor.refundedBalance,
              description: `Withdrawal failed - Credits refunded (Withdrawal ID: ${withdrawal.id})`,
              metadata: {
                withdrawalId: withdrawal.id,
                failureReason: xenditError instanceof Error ? xenditError.message : 'Unknown error',
              },
            })
        })

        return NextResponse.json({
          error: "Withdrawal processing failed. Credits have been refunded to your account."
        }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        withdrawalId: withdrawal.id,
        creditsAmount,
        phpAmount,
        platformFee,
        netAmount,
        status: withdrawal.status,
        newCreditBalance: result.newBalance,
        estimatedProcessingTime: payoutMethod === 'xendit_transfer' ? 'Processing...' : '1-3 business days',
      }
    })

  } catch (error) {
    console.error("[XENDIT_WITHDRAWALS_POST] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Process Xendit withdrawal via disbursement
// NOTE: Credits are already deducted before calling this function
async function processXenditWithdrawal(
  withdrawalId: number,
  mentorId: number,
  netAmount: number,
  bankCode: string,
  accountHolderName: string,
  accountNumber: string
) {
  try {
    // Update status to processing
    await db
      .update(creditWithdrawals)
      .set({
        status: 'processing',
        processedAt: new Date(),
      })
      .where(eq(creditWithdrawals.id, withdrawalId))

    // Create Xendit payout (disbursement)
    const payout = await Payout.createPayout({
      idempotencyKey: `withdrawal_${withdrawalId}_${Date.now()}`,
      data: {
        referenceId: `withdrawal_${withdrawalId}_${Date.now()}`,
        channelCode: bankCode,
        channelProperties: {
          accountHolderName: accountHolderName,
          accountNumber: accountNumber
        },
        description: `SkillBridge Credit Withdrawal - ID: ${withdrawalId}`,
        amount: Math.round(netAmount * 100) / 100, // Ensure proper decimal formatting
        currency: 'PHP', // Use PHP for Philippine banks
        metadata: {
          withdrawalId: withdrawalId.toString(),
          type: 'credit_withdrawal',
          platform: 'skillbridge'
        }
      }
    })

    // Update withdrawal with Xendit payout ID and mark as completed
    await db
      .update(creditWithdrawals)
      .set({
        status: 'completed', // Xendit payouts are typically completed immediately
        xenditDisbursementId: payout.id,
        completedAt: new Date(),
        metadata: {
          xenditPayout: payout,
          bankCode,
          accountHolderName: accountHolderName.replace(/./g, '*') // Mask account holder name
        },
      })
      .where(eq(creditWithdrawals.id, withdrawalId))

    console.log(`[XENDIT_WITHDRAWAL] Successfully processed withdrawal ${withdrawalId}, Xendit Payout ID: ${payout.id}`)

  } catch (error) {
    console.error(`[XENDIT_WITHDRAWAL] Processing failed for withdrawal ${withdrawalId}:`, error)

    // Update withdrawal status to failed
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