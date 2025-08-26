import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { bookingSessions, learners, mentors, users } from "@/db/schema"
import { eq } from "drizzle-orm"
import { getSession } from "@/lib/auth/getSession"
import { broadcastForceDisconnect } from "../../../sse/session-updates/route"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await getSession()
    if (!session?.id || session.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 })
    }

    const { reason = 'Admin terminated session' } = await request.json()
    const { sessionId } = await params
    const sessionIdNum = parseInt(sessionId)

    // Get session details
    const booking = await db
      .select({
        id: bookingSessions.id,
        learnerId: bookingSessions.learnerId,
        mentorId: bookingSessions.mentorId,
        status: bookingSessions.status,
        totalCostCredits: bookingSessions.totalCostCredits,
        escrowCredits: bookingSessions.escrowCredits,
        learner: {
          id: learners.id,
          userId: learners.userId,
          creditsBalance: learners.creditsBalance,
        },
        mentor: {
          id: mentors.id,
          userId: mentors.userId,
        },
      })
      .from(bookingSessions)
      .leftJoin(learners, eq(bookingSessions.learnerId, learners.id))
      .leftJoin(mentors, eq(bookingSessions.mentorId, mentors.id))
      .where(eq(bookingSessions.id, sessionIdNum))
      .limit(1)

    if (!booking.length) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    const sessionData = booking[0]

    // Only allow force disconnect for active sessions
    if (!['confirmed', 'upcoming', 'ongoing'].includes(sessionData.status)) {
      return NextResponse.json({ 
        error: `Cannot force disconnect session with status: ${sessionData.status}` 
      }, { status: 400 })
    }

    // Update session status and process refund
    await db.transaction(async (tx) => {
      const now = new Date()

      // Cancel the session
      await tx
        .update(bookingSessions)
        .set({
          status: 'cancelled',
          cancelledBy: 'admin',
          cancellationReason: reason,
          cancelledAt: now,
          agoraCallEndedAt: now,
          refundAmount: sessionData.escrowCredits,
          refundProcessedAt: now,
        })
        .where(eq(bookingSessions.id, sessionIdNum))

      // Refund learner
      if (sessionData.learner && sessionData.escrowCredits > 0) {
        await tx
          .update(learners)
          .set({ 
            creditsBalance: sessionData.learner.creditsBalance + sessionData.escrowCredits 
          })
          .where(eq(learners.id, sessionData.learnerId))
      }
    })

    // Broadcast force disconnect to both participants
    await broadcastForceDisconnect(
      sessionIdNum,
      reason,
      [sessionData.learner!.userId, sessionData.mentor!.userId]
    )

    console.log(`[ADMIN_FORCE_DISCONNECT] Session ${sessionIdNum} force disconnected by admin: ${reason}`)

    return NextResponse.json({
      success: true,
      message: "Session force disconnected successfully",
      sessionId: sessionIdNum,
      reason
    })

  } catch (error) {
    console.error("[ADMIN_FORCE_DISCONNECT] Error force disconnecting session:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}