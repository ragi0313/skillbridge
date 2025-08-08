import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { bookingSessions, mentors, learners, users, notifications, creditTransactions } from "@/db/schema"
import { eq } from "drizzle-orm"
import { getSession } from "@/lib/auth/getSession"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sessionId = parseInt(params.id)
    if (!sessionId || isNaN(sessionId)) {
      return NextResponse.json({ error: "Invalid session ID" }, { status: 400 })
    }

    const session = await getSession()
    if (!session?.id || session.role !== "mentor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const rejectionReason = body.reason || "Mentor declined the session"

    // Get mentor ID from user ID
    const [mentor] = await db
      .select({ id: mentors.id })
      .from(mentors)
      .where(eq(mentors.userId, session.id))

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
          totalCostCredits: bookingSessions.totalCostCredits,
          escrowCredits: bookingSessions.escrowCredits,
        })
        .from(bookingSessions)
        .where(eq(bookingSessions.id, sessionId))

      if (!booking) {
        throw new Error("Booking session not found")
      }

      // Verify this mentor owns the booking
      if (booking.mentorId !== mentor.id) {
        throw new Error("You are not authorized to reject this booking")
      }

      // Check if booking is still pending
      if (booking.status !== "pending") {
        throw new Error(`Cannot reject booking with status: ${booking.status}`)
      }

      const now = new Date()

      // Update booking status to rejected
      await tx
        .update(bookingSessions)
        .set({
          status: "rejected",
          mentorResponseAt: now,
          mentorResponseMessage: rejectionReason,
          cancelledAt: now,
          cancelledBy: "mentor",
          cancellationReason: rejectionReason,
          refundAmount: booking.escrowCredits,
          updatedAt: now,
        })
        .where(eq(bookingSessions.id, sessionId))

      // Refund credits to learner
      const [learnerData] = await tx
        .select({
          userId: learners.userId,
          creditsBalance: learners.creditsBalance,
          firstName: users.firstName,
          lastName: users.lastName,
        })
        .from(learners)
        .innerJoin(users, eq(learners.userId, users.id))
        .where(eq(learners.id, booking.learnerId))

      if (learnerData) {
        const newBalance = learnerData.creditsBalance + booking.escrowCredits
        await tx
          .update(learners)
          .set({ 
            creditsBalance: newBalance,
            updatedAt: now 
          })
          .where(eq(learners.id, booking.learnerId))

        // Record refund transaction
        await tx.insert(creditTransactions).values({
          userId: learnerData.userId,
          type: "session_refund",
          direction: "credit",
          amount: booking.escrowCredits,
          balanceBefore: learnerData.creditsBalance,
          balanceAfter: newBalance,
          relatedSessionId: sessionId,
          description: `Refund for rejected session: ${rejectionReason}`,
          createdAt: now,
        })

        // Notify learner about rejection
        await tx.insert(notifications).values({
          userId: learnerData.userId,
          type: "booking_rejected",
          title: "Session Request Declined",
          message: `Your session request was declined by the mentor. ${booking.escrowCredits} credits have been refunded to your account. Reason: ${rejectionReason}`,
          relatedEntityType: "session",
          relatedEntityId: sessionId,
          createdAt: now,
        })
      }

      return {
        success: true,
        message: "Session rejected and credits refunded",
        refundAmount: booking.escrowCredits,
      }
    })

    return NextResponse.json(result)

  } catch (error: any) {
    console.error("Error rejecting booking:", error)
    return NextResponse.json(
      { error: error.message || "Failed to reject booking" },
      { status: 500 }
    )
  }
}
