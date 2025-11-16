import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth/getSession"
import { db } from "@/db"
import { bookingSessions, learners, mentors, notifications, creditTransactions, mentorPayouts } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const sessionId = parseInt(id)
    if (isNaN(sessionId)) {
      return NextResponse.json({ error: "Invalid session ID" }, { status: 400 })
    }

    const body = await request.json()
    const { newStatus, reason } = body

    if (!newStatus || !reason || reason.trim().length === 0) {
      return NextResponse.json(
        { error: "New status and reason are required" },
        { status: 400 }
      )
    }

    // Valid statuses that admin can set
    const validStatuses = [
      "pending",
      "confirmed",
      "cancelled",
      "completed",
      "both_no_show",
      "learner_no_show",
      "mentor_no_show",
      "rejected"
    ]

    if (!validStatuses.includes(newStatus)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }

    const result = await db.transaction(async (tx) => {
      // Get booking session details
      const [booking] = await tx
        .select({
          id: bookingSessions.id,
          mentorId: bookingSessions.mentorId,
          learnerId: bookingSessions.learnerId,
          status: bookingSessions.status,
          totalCostCredits: bookingSessions.totalCostCredits,
          escrowCredits: bookingSessions.escrowCredits,
          learnerUserId: learners.userId,
          mentorUserId: mentors.userId,
          learnerCreditsBalance: learners.creditsBalance,
          mentorCreditsBalance: mentors.creditsBalance,
        })
        .from(bookingSessions)
        .innerJoin(learners, eq(bookingSessions.learnerId, learners.id))
        .innerJoin(mentors, eq(bookingSessions.mentorId, mentors.id))
        .where(eq(bookingSessions.id, sessionId))

      if (!booking) {
        throw new Error("Booking session not found")
      }

      const oldStatus = booking.status
      if (oldStatus === newStatus) {
        throw new Error("Session already has this status")
      }

      const now = new Date()

      // Platform fee configuration (must match SessionCompletionService)
      const MENTOR_FEE_PERCENTAGE = 0.8 // 80% to mentor, 20% platform fee

      // Determine credit handling based on status change
      let refundToLearner = 0
      let paymentToMentor = 0
      let platformFeeCredits = 0
      let notificationTitle = ""
      let learnerMessage = ""
      let mentorMessage = ""

      // Status-specific logic (matching SessionCompletionService and SessionMonitorService)
      if (newStatus === "cancelled") {
        // Full refund to learner for admin cancellation
        refundToLearner = booking.escrowCredits
        notificationTitle = "Session Cancelled by Admin"
        learnerMessage = `Your session has been cancelled by an administrator. ${refundToLearner} credits have been refunded. Reason: ${reason}`
        mentorMessage = `A session has been cancelled by an administrator. Reason: ${reason}`
      } else if (newStatus === "completed") {
        // Pay mentor 80%, platform keeps 20% (matching SessionCompletionService)
        paymentToMentor = Math.floor(booking.totalCostCredits * MENTOR_FEE_PERCENTAGE)
        platformFeeCredits = booking.totalCostCredits - paymentToMentor
        notificationTitle = "Session Marked as Completed"
        learnerMessage = `Your session has been marked as completed by an administrator. ${booking.totalCostCredits} credits were processed (${paymentToMentor} to mentor, ${platformFeeCredits} platform fee). Reason: ${reason}`
        mentorMessage = `A session has been marked as completed by an administrator. You have received ${paymentToMentor} credits. Reason: ${reason}`
      } else if (newStatus === "both_no_show") {
        // Full refund to learner (both didn't show)
        refundToLearner = booking.escrowCredits
        notificationTitle = "Session Status Changed: No Show"
        learnerMessage = `Your session status has been changed to "Both No Show" by an administrator. ${refundToLearner} credits have been refunded. Reason: ${reason}`
        mentorMessage = `A session status has been changed to "Both No Show" by an administrator. Reason: ${reason}`
      } else if (newStatus === "learner_no_show") {
        // Pay mentor 100% as compensation (no platform fee for no-shows)
        paymentToMentor = booking.totalCostCredits
        platformFeeCredits = 0
        notificationTitle = "Session Status Changed: Learner No Show"
        learnerMessage = `Your session status has been changed to "Learner No Show" by an administrator. No refund applicable. Reason: ${reason}`
        mentorMessage = `A session status has been changed to "Learner No Show" by an administrator. You have received ${paymentToMentor} credits as compensation. Reason: ${reason}`
      } else if (newStatus === "mentor_no_show") {
        // Full refund to learner (mentor didn't show)
        refundToLearner = booking.escrowCredits
        notificationTitle = "Session Status Changed: Mentor No Show"
        learnerMessage = `Your session status has been changed to "Mentor No Show" by an administrator. ${refundToLearner} credits have been refunded. Reason: ${reason}`
        mentorMessage = `A session status has been changed to "Mentor No Show" by an administrator. Reason: ${reason}`
      } else if (newStatus === "rejected") {
        // Full refund to learner
        refundToLearner = booking.escrowCredits
        notificationTitle = "Session Rejected by Admin"
        learnerMessage = `Your session has been rejected by an administrator. ${refundToLearner} credits have been refunded. Reason: ${reason}`
        mentorMessage = `A session has been rejected by an administrator. Reason: ${reason}`
      } else if (newStatus === "pending" || newStatus === "confirmed") {
        // No credit changes for these statuses
        notificationTitle = `Session Status Changed to ${newStatus}`
        learnerMessage = `Your session status has been changed to "${newStatus}" by an administrator. Reason: ${reason}`
        mentorMessage = `A session status has been changed to "${newStatus}" by an administrator. Reason: ${reason}`
      }

      // Update session status
      await tx
        .update(bookingSessions)
        .set({
          status: newStatus,
          updatedAt: now,
        })
        .where(eq(bookingSessions.id, sessionId))

      // Process refund to learner if applicable
      if (refundToLearner > 0) {
        const newLearnerBalance = booking.learnerCreditsBalance + refundToLearner
        await tx
          .update(learners)
          .set({
            creditsBalance: newLearnerBalance,
            updatedAt: now,
          })
          .where(eq(learners.id, booking.learnerId))

        // Record refund transaction
        await tx.insert(creditTransactions).values({
          userId: booking.learnerUserId,
          type: "admin_refund",
          direction: "credit",
          amount: refundToLearner,
          balanceBefore: booking.learnerCreditsBalance,
          balanceAfter: newLearnerBalance,
          relatedSessionId: sessionId,
          description: `Admin refund - Status changed to ${newStatus}: ${reason.trim()}`,
          createdAt: now,
        })
      }

      // Process payment to mentor if applicable
      if (paymentToMentor > 0) {
        const newMentorBalance = booking.mentorCreditsBalance + paymentToMentor
        await tx
          .update(mentors)
          .set({
            creditsBalance: newMentorBalance,
            updatedAt: now,
          })
          .where(eq(mentors.id, booking.mentorId))

        // Record mentor payout (matching SessionCompletionService)
        await tx.insert(mentorPayouts).values({
          mentorId: booking.mentorId,
          sessionId: sessionId,
          earnedCredits: paymentToMentor,
          platformFeeCredits: platformFeeCredits,
          feePercentage: platformFeeCredits > 0 ? 20 : 0,
          status: "released",
          releasedAt: now,
        })

        // Record payment transaction
        await tx.insert(creditTransactions).values({
          userId: booking.mentorUserId,
          type: "session_payment",
          direction: "credit",
          amount: paymentToMentor,
          balanceBefore: booking.mentorCreditsBalance,
          balanceAfter: newMentorBalance,
          relatedSessionId: sessionId,
          description: `Admin payment - Status changed to ${newStatus}: ${reason.trim()}`,
          metadata: {
            platformFeeCredits,
            originalAmount: booking.totalCostCredits,
            adminReason: reason.trim()
          },
          createdAt: now,
        })

        // Record platform fee if applicable (matching SessionCompletionService)
        if (platformFeeCredits > 0) {
          await tx.insert(creditTransactions).values({
            userId: 1, // Platform/admin user ID
            type: "platform_fee_collected",
            direction: "debit",
            amount: platformFeeCredits,
            balanceBefore: 0,
            balanceAfter: 0,
            relatedSessionId: sessionId,
            description: `Platform fee collected from admin status change to ${newStatus}`,
            metadata: {
              platformFeePhp: platformFeeCredits * 11.2, // 1 credit = ₱11.2
              mentorEarnings: paymentToMentor,
              originalAmount: booking.totalCostCredits,
              feePercentage: 20,
              adminReason: reason.trim()
            },
            createdAt: now,
          })
        }
      }

      // Send notifications to both parties
      await tx.insert(notifications).values({
        userId: booking.learnerUserId,
        type: "session_status_changed",
        title: notificationTitle,
        message: learnerMessage,
        relatedEntityType: "session",
        relatedEntityId: sessionId,
        createdAt: now,
      })

      await tx.insert(notifications).values({
        userId: booking.mentorUserId,
        type: "session_status_changed",
        title: notificationTitle,
        message: mentorMessage,
        relatedEntityType: "session",
        relatedEntityId: sessionId,
        createdAt: now,
      })

      return {
        success: true,
        message: "Session status updated successfully",
        oldStatus,
        newStatus,
        refundToLearner,
        paymentToMentor,
      }
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Error changing session status:", error)
    return NextResponse.json(
      { error: error.message || "Failed to change session status" },
      { status: 500 }
    )
  }
}
