import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth/getSession"
import { db } from "@/db"
import { bookingSessions, mentors, learners, creditTransactions } from "@/db/schema"
import { eq } from "drizzle-orm"
import { notificationService } from "@/lib/notifications/notification-service"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const sessionId = Number.parseInt(id)
    if (!sessionId || isNaN(sessionId)) {
      return NextResponse.json({ error: "Invalid session ID" }, { status: 400 })
    }

    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const reason = body.reason || body.cancellationReason

    if (!reason || reason.trim().length === 0) {
      return NextResponse.json({ error: "Cancellation reason is required" }, { status: 400 })
    }

    const result = await db.transaction(async (tx) => {
      // Get booking session details with learner and mentor info
      const [booking] = await tx
        .select({
          id: bookingSessions.id,
          mentorId: bookingSessions.mentorId,
          learnerId: bookingSessions.learnerId,
          status: bookingSessions.status,
          totalCostCredits: bookingSessions.totalCostCredits,
          escrowCredits: bookingSessions.escrowCredits,
          scheduledDate: bookingSessions.scheduledDate,
          learnerUserId: learners.userId,
          mentorUserId: mentors.userId,
          learnerCreditsBalance: learners.creditsBalance,
        })
        .from(bookingSessions)
        .innerJoin(learners, eq(bookingSessions.learnerId, learners.id))
        .innerJoin(mentors, eq(bookingSessions.mentorId, mentors.id))
        .where(eq(bookingSessions.id, sessionId))

      if (!booking) {
        throw new Error("Booking session not found")
      }

      // Check if booking can be cancelled
      if (!booking.status || !["pending", "confirmed"].includes(booking.status)) {
        throw new Error(`Cannot cancel booking with status: ${booking.status}`);
      }

      // Verify user has permission to cancel
      let userCanCancel = false
      let cancelledBy = "system"

      if (session.role === "learner") {
        if (booking.learnerUserId === session.id) {
          userCanCancel = true
          cancelledBy = "learner"
        }
      } else if (session.role === "mentor") {
        if (booking.mentorUserId === session.id) {
          userCanCancel = true
          cancelledBy = "mentor"
        }
      }

      if (!userCanCancel) {
        throw new Error("You are not authorized to cancel this booking")
      }

      const now = new Date()
      const sessionDate = new Date(booking.scheduledDate)
      const hoursUntilSession = (sessionDate.getTime() - now.getTime()) / (1000 * 60 * 60)

      // Calculate refund based on cancellation policy
      let refundAmount = 0
      let refundType = "none"

      if (cancelledBy === "mentor") {
        // Mentor cancellations always get full refund regardless of timing
        refundAmount = booking.escrowCredits
        refundType = "full"
      } else {
        // Learner cancellations follow the timing-based policy
        if (hoursUntilSession >= 24) {
          refundAmount = booking.escrowCredits // Full refund
          refundType = "full"
        } else if (hoursUntilSession >= 2) {
          refundAmount = Math.floor(booking.escrowCredits * 0.5) // 50% refund
          refundType = "partial"
        } else if (hoursUntilSession >= 1) {
          // Between 1-2 hours: 25% refund
          refundAmount = Math.floor(booking.escrowCredits * 0.25)
          refundType = "minimal"
        } else {
          // Less than 1 hour: No refund
          refundAmount = 0
          refundType = "none"
        }
      }

      // Update booking status to cancelled
      await tx
        .update(bookingSessions)
        .set({
          status: "cancelled",
          cancelledAt: now,
          cancelledBy: cancelledBy,
          cancellationReason: reason.trim(),
          refundAmount: refundAmount,
          updatedAt: now,
        })
        .where(eq(bookingSessions.id, sessionId))

      // Process refund if applicable
      if (refundAmount > 0) {
        const newBalance = booking.learnerCreditsBalance + refundAmount
        await tx
          .update(learners)
          .set({
            creditsBalance: newBalance,
            updatedAt: now,
          })
          .where(eq(learners.id, booking.learnerId))

        // Record refund transaction
        await tx.insert(creditTransactions).values({
          userId: booking.learnerUserId,
          type: "session_refund",
          direction: "credit",
          amount: refundAmount,
          balanceBefore: booking.learnerCreditsBalance,
          balanceAfter: newBalance,
          relatedSessionId: sessionId,
          description: `${refundType} refund for cancelled session: ${reason.trim()}`,
          createdAt: now,
        })
      }

      // Store data for notifications (send after transaction completes)
      return {
        success: true,
        message: "Booking cancelled successfully",
        refundAmount,
        refundType,
        cancelledBy,
        learnerUserId: booking.learnerUserId,
        mentorUserId: booking.mentorUserId,
        reason: reason.trim(),
      }

    })

    // Send notifications after transaction completes (outside transaction for better performance)
    try {
      const notificationType = result.refundType === 'none' && cancelledBy === 'learner'
        ? 'session_cancelled_late'
        : 'session_cancelled'

      // Send notification to learner
      if (cancelledBy !== "learner") {
        await notificationService.createSessionStatusNotification(
          result.learnerUserId,
          sessionId,
          notificationType,
          {
            isLearner: true,
            refundAmount: result.refundAmount,
            cancelledBy: result.cancelledBy,
            cancellationReason: result.reason,
          }
        )
      }

      // Send notification to mentor
      if (cancelledBy !== "mentor") {
        await notificationService.createSessionStatusNotification(
          result.mentorUserId,
          sessionId,
          notificationType,
          {
            isLearner: false,
            refundAmount: result.refundAmount,
            cancelledBy: result.cancelledBy,
            cancellationReason: result.reason,
          }
        )
      }
    } catch (notificationError) {
      console.error("Failed to send cancellation notifications:", notificationError)
      // Don't fail the cancellation if notifications fail
    }

    // Broadcast the cancellation update to connected clients
    try {
      const { broadcastSessionUpdate } = await import("@/app/api/sse/session-updates/route")
      await broadcastSessionUpdate(sessionId, "cancellation", {
        sessionId,
        status: "cancelled",
        cancelledBy: result.cancelledBy,
        refundAmount: result.refundAmount,
        refundType: result.refundType,
        reason: result.reason
      })
    } catch (broadcastError) {
      console.error("Failed to broadcast cancellation update:", broadcastError)
      // Don't throw - broadcasting failure shouldn't fail the cancellation
    }

    return NextResponse.json({
      success: result.success,
      message: result.message,
      refundAmount: result.refundAmount,
      refundType: result.refundType,
      cancelledBy: result.cancelledBy,
    })
  } catch (error: any) {
    console.error("Error cancelling booking:", error)
    return NextResponse.json({ error: error.message || "Failed to cancel booking" }, { status: 500 })
  }
}
