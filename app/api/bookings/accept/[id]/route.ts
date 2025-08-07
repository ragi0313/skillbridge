import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db" 
import { bookingSessions, mentorPayouts, notifications, mentors } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { getSession } from "@/lib/auth/getSession"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = parseInt(params.id)
    
    if (isNaN(sessionId)) {
      return NextResponse.json(
        { error: "Invalid session ID" },
        { status: 400 }
      )
    }

    const session = await getSession()
    if (!session?.id || session.role !== "mentor") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const [mentor] = await db
      .select({ id: mentors.id })
      .from(mentors)
      .where(eq(mentors.userId, session.id))

    if (!mentor) {
      return NextResponse.json(
        { error: "Mentor not found" },
        { status: 404 }
      )
    }

    // Get optional acceptance message
    const body = await request.json().catch(() => ({}))
    const acceptanceMessage = body.message || "Session accepted by mentor"

    const result = await db.transaction(async (tx) => {
      // Get the booking session with mentor validation
      const [bookingSession] = await tx
        .select()
        .from(bookingSessions)
        .where(
          and(
            eq(bookingSessions.id, sessionId),
            eq(bookingSessions.mentorId, mentor.id)
          )
        )

      if (!bookingSession) {
        throw new Error("Session not found or unauthorized")
      }

      if (bookingSession.status !== "pending") {
        throw new Error("Session is not in pending status")
      }

      // Check if session has expired
      if (bookingSession.expiresAt && bookingSession.expiresAt < new Date()) {
        throw new Error("Session request has expired")
      }

      // Update booking session status to confirmed
      await tx
        .update(bookingSessions)
        .set({ 
          status: "confirmed",
          mentorResponseAt: new Date(),
          mentorResponseMessage: acceptanceMessage,
          updatedAt: new Date()
        })
        .where(eq(bookingSessions.id, sessionId))

      // Calculate mentor earnings (80% goes to mentor, 20% platform fee)
      const platformFeePercentage = 20
      const earnedCredits = Math.floor(bookingSession.totalCostCredits * (100 - platformFeePercentage) / 100)
      const platformFeeCredits = bookingSession.totalCostCredits - earnedCredits

      // Create mentor payout record (in escrow until session completion)
      await tx.insert(mentorPayouts).values({
        mentorId: bookingSession.mentorId,
        sessionId: sessionId,
        earnedCredits: earnedCredits,
        platformFeeCredits: platformFeeCredits,
        feePercentage: platformFeePercentage,
        status: "pending",
        createdAt: new Date(),
      })

      // Create notification for learner
      await tx.insert(notifications).values({
        userId: bookingSession.learnerId,
        type: "session_confirmed",
        title: "Session Confirmed!",
        message: `Your mentor has accepted your session request! ${acceptanceMessage}`,
        relatedEntityType: "session",
        relatedEntityId: sessionId,
        createdAt: new Date(),
      })

      return {
        sessionId,
        earnedCredits,
        scheduledDate: bookingSession.scheduledDate,
        message: acceptanceMessage
      }
    })

    return NextResponse.json({
      success: true,
      message: "Session accepted successfully!",
      data: result,
    })

  } catch (error: any) {
    console.error("Error accepting session:", error)
    return NextResponse.json(
      { error: error.message || "Failed to accept session" },
      { status: 500 }
    )
  }
}