import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { bookingSessions, learners, mentors } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { getSession } from "@/lib/auth/getSession"

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

    // Get session details
    const [bookingSession] = await db
      .select({
        id: bookingSessions.id,
        mentorId: bookingSessions.mentorId,
        learnerId: bookingSessions.learnerId,
        status: bookingSessions.status,
        agoraChannelName: bookingSessions.agoraChannelName,
        agoraCallEndedAt: bookingSessions.agoraCallEndedAt,
      })
      .from(bookingSessions)
      .where(eq(bookingSessions.id, sessionId))

    if (!bookingSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // Verify user is part of this session
    let isAuthorized = false

    if (session.role === "mentor") {
      const [mentor] = await db
        .select({ id: mentors.id })
        .from(mentors)
        .where(and(eq(mentors.userId, session.id), eq(mentors.id, bookingSession.mentorId)))
      if (mentor) isAuthorized = true
    } else if (session.role === "learner") {
      const [learner] = await db
        .select({ id: learners.id })
        .from(learners)
        .where(and(eq(learners.userId, session.id), eq(learners.id, bookingSession.learnerId)))
      if (learner) isAuthorized = true
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: "You are not authorized to end this session" }, { status: 403 })
    }

    // Check if session is already ended
    if (bookingSession.agoraCallEndedAt) {
      return NextResponse.json({ error: "Session has already ended" }, { status: 400 })
    }

    const now = new Date()

    // Update session status
    await db
      .update(bookingSessions)
      .set({
        status: "completed",
        agoraCallEndedAt: now,
        updatedAt: now,
      })
      .where(eq(bookingSessions.id, sessionId))

    return NextResponse.json({
      success: true,
      message: "Session ended successfully",
      endedAt: now,
    })
  } catch (error: any) {
    console.error("Error ending session:", error)
    return NextResponse.json({ error: error.message || "Failed to end session" }, { status: 500 })
  }
}
