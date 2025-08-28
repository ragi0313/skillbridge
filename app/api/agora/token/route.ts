import { type NextRequest, NextResponse } from "next/server"
import { agoraService } from "@/lib/agora/AgoraService"
import { db } from "@/db"
import { bookingSessions, learners, mentors } from "@/db/schema"
import { eq } from "drizzle-orm"
import { getSession } from "@/lib/auth/getSession"

export async function POST(request: NextRequest) {
  try {
    // Get user session
    const session = await getSession()
    if (!session?.id) {
      console.error("[AGORA_TOKEN] Unauthorized request - no session")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse request body
    let body
    try {
      body = await request.json()
    } catch (parseError) {
      console.error("[AGORA_TOKEN] Failed to parse request body:", parseError)
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }

    const { sessionId, forceNew = false } = body

    if (!sessionId) {
      console.error("[AGORA_TOKEN] Missing sessionId in request")
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
    }

    const parsedSessionId = parseInt(sessionId)
    if (isNaN(parsedSessionId)) {
      console.error("[AGORA_TOKEN] Invalid sessionId format:", sessionId)
      return NextResponse.json({ error: "Invalid session ID format" }, { status: 400 })
    }

    console.log(`[AGORA_TOKEN] Processing request for session ${parsedSessionId}, user ${session.id}`)

    // Get booking session details with proper error handling
    let booking
    try {
      booking = await db
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
        })
        .from(bookingSessions)
        .where(eq(bookingSessions.id, parsedSessionId))
        .limit(1)
    } catch (dbError) {
      console.error("[AGORA_TOKEN] Database error:", dbError)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    if (!booking.length) {
      console.error(`[AGORA_TOKEN] Session ${parsedSessionId} not found`)
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    const sessionData = booking[0]

    // Validate session timing
    const now = new Date()
    const sessionStart = new Date(sessionData.startTime)
    const sessionEnd = new Date(sessionData.endTime)
    const joinWindowStart = new Date(sessionStart.getTime() - 30 * 60 * 1000) // 30 min before

    console.log(`[AGORA_TOKEN] Session timing validation:`, {
      now: now.toISOString(),
      sessionStart: sessionStart.toISOString(),
      sessionEnd: sessionEnd.toISOString(),
      joinWindowStart: joinWindowStart.toISOString()
    })

    if (now < joinWindowStart) {
      console.error(`[AGORA_TOKEN] Too early to generate token for session ${parsedSessionId}`)
      return NextResponse.json({ 
        error: "Token generation window not open yet. You can generate tokens 30 minutes before the session starts.",
        canGenerateAt: joinWindowStart.toISOString()
      }, { status: 400 })
    }

    if (now > sessionEnd) {
      console.error(`[AGORA_TOKEN] Session ${parsedSessionId} has already ended`)
      return NextResponse.json({ error: "Session has already ended" }, { status: 400 })
    }

    // Debug session status
    console.log(`[AGORA_TOKEN] Session ${parsedSessionId} details:`, {
      sessionStatus: sessionData.status,
      userRole: session.role,
      userId: session.id,
      agoraChannel: sessionData.agoraChannelName,
      forceNew
    })

    // Allow more session statuses for token generation
    const allowedStatuses = ["confirmed", "upcoming", "ongoing", null] // null for new sessions
    if (sessionData.status !== null && !allowedStatuses.includes(sessionData.status)) {
      console.error(`[AGORA_TOKEN] Invalid session status for token generation: ${sessionData.status}`)
      return NextResponse.json({ 
        error: `Session status '${sessionData.status}' is not ready for video call. Please contact support if you believe this is an error.` 
      }, { status: 400 })
    }

    // Determine user role and verify access
    let userRole: "mentor" | "learner" | null = null

    try {
      if (session.role === "mentor") {
        const mentorQuery = await db
          .select({ id: mentors.id })
          .from(mentors)
          .where(eq(mentors.userId, session.id))
          .limit(1)

        if (mentorQuery.length > 0 && mentorQuery[0].id === sessionData.mentorId) {
          userRole = "mentor"
        }
      } else if (session.role === "learner") {
        const learnerQuery = await db
          .select({ id: learners.id })
          .from(learners)
          .where(eq(learners.userId, session.id))
          .limit(1)

        if (learnerQuery.length > 0 && learnerQuery[0].id === sessionData.learnerId) {
          userRole = "learner"
        }
      }
    } catch (roleError) {
      console.error("[AGORA_TOKEN] Error checking user role:", roleError)
      return NextResponse.json({ error: "Error verifying user access" }, { status: 500 })
    }

    if (!userRole) {
      console.error(`[AGORA_TOKEN] Access denied for user ${session.id} (role: ${session.role}) to session ${parsedSessionId}`)
      return NextResponse.json({ error: "Access denied - you are not a participant in this session" }, { status: 403 })
    }

    console.log(`[AGORA_TOKEN] User ${session.id} verified as ${userRole} for session ${parsedSessionId}`)

    // Create or get Agora channel
    let channel = sessionData.agoraChannelName
    if (!channel || forceNew) {
      try {
        console.log(`[AGORA_TOKEN] Creating new Agora room for session ${parsedSessionId}`)
        const room = await agoraService.createRoom(parsedSessionId.toString(), sessionEnd)
        channel = room.channel

        // Update booking session with channel name
        await db
          .update(bookingSessions)
          .set({ 
            agoraChannelName: channel,
            agoraChannelCreatedAt: new Date(),
          })
          .where(eq(bookingSessions.id, sessionData.id))
        
        console.log(`[AGORA_TOKEN] Created and saved new channel: ${channel}`)
      } catch (channelError) {
        console.error(`[AGORA_TOKEN] Failed to create Agora room:`, channelError)
        return NextResponse.json({ 
          error: "Failed to create video room. Please try again.",
          details: process.env.NODE_ENV === 'development' ? channelError?.toString() : undefined
        }, { status: 500 })
      }
    } else {
      console.log(`[AGORA_TOKEN] Using existing channel: ${channel}`)
    }

    // Validate channel name
    if (!channel || channel.length === 0 || channel.length > 64) {
      console.error(`[AGORA_TOKEN] Invalid channel name: "${channel}"`)
      return NextResponse.json({ error: "Invalid channel configuration" }, { status: 500 })
    }

    // Generate Agora token with extended expiration
    try {
      // Set token to expire 1 hour after session ends
      const tokenExpirationTime = Math.floor(sessionEnd.getTime() / 1000) + 3600
      
      console.log(`[AGORA_TOKEN] Generating token for:`, {
        channel,
        userId: session.id.toString(),
        userRole,
        expiresAt: new Date(tokenExpirationTime * 1000).toISOString()
      })
      
      const tokenData = await agoraService.generateToken(
        channel, 
        session.id.toString(), 
        userRole,
        tokenExpirationTime
      )

      // Validate generated token
      const isTokenValid = await agoraService.validateToken(tokenData.token, channel)
      if (!isTokenValid) {
        throw new Error("Generated token failed validation")
      }

      console.log(`[AGORA_TOKEN] Successfully generated and validated token for session ${parsedSessionId}`)
      console.log(`[AGORA_TOKEN] Token details:`, {
        appId: tokenData.appId.substring(0, 8) + "...",
        channel: tokenData.channel,
        uid: tokenData.uid,
        tokenLength: tokenData.token.length,
        userRole
      })

      // Return complete token information
      return NextResponse.json({
        appId: tokenData.appId,
        channel: tokenData.channel,
        token: tokenData.token,
        uid: tokenData.uid,
        role: userRole,
        sessionDetails: {
          id: sessionData.id,
          scheduledDate: sessionData.scheduledDate,
          startTime: sessionData.startTime,
          endTime: sessionData.endTime,
          durationMinutes: sessionData.durationMinutes,
        },
        generatedAt: new Date().toISOString(),
        expiresAt: new Date(tokenExpirationTime * 1000).toISOString()
      })

    } catch (tokenError) {
      console.error(`[AGORA_TOKEN] Token generation failed:`, tokenError)
      return NextResponse.json({ 
        error: "Failed to generate video call token. Please try again.",
        details: process.env.NODE_ENV === 'development' ? tokenError?.toString() : undefined
      }, { status: 500 })
    }

  } catch (error) {
    console.error("[AGORA_TOKEN] Unexpected error in token generation:", error)
    return NextResponse.json({ 
      error: "Internal server error. Please try again later.",
      details: process.env.NODE_ENV === 'development' ? error?.toString() : undefined
    }, { status: 500 })
  }
}