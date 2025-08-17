import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth/getSession"
import { db } from "@/db"
import { bookingSessions, mentors, learners, notifications, creditTransactions } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sessionId = Number.parseInt(params.id)
    if (!sessionId || isNaN(sessionId)) {
      return NextResponse.json({ error: "Invalid session ID" }, { status: 400 })
    }

    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { noShowParty, reason } = body

    if (!["learner", "mentor"].includes(noShowParty)) {
      return NextResponse.json({ error: "Invalid no-show party specified" }, { status: 400 })
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
          scheduledDate: bookingSessions.scheduledDate,
        })
        .from(bookingSessions)
        .where(eq(bookingSessions.id, sessionId))

      if (!booking) {
        throw new Error("Booking session not found")
      }

      // Check if session is confirmed
      if (booking.status !== "confirmed") {
        throw new Error(`Cannot mark no-show for session with status: ${booking.status}`)
      }

      const now = new Date()
      const noShowReason = reason || `${noShowParty} did not show up for the session`

      // Update booking status to no_show
      await tx
        .update(bookingSessions)
        .set({
          status: "no_show",
          cancelledAt: now,
          cancelledBy: session.role as string,
          cancellationReason: noShowReason,
          updatedAt: now,
        })
        .where(eq(bookingSessions.id, sessionId))

      // Handle refunds and notifications based on who was the no-show
      if (noShowParty === "learner") {
        // Learner no-show: mentor gets paid, no refund to learner
        const [mentorData] = await tx
          .select({
            userId: mentors.userId,
            creditsBalance: mentors.creditsBalance,
          })
          .from(mentors)
          .where(eq(mentors.id, booking.mentorId))

        if (mentorData) {
          // Calculate mentor earnings (80% of total cost)
          const mentorEarnings = Math.floor(booking.totalCostCredits * 0.8)
          const newMentorBalance = mentorData.creditsBalance + mentorEarnings

          await tx
            .update(mentors)
            .set({
              creditsBalance: newMentorBalance,
              updatedAt: now,
            })
            .where(eq(mentors.id, booking.mentorId))

          // Record mentor payout transaction
          await tx.insert(creditTransactions).values({
            userId: mentorData.userId,
            type: "mentor_payout",
            direction: "credit",
            amount: mentorEarnings,
            balanceBefore: mentorData.creditsBalance,
            balanceAfter: newMentorBalance,
            relatedSessionId: sessionId,
            description: `Payout for session (learner no-show): ${noShowReason}`,
            createdAt: now,
          })

          // Notify mentor
          await tx.insert(notifications).values({
            userId: mentorData.userId,
            type: "session_no_show",
            title: "Learner No-Show",
            message: `The learner did not show up for the session. You have been paid ${mentorEarnings} credits.`,
            relatedEntityType: "session",
            relatedEntityId: sessionId,
            createdAt: now,
          })
        }

        // Notify learner about no-show
        const [learnerData] = await tx
          .select({ userId: learners.userId })
          .from(learners)
          .where(eq(learners.id, booking.learnerId))

        if (learnerData) {
          await tx.insert(notifications).values({
            userId: learnerData.userId,
            type: "session_no_show",
            title: "Session No-Show",
            message: `You were marked as a no-show for your session. No refund will be issued.`,
            relatedEntityType: "session",
            relatedEntityId: sessionId,
            createdAt: now,
          })
        }
      } else {
        // Mentor no-show: full refund to learner
        const [learnerData] = await tx
          .select({
            userId: learners.userId,
            creditsBalance: learners.creditsBalance,
          })
          .from(learners)
          .where(eq(learners.id, booking.learnerId))

        if (learnerData) {
          const newLearnerBalance = learnerData.creditsBalance + booking.escrowCredits

          await tx
            .update(learners)
            .set({
              creditsBalance: newLearnerBalance,
              updatedAt: now,
            })
            .where(eq(learners.id, booking.learnerId))

          // Update refund amount in booking
          await tx
            .update(bookingSessions)
            .set({ refundAmount: booking.escrowCredits })
            .where(eq(bookingSessions.id, sessionId))

          // Record refund transaction
          await tx.insert(creditTransactions).values({
            userId: learnerData.userId,
            type: "session_refund",
            direction: "credit",
            amount: booking.escrowCredits,
            balanceBefore: learnerData.creditsBalance,
            balanceAfter: newLearnerBalance,
            relatedSessionId: sessionId,
            description: `Refund for session (mentor no-show): ${noShowReason}`,
            createdAt: now,
          })

          // Notify learner about refund
          await tx.insert(notifications).values({
            userId: learnerData.userId,
            type: "session_no_show",
            title: "Mentor No-Show - Refund Issued",
            message: `The mentor did not show up for your session. You have been refunded ${booking.escrowCredits} credits.`,
            relatedEntityType: "session",
            relatedEntityId: sessionId,
            createdAt: now,
          })
        }

        // Notify mentor about no-show
        const [mentorData] = await tx
          .select({ userId: mentors.userId })
          .from(mentors)
          .where(eq(mentors.id, booking.mentorId))

        if (mentorData) {
          await tx.insert(notifications).values({
            userId: mentorData.userId,
            type: "session_no_show",
            title: "Session No-Show",
            message: `You were marked as a no-show for your session. The learner has been fully refunded.`,
            relatedEntityType: "session",
            relatedEntityId: sessionId,
            createdAt: now,
          })
        }
      }

      return {
        success: true,
        message: "No-show processed successfully",
        noShowParty,
        refundAmount: noShowParty === "mentor" ? booking.escrowCredits : 0,
      }
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Error processing no-show:", error)
    return NextResponse.json({ error: error.message || "Failed to process no-show" }, { status: 500 })
  }
}
