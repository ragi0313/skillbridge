import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { withdrawalRequests, mentors, users, mentorPayouts } from "@/db/schema"
import { eq, and, sum, desc } from "drizzle-orm"
import { getSession } from "@/lib/auth/getSession"
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

// GET - Fetch withdrawal requests for current user
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is a mentor
    const [mentor] = await db
      .select({ id: mentors.id })
      .from(mentors)
      .where(eq(mentors.userId, session.id))
      .limit(1)

    if (!mentor) {
      return NextResponse.json({ error: "Only mentors can view withdrawal requests" }, { status: 403 })
    }

    // Get mentor's withdrawal requests
    const requests = await db
      .select()
      .from(withdrawalRequests)
      .where(eq(withdrawalRequests.mentorId, mentor.id))
      .orderBy(desc(withdrawalRequests.createdAt))

    // Get available credits (released payouts that haven't been withdrawn)
    const availableCreditsResult = await db
      .select({ 
        totalEarned: sum(mentorPayouts.earnedCredits),
        totalFees: sum(mentorPayouts.platformFeeCredits)
      })
      .from(mentorPayouts)
      .where(and(
        eq(mentorPayouts.mentorId, mentor.id),
        eq(mentorPayouts.status, "released") // Only released credits can be withdrawn
      ))

    const availableCredits = Number(availableCreditsResult[0]?.totalEarned || 0)
    const totalFees = Number(availableCreditsResult[0]?.totalFees || 0)

    // Get total requested credits from pending/processing withdrawals
    const pendingCreditsResult = await db
      .select({ total: sum(withdrawalRequests.requestedCredits) })
      .from(withdrawalRequests)
      .where(and(
        eq(withdrawalRequests.mentorId, mentor.id),
        eq(withdrawalRequests.status, "pending")
      ))

    const pendingCredits = Number(pendingCreditsResult[0]?.total || 0)
    const withdrawableCredits = Math.max(0, availableCredits - pendingCredits)

    return NextResponse.json({
      requests,
      summary: {
        availableCredits,
        pendingCredits,
        withdrawableCredits,
        totalFeesPaid: totalFees
      }
    })

  } catch (error) {
    console.error("Error fetching withdrawal requests:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Create new withdrawal request
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is a mentor
    const [mentor] = await db
      .select({ id: mentors.id })
      .from(mentors)
      .where(eq(mentors.userId, session.id))
      .limit(1)

    if (!mentor) {
      return NextResponse.json({ error: "Only mentors can request withdrawals" }, { status: 403 })
    }

    const { 
      requestedCredits, 
      payoutMethod, 
      payoutDetails 
    } = await request.json()

    // Validate input
    if (!requestedCredits || requestedCredits <= 0) {
      return NextResponse.json({ error: "Invalid withdrawal amount" }, { status: 400 })
    }

    if (!payoutMethod || !["bank_transfer", "stripe_connect"].includes(payoutMethod)) {
      return NextResponse.json({ 
        error: "Invalid payout method. Supported: bank_transfer, stripe_connect" 
      }, { status: 400 })
    }

    // Validate payout details based on method
    if (payoutMethod === "bank_transfer") {
      const { accountNumber, routingNumber, accountHolderName } = payoutDetails || {}
      if (!accountNumber || !routingNumber || !accountHolderName) {
        return NextResponse.json({ 
          error: "Bank details required: accountNumber, routingNumber, accountHolderName" 
        }, { status: 400 })
      }
    } else if (payoutMethod === "stripe_connect") {
      const { country } = payoutDetails || {}
      if (!country) {
        return NextResponse.json({ 
          error: "Country required for Stripe Connect" 
        }, { status: 400 })
      }
    }

    // Check available credits
    const availableCreditsResult = await db
      .select({ total: sum(mentorPayouts.earnedCredits) })
      .from(mentorPayouts)
      .where(and(
        eq(mentorPayouts.mentorId, mentor.id),
        eq(mentorPayouts.status, "released")
      ))

    const availableCredits = Number(availableCreditsResult[0]?.total || 0)

    // Check pending withdrawals
    const pendingCreditsResult = await db
      .select({ total: sum(withdrawalRequests.requestedCredits) })
      .from(withdrawalRequests)
      .where(and(
        eq(withdrawalRequests.mentorId, mentor.id),
        eq(withdrawalRequests.status, "pending")
      ))

    const pendingCredits = Number(pendingCreditsResult[0]?.total || 0)
    const withdrawableCredits = availableCredits - pendingCredits

    if (requestedCredits > withdrawableCredits) {
      return NextResponse.json({ 
        error: `Insufficient credits. Available: ${withdrawableCredits} credits` 
      }, { status: 400 })
    }

    // Convert credits to USD (assuming 1 credit = $1 for now)
    const requestedAmountUsd = requestedCredits * 1.0

    // Process withdrawal immediately
    let payoutReference = ""
    let finalStatus = "completed"
    
    try {
      if (payoutMethod === "stripe_connect") {
        // Process Stripe transfer immediately
        const amountCents = Math.round(requestedAmountUsd * 100)
        
        // In production, mentors would have connected Stripe accounts
        // For now, we'll simulate the transfer
        const transfer = await stripe.transfers.create({
          amount: amountCents,
          currency: 'usd',
          destination: payoutDetails.stripeAccountId || 'acct_default', // Mentor's connected account
          description: `Mentoring earnings withdrawal: ${requestedCredits} credits`
        })
        
        payoutReference = transfer.id
        
      } else if (payoutMethod === "bank_transfer") {
        // For bank transfers, integrate with your bank API
        // For demo purposes, we'll mark as processing (requires manual completion)
        payoutReference = `BANK_${Date.now()}_${mentor.id}`
        finalStatus = "processing" // Bank transfers take 1-3 business days
      }
      
    } catch (paymentError) {
      console.error("Payment processing error:", paymentError)
      finalStatus = "failed"
      payoutReference = `FAILED_${Date.now()}`
    }

    // Create withdrawal record with immediate status
    const [withdrawalRequest] = await db
      .insert(withdrawalRequests)
      .values({
        mentorId: mentor.id,
        requestedCredits,
        requestedAmountUsd: requestedAmountUsd.toString(),
        payoutMethod,
        payoutDetails,
        status: finalStatus,
        processedAt: new Date(),
        ...(finalStatus === "completed" ? { completedAt: new Date() } : {}),
        ...(payoutReference ? { payoutReference } : {})
      })
      .returning()

    // Update mentor payouts to mark as withdrawn
    await db
      .update(mentorPayouts)
      .set({ status: "paid_out", paidOutAt: new Date() })
      .where(and(
        eq(mentorPayouts.mentorId, mentor.id),
        eq(mentorPayouts.status, "released")
      ))

    // Notify mentor of processing result
    const { notifications } = await import("@/db/schema")
    await db.insert(notifications).values({
      userId: session.id,
      type: finalStatus === "completed" ? "withdrawal_completed" : 
            finalStatus === "processing" ? "withdrawal_processing" : "withdrawal_failed",
      title: finalStatus === "completed" ? "Withdrawal Completed! 💰" :
             finalStatus === "processing" ? "Withdrawal Processing" : "Withdrawal Failed",
      message: finalStatus === "completed" 
        ? `Your withdrawal of ${requestedCredits} credits ($${requestedAmountUsd}) has been sent to your account.`
        : finalStatus === "processing"
        ? `Your withdrawal of ${requestedCredits} credits ($${requestedAmountUsd}) is being processed. Funds will arrive within 1-3 business days.`
        : `Your withdrawal request failed. Please try again or contact support.`,
      relatedEntityType: "withdrawal",
      relatedEntityId: withdrawalRequest.id,
      createdAt: new Date()
    })

    return NextResponse.json({
      message: finalStatus === "completed" ? "Withdrawal processed successfully" :
               finalStatus === "processing" ? "Withdrawal is being processed" : "Withdrawal failed",
      request: withdrawalRequest,
      status: finalStatus,
      payoutReference
    })

  } catch (error) {
    console.error("Error creating withdrawal request:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}