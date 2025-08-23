import { type NextRequest, NextResponse } from "next/server"
import { agoraService } from "@/lib/agora/AgoraService"
import { db } from "@/db"
import { bookingSessions, learners, mentors } from "@/db/schema"
import { eq } from "drizzle-orm"
import { getSession } from "@/lib/auth/getSession"

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
    }

    // Get booking session details
    const booking = await db
      .select({
        id: bookingSessions.id,
        learnerId: bookingSessions.learnerId,
        mentorId: bookingSessions.mentorId,
        status: bookingSessions.status,
        scheduledDate: bookingSessions.scheduledDate,
        durationMinutes: bookingSessions.durationMinutes,
        agoraChannelName: bookingSessions.agoraChannelName,
      })
      .from(bookingSessions)
      .where(eq(bookingSessions.id, Number.parseInt(sessionId)))
      .limit(1)

    if (!booking.length) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    const sessionData = booking[0]

    // Allow both confirmed and upcoming sessions to generate tokens
    if (!["confirmed", "upcoming"].includes(sessionData.status)) {
      return NextResponse.json({ error: `Session status '${sessionData.status}' is not ready for video call` }, { status: 400 })
    }

    // Determine user role and verify access
    let userRole: "mentor" | "learner" | null = null

    if (session.role === "mentor") {
      const [mentor] = await db
        .select({ id: mentors.id })
        .from(mentors)
        .where(eq(mentors.userId, session.id))
        .limit(1)

      if (mentor && mentor.id === sessionData.mentorId) {
        userRole = "mentor"
      }
    } else if (session.role === "learner") {
      const [learner] = await db
        .select({ id: learners.id })
        .from(learners)
        .where(eq(learners.userId, session.id))
        .limit(1)

      if (learner && learner.id === sessionData.learnerId) {
        userRole = "learner"
      }
    }

    if (!userRole) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Create or get Agora room
    let channel = sessionData.agoraChannelName
    if (!channel) {
      const room = await agoraService.createRoom(sessionId)
      channel = room.channel

      // Update booking session with channel name
      await db
        .update(bookingSessions)
        .set({ 
          agoraChannelName: channel,
          agoraChannelCreatedAt: new Date(),
        })
        .where(eq(bookingSessions.id, sessionData.id))
    }

    // Generate Agora token - userRole is guaranteed to be non-null here
    const tokenData = await agoraService.generateToken(channel, session.id.toString(), userRole)

    return NextResponse.json({
      ...tokenData,
      role: userRole,
      sessionDetails: {
        id: sessionData.id,
        scheduledDate: sessionData.scheduledDate,
        durationMinutes: sessionData.durationMinutes,
      },
    })
  } catch (error) {
    console.error("Error generating Agora token:", error)
    return NextResponse.json({ error: "Failed to generate token" }, { status: 500 })
  }
}