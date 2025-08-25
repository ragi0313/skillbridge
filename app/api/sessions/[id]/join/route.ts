import { type NextRequest, NextResponse } from "next/server"
import { withRateLimit } from "@/lib/middleware/rate-limit"
import { db } from "@/db"
import { bookingSessions, users, learners, mentors, notifications } from "@/db/schema"
import { eq } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { getSession } from "@/lib/auth/getSession"
import { agoraService } from "@/lib/agora/AgoraService"

// Initialize session monitoring
import "@/lib/initialize"

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
        startTime: bookingSessions.startTime,
        endTime: bookingSessions.endTime,
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

    // ENHANCED: Verify user has access to this session using access control utility
    const { validateSessionAccess } = await import('@/lib/sessions/access-control')
    const accessValidation = await validateSessionAccess(Number.parseInt(sessionId), session.id)
    
    if (!accessValidation.isAuthorized || !accessValidation.userRole) {
      console.log(`[SESSION_ACCESS] Access denied for user ${session.id} to session ${sessionId}: ${accessValidation.error}`)
      return NextResponse.json({ 
        error: accessValidation.error || "Access denied. Only the booked mentor and learner can join this session." 
      }, { status: 403 })
    }

    const userRole = accessValidation.userRole
    const userName = userRole === "mentor" 
      ? `${booking.mentorUser?.firstName} ${booking.mentorUser?.lastName}`
      : `${booking.learnerUser?.firstName} ${booking.learnerUser?.lastName}`

    // Debug logging for troubleshooting
    console.log(`[DEBUG] Session ${sessionId} join attempt:`, {
      sessionStatus: booking.status,
      userRole,
      userId: session.id,
      scheduledDate: booking.scheduledDate,
      currentTime: new Date().toISOString(),
      agoraChannel: booking.agoraChannelName,
      callStartedAt: booking.agoraCallStartedAt
    })

    // Check if session is joinable (confirmed, upcoming, or ongoing for reconnection)
    if (!["confirmed", "upcoming", "ongoing"].includes(booking.status)) {
      console.log(`[ERROR] Invalid session status: ${booking.status}`)
      return NextResponse.json(
        {
          error: `Session is ${booking.status}. Only confirmed, upcoming, or ongoing sessions can be joined.`,
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

    // For ongoing sessions, allow reconnection even if past scheduled time
    if (booking.status === "ongoing") {
      console.log(`[DEBUG] Allowing reconnection to ongoing session ${sessionId}`)
      // Still check if it's way past grace period (more than 2 hours past scheduled end)
      const extendedGraceTime = new Date(sessionEndTime.getTime() + 2 * 60 * 60 * 1000) // 2 hours after session ends
      if (now > extendedGraceTime) {
        console.log(`[ERROR] Ongoing session has been inactive too long`)
        return NextResponse.json(
          {
            error: "Session has been inactive for too long and is no longer available for reconnection.",
          },
          { status: 400 },
        )
      }
    } else {
      // For confirmed/upcoming sessions, use normal time validation
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
    }

    // Create or get Agora channel
    let channel = booking.agoraChannelName
    if (!channel) {
      const room = await agoraService.createRoom(sessionId)
      channel = room.channel

      // Update booking session with channel name
      await db.update(bookingSessions).set({ agoraChannelName: channel }).where(eq(bookingSessions.id, booking.id))
    }

    const isWithinMeetingTime = now >= scheduledDateTime && now <= sessionEndTime
    const isInWaitingRoom = now >= joinStartTime && now < scheduledDateTime

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
      isWithinMeetingTime,
      isInWaitingRoom,
      timeUntilMeeting: isInWaitingRoom ? Math.ceil((scheduledDateTime.getTime() - now.getTime()) / 1000) : 0,
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
    
    // Check if we're within the actual meeting time (not just waiting room)
    const isWithinMeetingTime = now >= scheduledDateTime && now <= sessionEndTime
    
    let updateData: any = {}
    let notificationData: any[] = []
    let isReconnect = false

    if (isLearner) {
      isReconnect = !!bookingSession.learnerJoinedAt
      updateData.learnerJoinedAt = now
      updateData.learnerLeftAt = null
      
      // Only mark session as ongoing if both parties joined AND we're within the actual meeting time
      if (["confirmed", "upcoming"].includes(bookingSession.status)) {
        if (bookingSession.mentorJoinedAt && isWithinMeetingTime) {
          // Both parties are now in the session during the actual meeting time
          updateData.status = "ongoing"
          updateData.agoraCallStartedAt = isReconnect ? bookingSession.agoraCallStartedAt || now : now
          console.log(`Session ${sessionId} marked as ongoing - both participants joined during meeting time`)
        } else if (!isReconnect) {
          if (isWithinMeetingTime) {
            console.log(`Learner joined session ${sessionId} during meeting time, waiting for mentor`)
          } else {
            console.log(`Learner joined session ${sessionId} waiting room, ${Math.ceil((scheduledDateTime.getTime() - now.getTime()) / (1000 * 60))} minutes until meeting starts`)
          }
        }
      }

      // Notify mentor of learner joining/reconnecting
      if (bookingSession.mentorUser?.id) {
        notificationData.push({
          userId: bookingSession.mentorUser.id,
          type: "session_joined",
          title: isReconnect ? "Learner Reconnected" : (isWithinMeetingTime ? "Learner Joined Session" : "Learner Joined Waiting Room"),
          message: `${bookingSession.learnerUser?.firstName} has ${isReconnect ? 'reconnected to' : 'joined'} the ${isWithinMeetingTime ? 'video call' : 'waiting room'}.`,
          relatedEntityType: "session",
          relatedEntityId: sessionId,
          createdAt: now,
        })
      }
    } else if (isMentor) {
      isReconnect = !!bookingSession.mentorJoinedAt
      updateData.mentorJoinedAt = now
      updateData.mentorLeftAt = null
      
      // Only mark session as ongoing if both parties joined AND we're within the actual meeting time
      if (["confirmed", "upcoming"].includes(bookingSession.status)) {
        if (bookingSession.learnerJoinedAt && isWithinMeetingTime) {
          // Both parties are now in the session during the actual meeting time
          updateData.status = "ongoing"
          updateData.agoraCallStartedAt = isReconnect ? bookingSession.agoraCallStartedAt || now : now
          console.log(`Session ${sessionId} marked as ongoing - both participants joined during meeting time`)
        } else if (!isReconnect) {
          if (isWithinMeetingTime) {
            console.log(`Mentor joined session ${sessionId} during meeting time, waiting for learner`)
          } else {
            console.log(`Mentor joined session ${sessionId} waiting room, ${Math.ceil((scheduledDateTime.getTime() - now.getTime()) / (1000 * 60))} minutes until meeting starts`)
          }
        }
      }

      // Notify learner of mentor joining/reconnecting
      if (bookingSession.learnerUser?.id) {
        notificationData.push({
          userId: bookingSession.learnerUser.id,
          type: "session_joined",
          title: isReconnect ? "Mentor Reconnected" : (isWithinMeetingTime ? "Mentor Joined Session" : "Mentor Joined Waiting Room"),
          message: `${bookingSession.mentorUser?.firstName} has ${isReconnect ? 'reconnected to' : 'joined'} the ${isWithinMeetingTime ? 'video call' : 'waiting room'}.`,
          relatedEntityType: "session",
          relatedEntityId: sessionId,
          createdAt: now,
        })
      }
    }

    // CRITICAL: Check for existing active connections using enhanced access control
    const activeConnections = await db
      .select({
        learnerJoinedAt: bookingSessions.learnerJoinedAt,
        learnerLeftAt: bookingSessions.learnerLeftAt,
        mentorJoinedAt: bookingSessions.mentorJoinedAt,
        mentorLeftAt: bookingSessions.mentorLeftAt,
        agoraCallEndedAt: bookingSessions.agoraCallEndedAt,
        status: bookingSessions.status,
      })
      .from(bookingSessions)
      .where(eq(bookingSessions.id, sessionId))
      .limit(1)

    const currentConnection = activeConnections[0]
    
    // CRITICAL: Prevent multiple connections for 1-on-1 sessions
    if (isLearner) {
      // Check if learner is already connected (joined but hasn't left, and session not ended)
      const learnerAlreadyActive = currentConnection.learnerJoinedAt && 
                                   !currentConnection.learnerLeftAt && 
                                   !currentConnection.agoraCallEndedAt &&
                                   !isReconnect
      
      if (learnerAlreadyActive) {
        console.log(`[SESSION_JOIN] Learner duplicate connection blocked for session ${sessionId}`)
        return NextResponse.json({
          error: "You are already connected to this session from another device/browser. This is a 1-on-1 session - only one connection per participant is allowed.",
          code: "ALREADY_CONNECTED"
        }, { status: 409 })
      }
    } else if (isMentor) {
      // Check if mentor is already connected (joined but hasn't left, and session not ended)
      const mentorAlreadyActive = currentConnection.mentorJoinedAt && 
                                  !currentConnection.mentorLeftAt && 
                                  !currentConnection.agoraCallEndedAt &&
                                  !isReconnect
      
      if (mentorAlreadyActive) {
        console.log(`[SESSION_JOIN] Mentor duplicate connection blocked for session ${sessionId}`)
        return NextResponse.json({
          error: "You are already connected to this session from another device/browser. This is a 1-on-1 session - only one connection per participant is allowed.",
          code: "ALREADY_CONNECTED"
        }, { status: 409 })
      }
    }

    // ENHANCED: Update session with join information and enforce participant limits
    await db.transaction(async (tx) => {
      // Double-check session hasn't been completed/cancelled while we were processing
      const [currentSessionState] = await tx
        .select({ status: bookingSessions.status, agoraCallEndedAt: bookingSessions.agoraCallEndedAt })
        .from(bookingSessions)
        .where(eq(bookingSessions.id, sessionId))
        .limit(1)
      
      if (!currentSessionState || 
          !['confirmed', 'upcoming', 'ongoing'].includes(currentSessionState.status) ||
          currentSessionState.agoraCallEndedAt) {
        throw new Error(`Session state changed during join process: ${currentSessionState?.status || 'unknown'}`)
      }

      // Update with participant tracking
      await tx
        .update(bookingSessions)
        .set({
          ...updateData,
          // Reset left times when joining/rejoining to prevent confusion
          ...(isLearner ? { learnerLeftAt: null } : { mentorLeftAt: null })
        })
        .where(eq(bookingSessions.id, sessionId))

      // Insert notifications
      if (notificationData.length > 0) {
        await tx.insert(notifications).values(notificationData)
      }
    })

    // Determine user role for broadcast
    const userRole = isLearner ? "learner" : "mentor"
    
    // Note: Real-time session updates would be handled by separate broadcast service
    // For now, the database update is sufficient for session state tracking
    if (updateData.status === "ongoing") {
      console.log(`[SESSION_JOIN] Session ${sessionId} marked as ongoing - both participants joined`)
    }

    return NextResponse.json({
      message: isReconnect ? "Successfully reconnected to session" : "Successfully joined session",
      status: updateData.status || bookingSession.status,
      isOngoing: updateData.status === "ongoing",
      isReconnect,
      noShowDetected: updateData.status === "no_show",
      participantRole: userRole,
      sessionId: sessionId,
      enforceOneOnOne: true // Signal to client that this is a 1-on-1 session
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