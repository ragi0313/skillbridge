import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { users, mentors, learners, withdrawalRequests, creditTransactions } from "@/db/schema"
import { eq, and, desc, sum } from "drizzle-orm"
import { getSession } from "@/lib/auth/getSession"
import { validateWithdrawalSecurity, logWithdrawalSecurityEvent } from "@/lib/security/withdrawalSecurity"
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil', 
})

// Credit to USD conversion rate (5 credits = $1 USD)
const CREDITS_TO_USD_RATE = 0.2 // 1 credit = $0.20
const MIN_WITHDRAWAL_CREDITS = 25 // Minimum 25 credits ($5 USD)

// Fee structure according to documentation
function calculateWithdrawalFee(amountUsd: number): number {
  const FEE_PERCENTAGE = 0.015 // 1.5%
  const MIN_FEE = 0.50 // $0.50 minimum
  const MAX_FEE_PERCENTAGE = 0.05 // 5% maximum
  
  const percentageFee = amountUsd * FEE_PERCENTAGE
  const maxFee = amountUsd * MAX_FEE_PERCENTAGE
  
  return Math.min(Math.max(percentageFee, MIN_FEE), maxFee)
}

// GET - Get withdrawal summary and history
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user info and check if mentor or learner
    const [user] = await db
      .select({
        id: users.id,
        role: users.role
      })
      .from(users)
      .where(eq(users.id, session.id))
      .limit(1)

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get credits based on role
    let availableCredits = 0
    
    if (user.role === 'mentor') {
      const [mentor] = await db
        .select({ credits: mentors.creditsBalance })
        .from(mentors)
        .where(eq(mentors.userId, session.id))
        .limit(1)
      availableCredits = mentor?.credits || 0
    } else if (user.role === 'learner') {
      const [learner] = await db
        .select({ credits: learners.creditsBalance })
        .from(learners)
        .where(eq(learners.userId, session.id))
        .limit(1)
      availableCredits = learner?.credits || 0
    } else {
      return NextResponse.json({ error: "Only mentors and learners can withdraw" }, { status: 403 })
    }

    // FIXED: Use userId instead of mentorId
    const withdrawalHistory = await db
      .select()
      .from(withdrawalRequests)
      .where(eq(withdrawalRequests.userId, session.id))
      .orderBy(desc(withdrawalRequests.createdAt))

    // Calculate pending withdrawals
    const pendingWithdrawals = withdrawalHistory
      .filter(w => w.status !== null && ['pending', 'approved', 'processing'].includes(w.status))
      .reduce((sum, w) => sum + w.requestedCredits, 0);

    // Calculate withdrawable credits (available - pending)
    const withdrawableCredits = Math.max(0, availableCredits - pendingWithdrawals)

    // Calculate total fees paid (from completed withdrawals)
    const completedWithdrawals = withdrawalHistory.filter(w => w.status === 'completed')
    const totalFeesPaid = completedWithdrawals.reduce((sum, w) => {
      const amountUsd = parseFloat(w.requestedAmountUsd.toString())
      return sum + calculateWithdrawalFee(amountUsd)
    }, 0)

    return NextResponse.json({
      summary: {
        availableCredits,
        pendingCredits: pendingWithdrawals,
        withdrawableCredits,
        totalFeesPaid: Math.round(totalFeesPaid * 100) / 100,
        canWithdraw: withdrawableCredits >= MIN_WITHDRAWAL_CREDITS,
        minWithdrawal: MIN_WITHDRAWAL_CREDITS,
        conversionRate: CREDITS_TO_USD_RATE
      },
      requests: withdrawalHistory.map(request => ({
        id: request.id,
        requestedCredits: request.requestedCredits,
        requestedAmountUsd: request.requestedAmountUsd,
        status: request.status,
        payoutMethod: request.payoutMethod,
        createdAt: request.createdAt,
        processedAt: request.processedAt,
        completedAt: request.completedAt,
        adminNotes: request.adminNotes
      }))
    })

  } catch (error) {
    console.error("Error fetching withdrawals:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Create withdrawal request
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { requestedCredits, payoutMethod, stripeAccountId } = body

    // Validate input
    if (!requestedCredits || requestedCredits < MIN_WITHDRAWAL_CREDITS) {
      return NextResponse.json({ 
        error: `Minimum withdrawal amount is ${MIN_WITHDRAWAL_CREDITS} credits ($${(MIN_WITHDRAWAL_CREDITS * CREDITS_TO_USD_RATE).toFixed(2)})` 
      }, { status: 400 })
    }

    if (!payoutMethod || !['stripe_express'].includes(payoutMethod)) {
      return NextResponse.json({ 
        error: "Invalid payout method. Only Stripe Express is supported." 
      }, { status: 400 })
    }

    // Get user info
    const [user] = await db
      .select({
        id: users.id,
        role: users.role
      })
      .from(users)
      .where(eq(users.id, session.id))
      .limit(1)

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get available credits based on role
    let availableCredits = 0
    
    if (user.role === 'mentor') {
      const [mentor] = await db
        .select({ credits: mentors.creditsBalance })
        .from(mentors)
        .where(eq(mentors.userId, session.id))
        .limit(1)
      availableCredits = mentor?.credits || 0
    } else if (user.role === 'learner') {
      const [learner] = await db
        .select({ credits: learners.creditsBalance })
        .from(learners)
        .where(eq(learners.userId, session.id))
        .limit(1)
      availableCredits = learner?.credits || 0
    } else {
      return NextResponse.json({ error: "Only mentors and learners can withdraw" }, { status: 403 })
    }

    // Check if user has enough credits
    if (requestedCredits > availableCredits) {
      return NextResponse.json({ 
        error: `Insufficient credits. Available: ${availableCredits} credits` 
      }, { status: 400 })
    }

    // Calculate withdrawal amount and fees
    const requestedAmountUsd = requestedCredits * CREDITS_TO_USD_RATE
    const withdrawalFee = calculateWithdrawalFee(requestedAmountUsd)
    const netAmount = requestedAmountUsd - withdrawalFee

    // Security validation
    const securityCheck = await validateWithdrawalSecurity(session.id, requestedCredits, requestedAmountUsd)
    
    if (!securityCheck.isValid) {
      await logWithdrawalSecurityEvent(
        session.id,
        'withdrawal_request_blocked',
        { errors: securityCheck.errors, requestedCredits, requestedAmountUsd },
        securityCheck.riskLevel
      )
      return NextResponse.json({ 
        error: securityCheck.errors.join(', ') 
      }, { status: 400 })
    }

    // Log security warnings for high/medium risk
    if (securityCheck.riskLevel === 'high' || securityCheck.riskLevel === 'medium') {
      await logWithdrawalSecurityEvent(
        session.id,
        'withdrawal_request_flagged',
        { warnings: securityCheck.warnings, riskLevel: securityCheck.riskLevel, requestedCredits, requestedAmountUsd },
        securityCheck.riskLevel
      )
    }

    // Validate Stripe account if provided
    if (payoutMethod === 'stripe_express' && stripeAccountId) {
      try {
        const account = await stripe.accounts.retrieve(stripeAccountId)
        if (!account.charges_enabled || !account.payouts_enabled) {
          return NextResponse.json({ 
            error: "Stripe account is not fully setup for payouts" 
          }, { status: 400 })
        }
      } catch (stripeError) {
        console.error("Stripe account validation error:", stripeError)
        return NextResponse.json({ 
          error: "Invalid Stripe account" 
        }, { status: 400 })
      }
    }

    // Create withdrawal request
    const [withdrawalRequest] = await db.transaction(async (tx) => {
      // FIXED: Insert with correct field names
      const [newRequest] = await tx
        .insert(withdrawalRequests)
        .values({
          userId: session.id, // FIXED: Use userId instead of mentorId
          requestedCredits,
          requestedAmountUsd: requestedAmountUsd.toFixed(2),
          feeAmount: withdrawalFee.toFixed(2),
          netAmount: netAmount.toFixed(2),
          status: 'pending',
          payoutMethod,
          payoutDetails: {
            stripeAccountId: stripeAccountId || null,
          },
          stripeAccountId: stripeAccountId || null,
          createdAt: new Date()
        })
        .returning()

      // Create credit transaction record
      await tx
        .insert(creditTransactions)
        .values({
          userId: session.id,
          type: 'withdrawal_request',
          direction: 'debit',
          amount: requestedCredits,
          balanceBefore: availableCredits,
          balanceAfter: availableCredits, // Don't deduct yet, wait for processing
          description: `Withdrawal request #${newRequest.id}`,
          metadata: {
            withdrawalRequestId: newRequest.id,
            amountUsd: requestedAmountUsd,
            feeAmount: withdrawalFee,
            netAmount: netAmount
          },
          createdAt: new Date()
        })

      return [newRequest]
    })

    return NextResponse.json({
      message: "Withdrawal request created successfully",
      request: {
        id: withdrawalRequest.id,
        requestedCredits,
        requestedAmountUsd: requestedAmountUsd.toFixed(2),
        feeAmount: withdrawalFee.toFixed(2),
        netAmount: netAmount.toFixed(2),
        status: 'pending'
      }
    }, { status: 201 })

  } catch (error) {
    console.error("Error creating withdrawal request:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}