import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { users, mentors, learners, withdrawalRequests, creditTransactions, notifications } from "@/db/schema"
import { eq, and, sql } from "drizzle-orm"
import { getSession } from "@/lib/auth/getSession"
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil', 
})

// Credit to USD conversion rate (5 credits = $1 USD)
const CREDITS_TO_USD_RATE = 0.2

// POST - Process a withdrawal request (Admin or System only)
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const withdrawalId = parseInt(params.id)
    if (!withdrawalId) {
      return NextResponse.json({ error: "Invalid withdrawal ID" }, { status: 400 })
    }

    // Check if user is admin
    const [user] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, session.id))
      .limit(1)

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    // FIXED: Get withdrawal request with correct field
    const [withdrawalRequest] = await db
      .select()
      .from(withdrawalRequests)
      .where(eq(withdrawalRequests.id, withdrawalId))
      .limit(1)

    if (!withdrawalRequest) {
      return NextResponse.json({ error: "Withdrawal request not found" }, { status: 404 })
    }

    if (withdrawalRequest.status !== 'pending') {
      return NextResponse.json({ 
        error: `Cannot process withdrawal with status: ${withdrawalRequest.status}` 
      }, { status: 400 })
    }

    const { action, adminNotes } = await request.json()

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ 
        error: "Action must be 'approve' or 'reject'" 
      }, { status: 400 })
    }

    if (action === 'reject') {
      // Reject withdrawal request
      await db.transaction(async (tx) => {
        // Update withdrawal request
        await tx
          .update(withdrawalRequests)
          .set({
            status: 'rejected',
            adminNotes,
            processedBy: session.id,
            processedAt: new Date()
          })
          .where(eq(withdrawalRequests.id, withdrawalId))

        // Create notification - FIXED: Use userId instead of mentorId
        await tx.insert(notifications).values({
          userId: withdrawalRequest.userId, // FIXED: Changed from mentorId
          type: "withdrawal_rejected",
          title: "Withdrawal Request Rejected",
          message: adminNotes || "Your withdrawal request has been rejected. Please contact support for more information.",
          relatedEntityType: "withdrawal",
          relatedEntityId: withdrawalId,
          createdAt: new Date()
        })
      })

      return NextResponse.json({
        message: "Withdrawal request rejected"
      })
    }

    // Approve and process withdrawal
    try {
      // Get payout details from request
      const payoutDetails = withdrawalRequest.payoutDetails as any
      const stripeAccountId = payoutDetails?.stripeAccountId || withdrawalRequest.stripeAccountId
      const netAmount = parseFloat(withdrawalRequest.netAmount?.toString() || '0') || 
                      (parseFloat(withdrawalRequest.requestedAmountUsd.toString()) * 0.985) // Fallback calculation

      if (!stripeAccountId) {
        return NextResponse.json({ 
          error: "No Stripe account ID found for this withdrawal request" 
        }, { status: 400 })
      }

      // Verify Stripe account is still valid and enabled
      const account = await stripe.accounts.retrieve(stripeAccountId)
      if (!account.charges_enabled || !account.payouts_enabled) {
        return NextResponse.json({ 
          error: "Stripe account is not enabled for payouts" 
        }, { status: 400 })
      }

      // Create transfer to connected account
      const transfer = await stripe.transfers.create({
        amount: Math.round(netAmount * 100), // Convert to cents
        currency: 'usd',
        destination: stripeAccountId,
        description: `SkillBridge withdrawal - ${withdrawalRequest.requestedCredits} credits`,
        metadata: {
          withdrawal_request_id: withdrawalId.toString(),
          user_credits: withdrawalRequest.requestedCredits.toString(),
          platform: 'skillbridge'
        }
      })

      // Get user info to determine if mentor or learner
      const [withdrawalUser] = await db
        .select({
          id: users.id,
          role: users.role
        })
        .from(users)
        .where(eq(users.id, withdrawalRequest.userId))
        .limit(1)

      if (!withdrawalUser) {
        throw new Error("Withdrawal user not found")
      }

      // Update withdrawal request and user balance
      await db.transaction(async (tx) => {
        // Update withdrawal request
        await tx
          .update(withdrawalRequests)
          .set({
            status: 'completed',
            adminNotes,
            processedBy: session.id,
            processedAt: new Date(),
            completedAt: new Date(),
            stripeTransferId: transfer.id
          })
          .where(eq(withdrawalRequests.id, withdrawalId))

        // Deduct credits from appropriate user balance
        if (withdrawalUser.role === 'mentor') {
          await tx
            .update(mentors)
            .set({
              creditsBalance: sql`${mentors.creditsBalance} - ${withdrawalRequest.requestedCredits}`,
              updatedAt: new Date()
            })
            .where(eq(mentors.userId, withdrawalRequest.userId))
        } else if (withdrawalUser.role === 'learner') {
          await tx
            .update(learners)
            .set({
              creditsBalance: sql`${learners.creditsBalance} - ${withdrawalRequest.requestedCredits}`,
              updatedAt: new Date()
            })
            .where(eq(learners.userId, withdrawalRequest.userId))
        }

        // Create credit transaction record
        await tx
          .insert(creditTransactions)
          .values({
            userId: withdrawalRequest.userId,
            type: 'withdrawal_completed',
            direction: 'debit',
            amount: withdrawalRequest.requestedCredits,
            balanceBefore: 0, // Would need to fetch current balance
            balanceAfter: 0, // Would need to calculate
            description: `Withdrawal completed - Transfer ID: ${transfer.id}`,
            metadata: {
              withdrawalRequestId: withdrawalId,
              stripeTransferId: transfer.id,
              netAmountUsd: netAmount
            },
            createdAt: new Date()
          })

        // Create notification
        await tx.insert(notifications).values({
          userId: withdrawalRequest.userId, // FIXED: Use userId
          type: "withdrawal_completed",
          title: "Withdrawal Completed",
          message: `Your withdrawal of ${withdrawalRequest.requestedCredits} credits ($${withdrawalRequest.requestedAmountUsd}) has been processed and transferred to your account.`,
          relatedEntityType: "withdrawal",
          relatedEntityId: withdrawalId,
          createdAt: new Date()
        })
      })

      return NextResponse.json({
        message: "Withdrawal processed successfully",
        transferId: transfer.id,
        netAmount: netAmount.toFixed(2)
      })

    } catch (stripeError: any) {
      console.error("Stripe transfer error:", stripeError)
      
      // Update withdrawal request to failed status
      await db
        .update(withdrawalRequests)
        .set({
          status: 'failed',
          adminNotes: `Transfer failed: ${stripeError.message}`,
          processedBy: session.id,
          processedAt: new Date()
        })
        .where(eq(withdrawalRequests.id, withdrawalId))

      return NextResponse.json({ 
        error: "Failed to process transfer to Stripe account" 
      }, { status: 500 })
    }

  } catch (error) {
    console.error("Error processing withdrawal:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}