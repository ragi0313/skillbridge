import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db" 
import { bookingSessions, learners, creditTransactions, notifications, mentors } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { getSession } from "@/lib/auth/getSession"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = parseInt(params.id)
    
    if (isNaN(sessionId)) {
      return NextResponse.json(
        { error: "Invalid session ID" },
        { status: 400 }
      )
    }

    const session = await getSession()
    if (!session?.id || session.role !== "mentor") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const [mentor] = await db
      .select({ id: mentors.id })
      .from(mentors)
      .where(eq(mentors.userId, session.id))

    if (!mentor) {
      return NextResponse.json(
        { error: "Mentor not found" },
        { status: 404 }
      )
    }

    // Get rejection reason from request body
    const body = await request.json().catch(() => ({}))
    const rejectionReason = body.reason || "Session rejected by mentor"

    const result = await db.transaction(async (tx) => {
      // Get the booking session with mentor validation
      const [bookingSession] = await tx
        .select()
        .from(bookingSessions)
        .where(
          and(
            eq(bookingSessions.id, sessionId),
            eq(bookingSessions.mentorId, mentor.id)
          )
        )

      if (!bookingSession) {
        throw new Error("Session not found or unauthorized")
      }

      if (bookingSession.status !== "pending") {
        throw new Error("Session is not in pending status")
      }

      // Get learner's current credit balance
      const [learner] = await tx
        .select({ 
          creditsBalance: learners.creditsBalance 
        })
        .from(learners)
        .where(eq(learners.id, bookingSession.learnerId))

      if (!learner) {
        throw new Error("Learner not found")
      }

      // Calculate refund (full refund for rejection)
      const refundAmount = bookingSession.escrowCredits
      const newBalance = learner.creditsBalance + refundAmount

      // Update booking session status to rejected
      await tx
        .update(bookingSessions)
        .set({ 
          status: "rejected",
          mentorResponseAt: new Date(),
          mentorResponseMessage: rejectionReason,
          rejectionReason: rejectionReason,
          refundAmount: refundAmount,
          updatedAt: new Date()
        })
        .where(eq(bookingSessions.id, sessionId))

      // Refund credits to learner
      await tx
        .update(learners)
        .set({ 
          creditsBalance: newBalance,
          updatedAt: new Date()
        })
        .where(eq(learners.id, bookingSession.learnerId))

      // Record credit transaction for the refund
      await tx.insert(creditTransactions).values({
        userId: bookingSession.learnerId,
        type: "session_refund",
        direction: "credit",
        amount: refundAmount,
        balanceBefore: learner.creditsBalance,
        balanceAfter: newBalance,
        relatedSessionId: sessionId,
        description: `Refund for rejected session #${sessionId}`,
        metadata: { rejectionReason },
        createdAt: new Date(),
      })

      // Create notification for learner
      await tx.insert(notifications).values({
        userId: bookingSession.learnerId,
        type: "session_rejected",
        title: "Session Request Declined",
        message: `Your session request has been declined. Reason: ${rejectionReason}. Your ${refundAmount} credits have been refunded.`,
        relatedEntityType: "session",
        relatedEntityId: sessionId,
        createdAt: new Date(),
      })

      return {
        sessionId,
        refundedCredits: refundAmount,
        newBalance,
        rejectionReason
      }
    })

    return NextResponse.json({
      success: true,
      message: "Session rejected successfully. Credits have been refunded to the learner.",
      data: result,
    })

  } catch (error: any) {
    console.error("Error rejecting session:", error)
    return NextResponse.json(
      { error: error.message || "Failed to reject session" },
      { status: 500 }
    )
  }
}