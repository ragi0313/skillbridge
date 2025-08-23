import { type NextRequest, NextResponse } from "next/server"
import { withRateLimit } from "@/lib/middleware/rate-limit"
import { db } from "@/db"
import { bookingSessions, users, learners, mentors, notifications } from "@/db/schema"
import { eq } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { getSession } from "@/lib/auth/getSession"
import { agoraService } from "@/lib/agora/AgoraService"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const sessionId = id

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
    }

    // Create aliases for the users table since we need to join it twice
    const learnerUsers = alias(users, "learner_users")
    const mentorUsers = alias(users, "mentor_users")

    // Get booking session details with user information
    const bookingData = await db
      .select({
        id: bookingSessions.id,
        learnerId: bookingSessions.learnerId,
        mentorId: bookingSessions.mentorId,
        status: bookingSessions.status,
        scheduledDate: bookingSessions.scheduledDate,
        durationMinutes: bookingSessions.durationMinutes,
        agoraChannelName: bookingSessions.agoraChannelName,
        agoraCallStartedAt: bookingSessions.agoraCallStartedAt,
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
      .where(eq(bookingSessions.id, Number.parseInt(sessionId)))
      .limit(1)

    if (!bookingData.length) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    const booking = bookingData[0]

    // Verify user has access to this session
    let userRole: "mentor" | "learner" | null = null
    let userName = ""

    if (session.role === "mentor") {
      const [mentor] = await db
        .select({ id: mentors.id })
        .from(mentors)
        .where(eq(mentors.userId, session.id))
        .limit(1)

      if (mentor && mentor.id === booking.mentorId) {
        userRole = "mentor"
        userName = `${booking.mentorUser?.firstName} ${booking.mentorUser?.lastName}`
      }
    } else if (session.role === "learner") {
      const [learner] = await db
        .select({ id: learners.id })
        .from(learners)
        .where(eq(learners.userId, session.id))
        .limit(1)

      if (learner && learner.id === booking.learnerId) {
        userRole = "learner"
        userName = `${booking.learnerUser?.firstName} ${booking.learnerUser?.lastName}`
      }
    }

    if (!userRole) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Debug logging for troubleshooting
    console.log(`[DEBUG] Session ${sessionId} join attempt:`, {
      sessionStatus: booking.status,
      userRole,
      userId: session.id,
      scheduledDate: booking.scheduledDate,
      currentTime: new Date().toISOString()
    })

    // Check if session is joinable (confirmed or upcoming)
    if (!["confirmed", "upcoming"].includes(booking.status)) {
      console.log(`[ERROR] Invalid session status: ${booking.status}`)
      return NextResponse.json(
        {
          error: `Session is ${booking.status}. Only confirmed or upcoming sessions can be joined.`,
        },
        { status: 400 },
      )
    }

    // Check if it's time to join (allow joining 30 minutes before scheduled time to match waiting room logic)
    const scheduledDateTime = new Date(booking.scheduledDate)
    const now = new Date()
    const joinStartTime = new Date(scheduledDateTime.getTime() - 30 * 60 * 1000) // 30 minutes before
    const sessionEndTime = new Date(scheduledDateTime.getTime() + (booking.durationMinutes || 60) * 60 * 1000)
    const noShowGraceTime = new Date(sessionEndTime.getTime() + 5 * 60 * 1000) // 5 minutes after session ends for no-show detection

    if (now < joinStartTime) {
      const minutesUntilJoin = Math.ceil((joinStartTime.getTime() - now.getTime()) / (1000 * 60))
      console.log(`[ERROR] Too early to join: ${minutesUntilJoin} minutes remaining`)
      return NextResponse.json(
        {
          error: `Session join window opens 30 minutes before scheduled time. You can join in ${minutesUntilJoin} minutes.`,
          canJoinAt: joinStartTime.toISOString(),
          waitingMinutes: minutesUntilJoin,
          sessionDetails: {
            scheduledDate: booking.scheduledDate,
            durationMinutes: booking.durationMinutes,
            status: booking.status,
            agoraCallStartedAt: booking.agoraCallStartedAt,
          },
          userRole,
          userName: `${userRole === 'learner' ? booking.learnerUser?.firstName : booking.mentorUser?.firstName} ${userRole === 'learner' ? booking.learnerUser?.lastName : booking.mentorUser?.lastName}`,
          canJoin: false
        },
        { status: 400 },
      )
    }

    if (now > noShowGraceTime) {
      console.log(`[ERROR] Session has ended`)
      return NextResponse.json(
        {
          error: "Session has ended and is no longer available.",
        },
        { status: 400 },
      )
    }

    // Create or get Agora channel
    let channel = booking.agoraChannelName
    if (!channel) {
      const room = await agoraService.createRoom(sessionId)
      channel = room.channel

      // Update booking session with channel name
      await db.update(bookingSessions).set({ agoraChannelName: channel }).where(eq(bookingSessions.id, booking.id))
    }

    return NextResponse.json({
      success: true,
      sessionDetails: {
        scheduledDate: booking.scheduledDate,
        durationMinutes: booking.durationMinutes,
        status: booking.status,
        agoraCallStartedAt: booking.agoraCallStartedAt,
      },
      userRole,
      userName,
      channel,
      canJoin: true,
    })
  } catch (error) {
    console.error("Error validating session access:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function handleSessionJoin(request: NextRequest, context?: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Extract session ID from URL if context is not provided (due to middleware)
    let sessionId: number
    if (context?.params) {
      const { id } = await context.params
      sessionId = parseInt(id)
    } else {
      sessionId = parseInt(request.url.split('/').slice(-2)[0]) // Extract from URL path
    }

    if (!sessionId || isNaN(sessionId)) {
      return NextResponse.json({ error: "Invalid session ID" }, { status: 400 })
    }

    // Create aliases for the users table since we need to join it twice
    const learnerUsers = alias(users, "learner_users")
    const mentorUsers = alias(users, "mentor_users")

    // Get session details with participant info
    const [bookingSession] = await db
      .select({
        id: bookingSessions.id,
        learnerId: bookingSessions.learnerId,
        mentorId: bookingSessions.mentorId,
        status: bookingSessions.status,
        scheduledDate: bookingSessions.scheduledDate,
        learnerJoinedAt: bookingSessions.learnerJoinedAt,
        mentorJoinedAt: bookingSessions.mentorJoinedAt,
        learnerUser: {
          id: learnerUsers.id,
          firstName: learnerUsers.firstName,
          lastName: learnerUsers.lastName,
        },
        mentorUser: {
          id: mentorUsers.id,
          firstName: mentorUsers.firstName,
          lastName: mentorUsers.lastName,
        }
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

    // Check if user has access to this session
    const isLearner = bookingSession.learnerUser?.id === session.id
    const isMentor = bookingSession.mentorUser?.id === session.id
    
    if (!isLearner && !isMentor) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Check session status - allow confirmed, upcoming, and ongoing
    if (!["confirmed", "upcoming", "ongoing"].includes(bookingSession.status)) {
      return NextResponse.json({ 
        error: `Cannot join session with status: ${bookingSession.status}` 
      }, { status: 400 })
    }

    const now = new Date()
    const scheduledDateTime = new Date(bookingSession.scheduledDate)
    const sessionEndTime = new Date(scheduledDateTime.getTime() + 60 * 60 * 1000) // 1 hour default
    const graceEndTime = new Date(sessionEndTime.getTime() + 5 * 60 * 1000) // 5 minutes after session end
    
    let updateData: any = {}
    let notificationData: any[] = []
    let isReconnect = false

    if (isLearner) {
      isReconnect = !!bookingSession.learnerJoinedAt
      updateData.learnerJoinedAt = now
      updateData.learnerLeftAt = null
      
      // If this is the first join and mentor already joined, or if we're reconnecting and mentor is still there
      // Mark session as ongoing (works for both confirmed and upcoming status)
      if (["confirmed", "upcoming"].includes(bookingSession.status)) {
        if (bookingSession.mentorJoinedAt) {
          // Both parties are now in the session
          updateData.status = "ongoing"
          updateData.agoraCallStartedAt = isReconnect ? bookingSession.agoraCallStartedAt || now : now
        } else if (!isReconnect) {
          // Learner joined first, wait for mentor
          console.log(`Learner joined session ${sessionId}, waiting for mentor`)
        }
      }

      // Notify mentor of learner joining/reconnecting
      if (bookingSession.mentorUser?.id) {
        notificationData.push({
          userId: bookingSession.mentorUser.id,
          type: "session_joined",
          title: isReconnect ? "Learner Reconnected" : "Learner Joined Session",
          message: `${bookingSession.learnerUser?.firstName} has ${isReconnect ? 'reconnected to' : 'joined'} the video call.`,
          relatedEntityType: "session",
          relatedEntityId: sessionId,
          createdAt: now,
        })
      }
    } else if (isMentor) {
      isReconnect = !!bookingSession.mentorJoinedAt
      updateData.mentorJoinedAt = now
      updateData.mentorLeftAt = null
      
      // If this is the first join and learner already joined, or if we're reconnecting and learner is still there
      // Mark session as ongoing (works for both confirmed and upcoming status)
      if (["confirmed", "upcoming"].includes(bookingSession.status)) {
        if (bookingSession.learnerJoinedAt) {
          // Both parties are now in the session
          updateData.status = "ongoing"
          updateData.agoraCallStartedAt = isReconnect ? bookingSession.agoraCallStartedAt || now : now
        } else if (!isReconnect) {
          // Mentor joined first, wait for learner
          console.log(`Mentor joined session ${sessionId}, waiting for learner`)
        }
      }

      // Notify learner of mentor joining/reconnecting
      if (bookingSession.learnerUser?.id) {
        notificationData.push({
          userId: bookingSession.learnerUser.id,
          type: "session_joined",
          title: isReconnect ? "Mentor Reconnected" : "Mentor Joined Session",
          message: `${bookingSession.mentorUser?.firstName} has ${isReconnect ? 'reconnected to' : 'joined'} the video call.`,
          relatedEntityType: "session",
          relatedEntityId: sessionId,
          createdAt: now,
        })
      }
    }

    // Update session with join information
    await db.transaction(async (tx) => {
      await tx
        .update(bookingSessions)
        .set(updateData)
        .where(eq(bookingSessions.id, sessionId))

      // Insert notifications
      if (notificationData.length > 0) {
        await tx.insert(notifications).values(notificationData)
      }
    })

    // Determine user role for broadcast
    const userRole = isLearner ? "learner" : "mentor"
    
    // Broadcast real-time update if status changed to ongoing
    if (updateData.status === "ongoing") {
      try {
        const { broadcastSessionUpdate } = await import("@/app/api/sse/session-updates/route")
        await broadcastSessionUpdate(sessionId, 'status_change', {
          previousStatus: 'confirmed',
          newStatus: 'ongoing',
          userJoined: userRole,
          bothPartiesJoined: bookingSession.learnerJoinedAt && bookingSession.mentorJoinedAt
        })
      } catch (error) {
        console.error("Failed to broadcast session start:", error)
      }
    }

    return NextResponse.json({
      message: isReconnect ? "Successfully reconnected to session" : "Successfully joined session",
      status: updateData.status || bookingSession.status,
      isOngoing: updateData.status === "ongoing",
      isReconnect,
      noShowDetected: updateData.status === "no_show"
    })

  } catch (error) {
    console.error("Error joining session:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Wrapper to maintain Next.js API route signature with rate limiting
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const rateLimitedHandler = withRateLimit('api', (req: NextRequest) => handleSessionJoin(req, context))
  return rateLimitedHandler(request)
}