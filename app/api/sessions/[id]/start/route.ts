import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { bookingSessions, users, learners, mentors } from "@/db/schema"
import { eq } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { getSession } from "@/lib/auth/getSession"
import { BookingLifecycleService } from "@/lib/sessions/booking-lifecycle"
import { agoraService } from "@/lib/agora/AgoraService"

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

    // Get session details and verify user access
    const learnerUsers = alias(users, "learner_users")
    const mentorUsers = alias(users, "mentor_users")

    const [bookingSession] = await db
      .select({
        id: bookingSessions.id,
        status: bookingSessions.status,
        learnerId: bookingSessions.learnerId,
        mentorId: bookingSessions.mentorId,
        agoraChannelName: bookingSessions.agoraChannelName,
        learnerUser: {
          id: learnerUsers.id,
        },
        mentorUser: {
          id: mentorUsers.id,
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

    // Verify user has access to this session
    const isLearner = bookingSession.learnerUser?.id === session.id
    const isMentor = bookingSession.mentorUser?.id === session.id

    if (!isLearner && !isMentor) {
      return NextResponse.json({ error: "Unauthorized access to session" }, { status: 403 })
    }

    // Check if session is confirmed or upcoming
    if (!["confirmed", "upcoming"].includes(bookingSession.status || "")) {
      return NextResponse.json(
        { error: `Cannot start session with status: ${bookingSession.status}` },
        { status: 400 }
      )
    }

    let channelName = bookingSession.agoraChannelName

    // Create Agora channel if it doesn't exist
    if (!channelName) {
      const agoraRoom = await agoraService.createRoom(sessionId.toString())
      channelName = agoraRoom.channel

      // Update session with channel name
      await db
        .update(bookingSessions)
        .set({
          agoraChannelName: channelName,
          agoraChannelCreatedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(bookingSessions.id, sessionId))
    }

    // Use the BookingLifecycleService to start the session
    const lifecycleService = BookingLifecycleService.getInstance()
    const result = await lifecycleService.startVideoSession(sessionId, channelName)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to start session" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: "Session started successfully",
      channelName
    })

  } catch (error) {
    console.error("Error starting session:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}