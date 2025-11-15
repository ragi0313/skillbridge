import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { bookingSessions, mentors, learners, users, notifications } from "@/db/schema"
import { eq } from "drizzle-orm"
import { getSession } from "@/lib/auth/getSession"
import { agoraService } from "@/lib/agora/AgoraService"
import { broadcastSessionUpdate } from "@/app/api/sse/session-updates/route"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const sessionId = Number.parseInt(id)
    if (!sessionId || isNaN(sessionId)) {
      return NextResponse.json({ error: "Invalid session ID" }, { status: 400 })
    }

    const session = await getSession()
    if (!session?.id || session.role !== "mentor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get mentor ID from user ID
    const [mentor] = await db.select({ id: mentors.id }).from(mentors).where(eq(mentors.userId, session.id))

    if (!mentor) {
      return NextResponse.json({ error: "Mentor profile not found" }, { status: 404 })
    }

    const result = await db.transaction(async (tx) => {
      // Get booking session details
      const [booking] = await tx
        .select({
          id: bookingSessions.id,
          mentorId: bookingSessions.mentorId,
          learnerId: bookingSessions.learnerId,
          status: bookingSessions.status,
          scheduledDate: bookingSessions.scheduledDate,
          durationMinutes: bookingSessions.durationMinutes,
          totalCostCredits: bookingSessions.totalCostCredits,
          expiresAt: bookingSessions.expiresAt,
        })
        .from(bookingSessions)
        .where(eq(bookingSessions.id, sessionId))

      if (!booking) {
        throw new Error("Booking session not found")
      }

      // Verify this mentor owns the booking
      if (booking.mentorId !== mentor.id) {
        throw new Error("You are not authorized to accept this booking")
      }

      // Check if booking is still pending
      if (booking.status !== "pending") {
        throw new Error(`Cannot accept booking with status: ${booking.status}`)
      }

      // Check if booking has expired
      const now = new Date()
      if (booking.expiresAt < now) {
        throw new Error("This booking request has expired")
      }

      // Create Agora room (channel)
      const agoraRoom = await agoraService.createRoom(sessionId.toString())

      // Update booking status to confirmed
      await tx
        .update(bookingSessions)
        .set({
          status: "confirmed",
          mentorResponseAt: now,
          mentorResponseMessage: "Session accepted by mentor",
          agoraChannelName: agoraRoom.channel,
          agoraChannelCreatedAt: now,
          updatedAt: now,
        })
        .where(eq(bookingSessions.id, sessionId))

      // Get learner details for notification
      const [learnerData] = await tx
        .select({
          userId: learners.userId,
          firstName: users.firstName,
          lastName: users.lastName,
          timezone: learners.timezone,
        })
        .from(learners)
        .innerJoin(users, eq(learners.userId, users.id))
        .where(eq(learners.id, booking.learnerId))

      if (learnerData) {
        // Format date and time in learner's timezone
        const learnerTimezone = learnerData.timezone || "UTC"
        const scheduledDateStr = booking.scheduledDate.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
          timeZone: learnerTimezone,
        })
        const scheduledTimeStr = booking.scheduledDate.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
          timeZone: learnerTimezone,
        })

        // Notify learner that session was accepted
        await tx.insert(notifications).values({
          userId: learnerData.userId,
          type: "booking_accepted",
          title: "Session Confirmed!",
          message: `Your mentoring session has been confirmed. The session will start on ${scheduledDateStr} at ${scheduledTimeStr}.`,
          relatedEntityType: "session",
          relatedEntityId: sessionId,
          createdAt: now,
        })
      }

      return {
        success: true,
        message: "Session accepted successfully",
        channelName: agoraRoom.channel,
        appId: agoraRoom.appId,
        sessionDetails: {
          id: booking.id,
          scheduledDate: booking.scheduledDate,
          durationMinutes: booking.durationMinutes,
        },
      }
    })

    // Broadcast real-time update to connected clients
    await broadcastSessionUpdate(sessionId, 'status_change', {
      previousStatus: 'pending',
      newStatus: 'confirmed',
      mentorResponse: true
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Error accepting booking:", error)
    return NextResponse.json({ error: error.message || "Failed to accept booking" }, { status: 500 })
  }
}