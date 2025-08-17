import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { bookingSessions, users, learners, mentors } from "@/db/schema"
import { eq } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { getSession } from "@/lib/auth/getSession"
import { agoraService } from "@/lib/agora/AgoraService"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sessionId = params.id

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

    // Check if session is confirmed
    if (booking.status !== "confirmed") {
      return NextResponse.json(
        {
          error: `Session is ${booking.status}. Only confirmed sessions can be joined.`,
        },
        { status: 400 },
      )
    }

    // Check if it's time to join (allow joining 10 minutes before scheduled time)
    const scheduledDateTime = new Date(booking.scheduledDate)
    const now = new Date()
    const joinStartTime = new Date(scheduledDateTime.getTime() - 10 * 60 * 1000) // 10 minutes before
    const sessionEndTime = new Date(scheduledDateTime.getTime() + (booking.durationMinutes || 60) * 60 * 1000)
    const joinEndTime = new Date(sessionEndTime.getTime() + 10 * 60 * 1000) // 10 minutes after session ends

    if (now < joinStartTime) {
      return NextResponse.json(
        {
          error: "Session hasn't started yet. You can join 10 minutes before the scheduled time.",
        },
        { status: 400 },
      )
    }

    if (now > joinEndTime) {
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