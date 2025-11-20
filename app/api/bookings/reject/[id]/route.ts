import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { bookingSessions, mentors, learners, notifications, creditTransactions } from "@/db/schema"
import { eq } from "drizzle-orm"
import { getSession } from "@/lib/auth/getSession"
import { broadcastSessionUpdate } from "@/app/api/sse/session-updates/route"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const sessionId = Number.parseInt(id)
    console.log('[REJECT] Starting rejection process for session:', sessionId)
    
    if (!sessionId || isNaN(sessionId)) {
      return NextResponse.json({ error: "Invalid session ID" }, { status: 400 })
    }

    const session = await getSession()
    console.log('[REJECT] Auth session:', { userId: session?.id, role: session?.role })
    
    if (!session?.id || session.role !== "mentor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const rejectionReason = body.reason || body.rejectionReason || "No reason provided"
    console.log('[REJECT] Rejection reason:', rejectionReason)

    // Get mentor ID from user ID
    const [mentor] = await db.select({ id: mentors.id }).from(mentors).where(eq(mentors.userId, session.id))
    console.log('[REJECT] Mentor profile:', { mentorId: mentor?.id })

    if (!mentor) {
      return NextResponse.json({ error: "Mentor profile not found" }, { status: 404 })
    }

    const result = await db.transaction(async (tx) => {
      // Get booking session details with learner info
      const [booking] = await tx
        .select({
          id: bookingSessions.id,
          mentorId: bookingSessions.mentorId,
          learnerId: bookingSessions.learnerId,
          status: bookingSessions.status,
          totalCostCredits: bookingSessions.totalCostCredits,
          escrowCredits: bookingSessions.escrowCredits,
          learnerUserId: learners.userId,
          learnerCreditsBalance: learners.creditsBalance,
        })
        .from(bookingSessions)
        .innerJoin(learners, eq(bookingSessions.learnerId, learners.id))
        .where(eq(bookingSessions.id, sessionId))

      console.log('[REJECT] Booking found:', { bookingId: booking?.id, status: booking?.status, mentorId: booking?.mentorId })

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
          mentorResponseMessage: `Session rejected: ${rejectionReason.trim()}`,
          rejectionReason: rejectionReason.trim(),
          cancelledAt: now,
          cancelledBy: "mentor",
          cancellationReason: rejectionReason.trim(),
          refundAmount: booking.escrowCredits,
          updatedAt: now,
        })
        .where(eq(bookingSessions.id, sessionId))

      // Refund credits to learner (full refund for rejection)
      const newBalance = booking.learnerCreditsBalance + booking.escrowCredits
      await tx
        .update(learners)
        .set({
          creditsBalance: newBalance,
          updatedAt: now,
        })
        .where(eq(learners.id, booking.learnerId))

      // Record refund transaction
      await tx.insert(creditTransactions).values({
        userId: booking.learnerUserId,
        type: "session_refund",
        direction: "credit",
        amount: booking.escrowCredits,
        balanceBefore: booking.learnerCreditsBalance,
        balanceAfter: newBalance,
        relatedSessionId: sessionId,
        description: `Full refund for rejected session: ${rejectionReason.trim()}`,
        createdAt: now,
      })

      // Notify learner about rejection
      await tx.insert(notifications).values({
        userId: booking.learnerUserId,
        type: "booking_rejected",
        title: "Session Request Declined",
        message: `Your session request was declined by the mentor. ${booking.escrowCredits} credits have been refunded to your account. Reason: ${rejectionReason.trim()}`,
        relatedEntityType: "session",
        relatedEntityId: sessionId,
        createdAt: now,
      })

      return {
        success: true,
        message: "Session rejected and credits refunded",
        refundAmount: booking.escrowCredits,
      }
    })

    console.log('[REJECT] Transaction completed successfully:', result)

    // Broadcast real-time update to connected clients
    try {
      await broadcastSessionUpdate(sessionId, 'status_change', {
        previousStatus: 'pending',
        newStatus: 'rejected',
        mentorResponse: true,
        rejectionReason: rejectionReason.trim(),
        refundAmount: result.refundAmount
      })
    } catch (broadcastError) {
      // Log broadcast error but don't fail the request
      console.error('Broadcast error (non-critical):', broadcastError)
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Error rejecting booking:", error)
    return NextResponse.json({ error: error.message || "Failed to reject booking" }, { status: 500 })
  }
}
