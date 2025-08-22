import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { users, learners } from "@/db/schema"
import { eq } from "drizzle-orm"
import { getSession } from "@/lib/auth/getSession"
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

// GET - Get learner's credit balance and withdrawal options
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is a learner
    const [learner] = await db
      .select({ 
        id: learners.id,
        credits: learners.creditsBalance 
      })
      .from(learners)
      .where(eq(learners.userId, session.id))
      .limit(1)

    if (!learner) {
      return NextResponse.json({ error: "Only learners can view credit balance" }, { status: 403 })
    }

    return NextResponse.json({
      availableCredits: learner.credits || 0,
      canWithdraw: (learner.credits || 0) >= 10 // Minimum 10 credits
    })

  } catch (error) {
    console.error("Error fetching learner credits:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Process learner credit withdrawal/refund
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is a learner
    const [learner] = await db
      .select({ 
        id: learners.id,
        credits: learners.creditsBalance 
      })
      .from(learners)
      .where(eq(learners.userId, session.id))
      .limit(1)

    if (!learner) {
      return NextResponse.json({ error: "Only learners can withdraw credits" }, { status: 403 })
    }

    const { withdrawalAmount } = await request.json()

    // Validate input
    if (!withdrawalAmount || withdrawalAmount <= 0) {
      return NextResponse.json({ error: "Invalid withdrawal amount" }, { status: 400 })
    }

    const availableCredits = learner.credits || 0

    if (withdrawalAmount > availableCredits) {
      return NextResponse.json({ 
        error: `Insufficient credits. Available: ${availableCredits} credits` 
      }, { status: 400 })
    }

    if (withdrawalAmount < 10) {
      return NextResponse.json({ 
        error: "Minimum withdrawal amount is 10 credits" 
      }, { status: 400 })
    }

    // Calculate withdrawal fee
    const WITHDRAWAL_FEE_PERCENTAGE = 0.03 // 3%
    const MIN_FEE = 2.99 // Minimum $2.99 fee
    const FREE_WITHDRAWAL_THRESHOLD = 50 // Free for withdrawals over $50

    let withdrawalFee = 0
    if (withdrawalAmount < FREE_WITHDRAWAL_THRESHOLD) {
      const percentageFee = withdrawalAmount * WITHDRAWAL_FEE_PERCENTAGE
      withdrawalFee = Math.max(percentageFee, MIN_FEE)
    }

    const totalDeduction = withdrawalAmount + withdrawalFee
    if (totalDeduction > availableCredits) {
      return NextResponse.json({ 
        error: `Insufficient credits for withdrawal + fee. Available: ${availableCredits} credits, Required: ${totalDeduction} credits (includes $${withdrawalFee.toFixed(2)} fee)` 
      }, { status: 400 })
    }

    try {
      // For learners, we'll process refunds directly back to their original payment method
      // This would typically involve looking up their Stripe customer ID and creating a refund
      
      // Get user's Stripe customer ID (you'd store this during registration/first payment)
      const [user] = await db
        .select({ stripeCustomerId: users.stripeCustomerId })
        .from(users)
        .where(eq(users.id, session.id))
        .limit(1)

      if (!user?.stripeCustomerId) {
        return NextResponse.json({ 
          error: "No payment method on file. Please contact support for manual refund." 
        }, { status: 400 })
      }

      // Create a refund for the withdrawal amount
      // Note: In a real scenario, you'd need to track which charges to refund from
      const amountCents = withdrawalAmount * 100 // Convert credits to cents (assuming 1 credit = $1)

      // For now, we'll create a credit to the customer's account instead of a direct refund
      // In production, you'd create an actual refund to their original payment method
      const creditNote = await stripe.creditNotes.create({
        amount: amountCents,
        reason: 'general',
        memo: `Credit withdrawal: ${withdrawalAmount} credits`
      })

      // Update learner's credit balance (deduct withdrawal + fee)
      await db.transaction(async (tx) => {
        await tx
          .update(learners)
          .set({ 
            creditsBalance: availableCredits - totalDeduction,
            updatedAt: new Date()
          })
          .where(eq(learners.id, learner.id))

        // Create notification
        const { notifications } = await import("@/db/schema")
        await tx.insert(notifications).values({
          userId: session.id,
          type: "credit_withdrawal",
          title: "Credit Withdrawal Processed",
          message: withdrawalFee > 0 
            ? `Your withdrawal of ${withdrawalAmount} credits has been processed (${withdrawalFee.toFixed(2)} credits withdrawal fee applied). The refund will appear on your payment method within 5-10 business days.`
            : `Your withdrawal of ${withdrawalAmount} credits has been processed. The refund will appear on your payment method within 5-10 business days.`,
          relatedEntityType: "withdrawal",
          relatedEntityId: parseInt(creditNote.id),
          createdAt: new Date()
        })
      })

      return NextResponse.json({
        message: "Credit withdrawal processed successfully",
        withdrawnAmount: withdrawalAmount,
        withdrawalFee: withdrawalFee,
        totalDeducted: totalDeduction,
        remainingCredits: availableCredits - totalDeduction,
        refundReference: creditNote.id
      })

    } catch (stripeError) {
      console.error("Stripe error during withdrawal:", stripeError)
      return NextResponse.json({ 
        error: "Failed to process withdrawal. Please try again or contact support." 
      }, { status: 500 })
    }

  } catch (error) {
    console.error("Error processing learner withdrawal:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}