// app/api/bookings/accept/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db" 
import { bookingSessions, sessions, mentorPayouts, creditTransactions, notifications, mentors } from "@/db/schema"
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

    // Start transaction
    const result = await db.transaction(async (tx) => {
      // Get the booking session with mentor validation
      const [bookingSession] = await tx
        .select({
          id: bookingSessions.id,
          mentorId: bookingSessions.mentorId,
          learnerId: bookingSessions.learnerId,
          totalCostCredits: bookingSessions.totalCostCredits,
          escrowCredits: bookingSessions.escrowCredits,
          status: bookingSessions.status,
          scheduledDate: bookingSessions.scheduledDate,
          durationMinutes: bookingSessions.durationMinutes,
        })
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

      // Update booking session status to confirmed
      await tx
        .update(bookingSessions)
        .set({ 
          status: "confirmed",
          updatedAt: new Date()
        })
        .where(eq(bookingSessions.id, sessionId))

      // Create session record
      await tx.insert(sessions).values({
        bookingSessionId: sessionId,
        mentorResponseAt: new Date(),
        mentorResponseMessage: "Session accepted by mentor",
        createdAt: new Date(),
      })

      // Calculate mentor earnings (assuming 80% goes to mentor, 20% platform fee)
      const platformFeePercentage = 20
      const earnedCredits = Math.floor(bookingSession.totalCostCredits * (100 - platformFeePercentage) / 100)
      const platformFeeCredits = bookingSession.totalCostCredits - earnedCredits

      // Create mentor payout record (in escrow)
      await tx.insert(mentorPayouts).values({
        mentorId: bookingSession.mentorId,
        sessionId: sessionId,
        earnedCredits: earnedCredits,
        platformFeeCredits: platformFeeCredits,
        feePercentage: platformFeePercentage,
        status: "pending", // Will be released after session completion
        createdAt: new Date(),
      })

      // Create notification for learner
      await tx.insert(notifications).values({
        userId: bookingSession.learnerId,
        type: "session_confirmed",
        title: "Session Confirmed!",
        message: "Your mentor has accepted your session request. Get ready for your upcoming session!",
        relatedEntityType: "session",
        relatedEntityId: sessionId,
        createdAt: new Date(),
      })

      return {
        sessionId,
        earnedCredits,
        scheduledDate: bookingSession.scheduledDate,
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