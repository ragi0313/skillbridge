import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { bookingSessions, users, learners, mentors, notifications } from "@/db/schema"
import { eq } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { getSession } from "@/lib/auth/getSession"
import { BookingLifecycleService } from "@/lib/sessions/booking-lifecycle"

interface Params {
  id: string
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<Params> }
) {
  try {
    const { id } = await context.params
    const sessionId = parseInt(id)

    if (!sessionId || isNaN(sessionId)) {
      return NextResponse.json({ error: "Invalid session ID" }, { status: 400 })
    }

    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { endType = "completed", noShowType, reason } = await request.json()

    // Validate endType
    const validEndTypes = ["completed", "technical_issues", "learner_no_show", "mentor_no_show", "both_no_show", "no_show"]
    if (!validEndTypes.includes(endType)) {
      return NextResponse.json(
        { error: "Invalid end type. Must be one of: " + validEndTypes.join(", ") },
        { status: 400 }
      )
    }

    // Handle no_show endType with specific noShowType
    let finalEndType = endType
    if (endType === "no_show" && noShowType) {
      finalEndType = noShowType
    }

    // Get session details and verify user access
    const learnerUsers = alias(users, "learner_users")
    const mentorUsers = alias(users, "mentor_users")

    const [bookingSession] = await db
      .select({
        id: bookingSessions.id,
        status: bookingSessions.status,
        learnerId: bookingSessions.learnerId,
        mentorId: bookingSessions.mentorId,
        scheduledDate: bookingSessions.scheduledDate,
        learnerUser: {
          id: learnerUsers.id,
          firstName: learnerUsers.firstName,
          lastName: learnerUsers.lastName,
        },
        mentorUser: {
          id: mentorUsers.id,
          firstName: mentorUsers.firstName,
          lastName: mentorUsers.lastName,
        },
      })
      .from(bookingSessions)
      .leftJoin(learners, eq(bookingSessions.learnerId, learners.id))
      .leftJoin(mentors, eq(bookingSessions.mentorId, mentors.id))
      .leftJoin(learnerUsers, eq(learners.userId, learnerUsers.id))
      .leftJoin(mentorUsers, eq(mentors.userId, mentorUsers.id))
      .where(eq(bookingSessions.id, sessionId))

    if (!bookingSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // Verify user has access to this session (allow system-triggered no-show completion)
    const isLearner = bookingSession.learnerUser?.id === session.id
    const isMentor = bookingSession.mentorUser?.id === session.id
    const isSystemCompletion = finalEndType.includes('no_show') && reason?.includes('Automatic')

    if (!isLearner && !isMentor && !isSystemCompletion) {
      return NextResponse.json({ error: "Unauthorized access to session" }, { status: 403 })
    }

    // Check if session can be completed - allow different statuses based on end type
    const allowedStatuses = isSystemCompletion || finalEndType.includes('no_show') 
      ? ["ongoing", "confirmed", "upcoming"] 
      : ["ongoing", "confirmed"]
      
    if (!allowedStatuses.includes(bookingSession.status || "")) {
      return NextResponse.json(
        { error: `Session cannot be completed with status: ${bookingSession.status}. Allowed statuses for ${finalEndType}: ${allowedStatuses.join(", ")}.` },
        { status: 400 }
      )
    }

    // Use the BookingLifecycleService to end the session
    const lifecycleService = BookingLifecycleService.getInstance()
    const result = await lifecycleService.endVideoSession(sessionId, finalEndType)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to end session" },
        { status: 500 }
      )
    }

    // Create completion notifications for both participants
    const now = new Date()
    const notificationData = []

    if (finalEndType === "completed") {
      // Notify learner
      if (bookingSession.learnerUser?.id) {
        notificationData.push({
          userId: bookingSession.learnerUser.id,
          type: "session_completed",
          title: "Session Completed! 🎉",
          message: `Your mentoring session with ${bookingSession.mentorUser?.firstName} has been completed successfully. Don't forget to leave a review!`,
          relatedEntityType: "session",
          relatedEntityId: sessionId,
          createdAt: now,
        })
      }

      // Notify mentor
      if (bookingSession.mentorUser?.id) {
        notificationData.push({
          userId: bookingSession.mentorUser.id,
          type: "session_completed",
          title: "Session Completed! 💼",
          message: `Your mentoring session with ${bookingSession.learnerUser?.firstName} has been completed successfully. Your earnings are being processed.`,
          relatedEntityType: "session",
          relatedEntityId: sessionId,
          createdAt: now,
        })
      }
    } else if (finalEndType === "technical_issues") {
      // Notify both parties about technical issues and refund
      if (bookingSession.learnerUser?.id) {
        notificationData.push({
          userId: bookingSession.learnerUser.id,
          type: "session_technical_issues",
          title: "Session Ended - Technical Issues",
          message: "Your session ended due to technical issues. A full refund has been processed to your account.",
          relatedEntityType: "session",
          relatedEntityId: sessionId,
          createdAt: now,
        })
      }

      if (bookingSession.mentorUser?.id) {
        notificationData.push({
          userId: bookingSession.mentorUser.id,
          type: "session_technical_issues",
          title: "Session Ended - Technical Issues",
          message: "The session ended due to technical issues. The learner has been refunded.",
          relatedEntityType: "session",
          relatedEntityId: sessionId,
          createdAt: now,
        })
      }
    } else if (finalEndType === "learner_no_show") {
      // Notify learner about no-show
      if (bookingSession.learnerUser?.id) {
        notificationData.push({
          userId: bookingSession.learnerUser.id,
          type: "session_no_show",
          title: "Session No-Show Recorded",
          message: "You did not join your scheduled session within the 15-minute grace period. The mentor has been compensated for their time.",
          relatedEntityType: "session",
          relatedEntityId: sessionId,
          createdAt: now,
        })
      }

      // Notify mentor about compensation
      if (bookingSession.mentorUser?.id) {
        notificationData.push({
          userId: bookingSession.mentorUser.id,
          type: "session_compensation",
          title: "Session No-Show - Compensation Provided",
          message: `${bookingSession.learnerUser?.firstName} did not join the scheduled session. You have been compensated for your time.`,
          relatedEntityType: "session",
          relatedEntityId: sessionId,
          createdAt: now,
        })
      }
    } else if (finalEndType === "mentor_no_show") {
      // Notify mentor about no-show
      if (bookingSession.mentorUser?.id) {
        notificationData.push({
          userId: bookingSession.mentorUser.id,
          type: "session_no_show",
          title: "Session No-Show Recorded",
          message: "You did not join your scheduled session within the 15-minute grace period. The learner has been refunded.",
          relatedEntityType: "session",
          relatedEntityId: sessionId,
          createdAt: now,
        })
      }

      // Notify learner about refund
      if (bookingSession.learnerUser?.id) {
        notificationData.push({
          userId: bookingSession.learnerUser.id,
          type: "session_refund",
          title: "Session No-Show - Refund Processed",
          message: `${bookingSession.mentorUser?.firstName} did not join the scheduled session. A full refund has been processed to your account.`,
          relatedEntityType: "session",
          relatedEntityId: sessionId,
          createdAt: now,
        })
      }
    } else if (finalEndType === "both_no_show") {
      // Notify both parties about mutual no-show
      if (bookingSession.learnerUser?.id) {
        notificationData.push({
          userId: bookingSession.learnerUser.id,
          type: "session_no_show",
          title: "Session No-Show - Both Parties",
          message: "Neither you nor your mentor joined the scheduled session within the 15-minute grace period. Session has been cancelled.",
          relatedEntityType: "session",
          relatedEntityId: sessionId,
          createdAt: now,
        })
      }

      if (bookingSession.mentorUser?.id) {
        notificationData.push({
          userId: bookingSession.mentorUser.id,
          type: "session_no_show",
          title: "Session No-Show - Both Parties",
          message: "Neither you nor your learner joined the scheduled session within the 15-minute grace period. Session has been cancelled.",
          relatedEntityType: "session",
          relatedEntityId: sessionId,
          createdAt: now,
        })
      }
    }

    // Insert notifications
    if (notificationData.length > 0) {
      try {
        await db.insert(notifications).values(notificationData)
      } catch (error) {
        console.error("Failed to create completion notifications:", error)
      }
    }

    // CRITICAL: Broadcast session completion and force disconnect if needed
    try {
      const { broadcastSessionUpdate } = await import("@/app/api/sse/session-updates/route")
      
      // For certain completion types, send force disconnect first
      if (['technical_issues', 'learner_no_show', 'mentor_no_show', 'both_no_show'].includes(finalEndType)) {
        await broadcastSessionUpdate(sessionId, 'force_disconnect', {
          reason: finalEndType,
          message: `Session ended due to ${finalEndType.replace('_', ' ')}. All participants have been disconnected.`,
          timestamp: new Date().toISOString()
        })
      }
      
      await broadcastSessionUpdate(sessionId, 'status_change', {
        previousStatus: bookingSession.status,
        newStatus: finalEndType,
        completedBy: isSystemCompletion ? 'system' : (isLearner ? 'learner' : 'mentor'),
        timestamp: new Date().toISOString()
      })
      
      console.log(`[SESSION_COMPLETE] Broadcasted completion for session ${sessionId} with type: ${finalEndType}`)
    } catch (error) {
      console.error("Failed to broadcast session completion:", error)
    }

    return NextResponse.json({
      message: "Session ended successfully",
      endType: finalEndType,
      reason: reason || null
    })

  } catch (error) {
    console.error("Error ending session:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}