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

    // Process withdrawal immediately via Xendit
    if (payoutMethod === 'xendit_transfer') {
      try {
        await processXenditWithdrawal(
          withdrawal.id, 
          netAmount, 
          bankCode, 
          accountHolderName, 
          accountNumber
        )
      } catch (xenditError) {
        console.error("[XENDIT_WITHDRAWAL] Processing failed:", xenditError)
        // Update withdrawal status to failed
        await db
          .update(creditWithdrawals)
          .set({ 
            status: 'failed',
            failureReason: `Xendit error: ${xenditError instanceof Error ? xenditError.message : 'Unknown error'}`,
            processedAt: new Date(),
          })
          .where(eq(creditWithdrawals.id, withdrawal.id))

        return NextResponse.json({ 
          error: "Withdrawal processing failed. Please try again later." 
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
        estimatedProcessingTime: payoutMethod === 'xendit_transfer' ? 'Processing...' : '1-3 business days',
      }
    })

  } catch (error) {
    console.error("[XENDIT_WITHDRAWALS_POST] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Process Xendit withdrawal via disbursement
async function processXenditWithdrawal(
  withdrawalId: number, 
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

    // Update withdrawal with Xendit payout ID
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

    // Get withdrawal details for transaction record
    const [withdrawal] = await db
      .select()
      .from(creditWithdrawals)
      .where(eq(creditWithdrawals.id, withdrawalId))
      .limit(1)

    if (withdrawal) {
      // Get mentor's current balance
      const [mentor] = await db
        .select({ creditsBalance: mentors.creditsBalance })
        .from(mentors)
        .where(eq(mentors.id, withdrawal.mentorId))
        .limit(1)

      if (mentor) {
        // Deduct credits from mentor's balance
        const newBalance = mentor.creditsBalance - withdrawal.creditsAmount
        
        await db
          .update(mentors)
          .set({ creditsBalance: newBalance })
          .where(eq(mentors.id, withdrawal.mentorId))

        // Record the transaction
        await db
          .insert(creditTransactions)
          .values({
            userId: withdrawal.mentorId, // Note: This should ideally be the user ID, but using mentor ID for now
            type: 'credit_withdrawal',
            direction: 'debit',
            amount: withdrawal.creditsAmount,
            balanceBefore: mentor.creditsBalance,
            balanceAfter: newBalance,
            description: `Credit withdrawal - ₱${withdrawal.netAmount} transferred via Xendit`,
            metadata: {
              withdrawalId: withdrawal.id,
              xenditPayoutId: payout.id,
              usdAmount: withdrawal.usdAmount,
              platformFee: withdrawal.platformFee,
              netAmount: withdrawal.netAmount,
              bankCode,
            },
          })
      }
    }

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