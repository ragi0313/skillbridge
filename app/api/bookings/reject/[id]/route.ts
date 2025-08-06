// app/api/bookings/reject/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db" 
import { bookingSessions, sessions, learners, creditTransactions, notifications, mentors } from "@/db/schema"
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

    // Get the current user session (mentor)
    const session = await getSession()
    if (!session?.id || session.role !== "mentor") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Get mentor ID from the session
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

    // Get rejection reason from request body (optional)
    const body = await request.json().catch(() => ({}))
    const rejectionReason = body.reason || "Session rejected by mentor"

    // Start transaction
    const result = await db.transaction(async (tx) => {
      // Get the booking session with mentor validation
      const [bookingSession] = await tx
        .select({
          id: bookingSessions.id,
          mentorId: bookingSessions.mentorId,
          learnerId: bookingSessions.learnerId,
          totalCostCredits: bookingSessions.totalCostCredits,
          escrowCredits: bookingSessions.escrowCredits,
          status: bookingSessions.status,
        })
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

      // Update booking session status to rejected
      await tx
        .update(bookingSessions)
        .set({ 
          status: "rejected",
          updatedAt: new Date()
        })
        .where(eq(bookingSessions.id, sessionId))

      // Create session record with rejection details
      await tx.insert(sessions).values({
        bookingSessionId: sessionId,
        mentorResponseAt: new Date(),
        mentorResponseMessage: rejectionReason,
        cancelledBy: "mentor",
        cancellationReason: rejectionReason,
        cancelledAt: new Date(),
        createdAt: new Date(),
      })

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

      // Refund credits to learner
      const newBalance = learner.creditsBalance + bookingSession.escrowCredits

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
        amount: bookingSession.escrowCredits,
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
        message: `Your session request has been declined by the mentor. Your ${bookingSession.escrowCredits} credits have been refunded.`,
        relatedEntityType: "session",
        relatedEntityId: sessionId,
        createdAt: new Date(),
      })

      return {
        sessionId,
        refundedCredits: bookingSession.escrowCredits,
        newBalance,
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