import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { withdrawalRequests, mentors, users, notifications } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { getSession } from "@/lib/auth/getSession"
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

interface Params {
  id: string
}

// POST - Process withdrawal request (admin only)
export async function POST(
  request: NextRequest,
  context: { params: Promise<Params> }
) {
  try {
    const { id } = await context.params
    const withdrawalId = parseInt(id)

    if (!withdrawalId || isNaN(withdrawalId)) {
      return NextResponse.json({ error: "Invalid withdrawal ID" }, { status: 400 })
    }

    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    if (session.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const { action, adminNotes } = await request.json()

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ 
        error: "Invalid action. Must be 'approve' or 'reject'" 
      }, { status: 400 })
    }

    // Get withdrawal request with mentor details
    const [withdrawal] = await db
      .select({
        id: withdrawalRequests.id,
        mentorId: withdrawalRequests.mentorId,
        requestedCredits: withdrawalRequests.requestedCredits,
        requestedAmountUsd: withdrawalRequests.requestedAmountUsd,
        payoutMethod: withdrawalRequests.payoutMethod,
        payoutDetails: withdrawalRequests.payoutDetails,
        status: withdrawalRequests.status,
        mentorUserId: users.id,
        mentorFirstName: users.firstName,
        mentorLastName: users.lastName
      })
      .from(withdrawalRequests)
      .leftJoin(mentors, eq(withdrawalRequests.mentorId, mentors.id))
      .leftJoin(users, eq(mentors.userId, users.id))
      .where(eq(withdrawalRequests.id, withdrawalId))

    if (!withdrawal) {
      return NextResponse.json({ error: "Withdrawal request not found" }, { status: 404 })
    }

    if (withdrawal.status !== "pending") {
      return NextResponse.json({ 
        error: `Cannot process withdrawal with status: ${withdrawal.status}` 
      }, { status: 400 })
    }

    if (action === "reject") {
      // Simply mark as rejected
      await db.transaction(async (tx) => {
        await tx
          .update(withdrawalRequests)
          .set({
            status: "rejected",
            adminNotes,
            processedBy: session.id,
            processedAt: new Date()
          })
          .where(eq(withdrawalRequests.id, withdrawalId))

        // Notify mentor
        await tx.insert(notifications).values({
          userId: withdrawal.mentorUserId!,
          type: "withdrawal_rejected",
          title: "Withdrawal Request Rejected",
          message: `Your withdrawal request for ${withdrawal.requestedCredits} credits has been rejected. ${adminNotes ? `Reason: ${adminNotes}` : ''}`,
          relatedEntityType: "withdrawal",
          relatedEntityId: withdrawalId,
          createdAt: new Date()
        })
      })

      return NextResponse.json({ message: "Withdrawal request rejected" })
    }

    // For approval, process the payout based on method
    if (action === "approve") {
      let payoutReference = ""
      let processingError = null

      try {
        if (withdrawal.payoutMethod === "stripe_connect") {
          // Process Stripe transfer
          const payoutDetails = withdrawal.payoutDetails as any
          const amountCents = Math.round(parseFloat(withdrawal.requestedAmountUsd) * 100)

          // Create Stripe transfer (simplified - in production you'd need connected accounts)
          const transfer = await stripe.transfers.create({
            amount: amountCents,
            currency: 'usd',
            destination: payoutDetails.stripeAccountId || 'default_account', // This should be mentor's connected account
            description: `Withdrawal for ${withdrawal.requestedCredits} credits`
          })

          payoutReference = transfer.id

        } else if (withdrawal.payoutMethod === "bank_transfer") {
          // For bank transfers, you'd integrate with your bank API
          // For now, we'll just simulate and mark as processing
          payoutReference = `BANK_${Date.now()}_${withdrawalId}`
        }

        // Update withdrawal status to approved/processing
        await db.transaction(async (tx) => {
          await tx
            .update(withdrawalRequests)
            .set({
              status: withdrawal.payoutMethod === "stripe_connect" ? "completed" : "processing",
              adminNotes,
              processedBy: session.id,
              processedAt: new Date(),
              ...(withdrawal.payoutMethod === "stripe_connect" ? { completedAt: new Date() } : {})
            })
            .where(eq(withdrawalRequests.id, withdrawalId))

          // Notify mentor of approval
          await tx.insert(notifications).values({
            userId: withdrawal.mentorUserId!,
            type: "withdrawal_approved",
            title: "Withdrawal Request Approved! 💰",
            message: withdrawal.payoutMethod === "stripe_connect" 
              ? `Your withdrawal of ${withdrawal.requestedCredits} credits ($${withdrawal.requestedAmountUsd}) has been processed and sent to your account.`
              : `Your withdrawal of ${withdrawal.requestedCredits} credits ($${withdrawal.requestedAmountUsd}) has been approved and is being processed. You'll receive the funds within 3-5 business days.`,
            relatedEntityType: "withdrawal",
            relatedEntityId: withdrawalId,
            createdAt: new Date()
          })
        })

        return NextResponse.json({ 
          message: "Withdrawal request approved and processed",
          payoutReference 
        })

      } catch (error) {
        console.error("Error processing payout:", error)
        
        // Mark as failed
        await db
          .update(withdrawalRequests)
          .set({
            status: "failed",
            adminNotes: `Processing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            processedBy: session.id,
            processedAt: new Date()
          })
          .where(eq(withdrawalRequests.id, withdrawalId))

        return NextResponse.json({ 
          error: "Failed to process payout",
          details: error instanceof Error ? error.message : "Unknown error"
        }, { status: 500 })
      }
    }

  } catch (error) {
    console.error("Error processing withdrawal request:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}