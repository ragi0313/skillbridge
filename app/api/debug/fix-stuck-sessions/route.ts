import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { bookingSessions, learners, mentors, creditTransactions, notifications, mentorPayouts } from "@/db/schema"
import { eq, and, lt } from "drizzle-orm"

// WARNING: This is a debug endpoint without authentication
// Remove or secure this in production!
export async function POST(request: NextRequest) {
  try {
    const now = new Date()
    const results = {
      processed: 0,
      errors: [] as string[],
      sessions: [] as any[]
    }

    console.log(`[DEBUG_CLEANUP] Starting stuck session cleanup at ${now.toISOString()}`)

    // Find all "ongoing" sessions that should have ended (more than 1 hour past scheduled end)
    const stuckSessions = await db
      .select({
        id: bookingSessions.id,
        learnerId: bookingSessions.learnerId,
        mentorId: bookingSessions.mentorId,
        status: bookingSessions.status,
        totalCostCredits: bookingSessions.totalCostCredits,
        scheduledDate: bookingSessions.scheduledDate,
        durationMinutes: bookingSessions.durationMinutes,
        learnerJoinedAt: bookingSessions.learnerJoinedAt,
        mentorJoinedAt: bookingSessions.mentorJoinedAt,
        agoraCallStartedAt: bookingSessions.agoraCallStartedAt,
      })
      .from(bookingSessions)
      .where(
        and(
          eq(bookingSessions.status, "ongoing"),
          // Session should have ended more than 1 hour ago
          lt(bookingSessions.scheduledDate, new Date(now.getTime() - 1 * 60 * 60 * 1000))
        )
      )

    console.log(`[DEBUG_CLEANUP] Found ${stuckSessions.length} stuck sessions`)

    if (stuckSessions.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No stuck sessions found",
        processed: 0,
        sessions: [],
        timestamp: now.toISOString()
      })
    }

    for (const session of stuckSessions) {
      try {
        const scheduledEndTime = new Date(session.scheduledDate.getTime() + (session.durationMinutes || 60) * 60 * 1000)
        const hoursOverdue = Math.round((now.getTime() - scheduledEndTime.getTime()) / (1000 * 60 * 60) * 10) / 10

        console.log(`[DEBUG_CLEANUP] Processing session ${session.id}: ${hoursOverdue} hours overdue`)

        await db.transaction(async (tx) => {
          // Complete the session
          await tx
            .update(bookingSessions)
            .set({
              status: "completed",
              agoraCallEndedAt: now,
              cancellationReason: `Automatic completion - session was stuck in ongoing status for ${hoursOverdue} hours`,
              updatedAt: now,
            })
            .where(eq(bookingSessions.id, session.id))

          // Calculate mentor earnings (80% of total cost)
          const platformFeePercentage = 20
          const mentorEarnings = Math.floor(session.totalCostCredits * (100 - platformFeePercentage) / 100)

          // Pay mentor
          const [mentorData] = await tx
            .select({ creditsBalance: mentors.creditsBalance, userId: mentors.userId })
            .from(mentors)
            .where(eq(mentors.id, session.mentorId))

          if (mentorData) {
            await tx
              .update(mentors)
              .set({ 
                creditsBalance: mentorData.creditsBalance + mentorEarnings,
                updatedAt: now 
              })
              .where(eq(mentors.id, session.mentorId))

            // Create payout record
            await tx.insert(mentorPayouts).values({
              mentorId: session.mentorId,
              sessionId: session.id,
              earnedCredits: mentorEarnings,
              platformFeeCredits: session.totalCostCredits - mentorEarnings,
              feePercentage: platformFeePercentage,
              status: "released",
              releasedAt: now,
              createdAt: now,
            })

            // Record mentor earning transaction
            await tx.insert(creditTransactions).values({
              userId: mentorData.userId,
              type: "mentor_payout",
              direction: "credit",
              amount: mentorEarnings,
              balanceBefore: mentorData.creditsBalance,
              balanceAfter: mentorData.creditsBalance + mentorEarnings,
              relatedSessionId: session.id,
              description: `Automatic payout for stuck session cleanup (${hoursOverdue}h overdue)`,
              metadata: { reason: "stuck_session_cleanup", hoursOverdue, autoFixed: true },
              createdAt: now,
            })

            // Notify mentor
            await tx.insert(notifications).values({
              userId: mentorData.userId,
              type: "session_completed",
              title: "Session Automatically Completed",
              message: `Your session has been automatically completed due to a system issue. You've received ${mentorEarnings} credits.`,
              relatedEntityType: "session",
              relatedEntityId: session.id,
              createdAt: now,
            })
          }

          // Notify learner
          const [learnerData] = await tx
            .select({ userId: learners.userId })
            .from(learners)
            .where(eq(learners.id, session.learnerId))

          if (learnerData) {
            await tx.insert(notifications).values({
              userId: learnerData.userId,
              type: "session_completed",
              title: "Session Automatically Completed", 
              message: `Your session has been automatically completed. The session was marked as successful.`,
              relatedEntityType: "session",
              relatedEntityId: session.id,
              createdAt: now,
            })
          }

          results.sessions.push({
            id: session.id,
            scheduledDate: session.scheduledDate,
            hoursOverdue,
            mentorPayout: mentorEarnings,
            participantJoins: {
              learner: !!session.learnerJoinedAt,
              mentor: !!session.mentorJoinedAt
            }
          })
        })

        results.processed++
        console.log(`[DEBUG_CLEANUP] Successfully processed session ${session.id}`)

      } catch (error) {
        console.error(`[DEBUG_CLEANUP] Error processing session ${session.id}:`, error)
        results.errors.push(`Session ${session.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    console.log(`[DEBUG_CLEANUP] Completed. Processed: ${results.processed}, Errors: ${results.errors.length}`)

    return NextResponse.json({
      success: true,
      message: `Successfully fixed ${results.processed} stuck sessions`,
      processed: results.processed,
      errors: results.errors,
      sessions: results.sessions,
      timestamp: now.toISOString()
    })

  } catch (error) {
    console.error("[DEBUG_CLEANUP] Error in stuck session cleanup:", error)
    return NextResponse.json(
      { 
        error: "Internal server error", 
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}