// Auto Session Monitor - Handles automatic session status updates and no-show detection
// This service runs independently of user interactions to ensure session statuses are always accurate

import { db } from "@/db"
import { bookingSessions, learners, mentors, creditTransactions, notifications, mentorPayouts } from "@/db/schema"
import { eq, and, or, lt, gte, count, sql, inArray } from "drizzle-orm"
import { SessionManagementService } from "./session-management"
import { BookingLifecycleService } from "./booking-lifecycle"

export interface SessionMonitorResult {
  sessionsChecked: number
  noShowsProcessed: number
  expiredBookingsProcessed: number
  statusUpdates: number
  errors: string[]
  timestamp: Date
}

// Helper function to safely broadcast updates
async function safeBroadcastUpdate(sessionId: number, updateType: string, data?: any) {
  try {
    // Dynamic import to avoid circular dependencies and SSR issues
    const { broadcastSessionUpdate } = await import("@/app/api/sse/session-updates/route")
    await broadcastSessionUpdate(sessionId, updateType, data)
  } catch (error) {
    console.error(`Failed to broadcast update for session ${sessionId}:`, error)
    // Don't throw - broadcasting is not critical for functionality
  }
}

export class AutoSessionMonitor {
  private static instance: AutoSessionMonitor
  private sessionService: SessionManagementService
  private bookingService: BookingLifecycleService

  // Configuration
  private static readonly CHECK_INTERVAL_MINUTES = 5
  private static readonly MAX_RETRY_ATTEMPTS = 3
  private static readonly BATCH_SIZE = 50

  static getInstance(): AutoSessionMonitor {
    if (!AutoSessionMonitor.instance) {
      AutoSessionMonitor.instance = new AutoSessionMonitor()
    }
    return AutoSessionMonitor.instance
  }

  constructor() {
    this.sessionService = SessionManagementService.getInstance()
    this.bookingService = BookingLifecycleService.getInstance()
  }

  /**
   * Comprehensive session monitoring that handles all automated status updates
   */
  async runCompleteSessionMonitor(): Promise<SessionMonitorResult> {
    const startTime = new Date()
    console.log(`🔍 Starting comprehensive session monitor at ${startTime.toISOString()}`)

    let sessionsChecked = 0
    let noShowsProcessed = 0
    let expiredBookingsProcessed = 0
    let statusUpdates = 0
    const errors: string[] = []

    try {
      // 1. Process expired booking requests (pending status)
      console.log("📅 Processing expired booking requests...")
      const expiredResult = await this.bookingService.processExpiredBookings()
      expiredBookingsProcessed = expiredResult.processed
      errors.push(...expiredResult.errors)
      console.log(`✅ Processed ${expiredBookingsProcessed} expired bookings`)

      // 2. Update sessions to 'upcoming' status when join window opens (30 minutes before)
      console.log("⏰ Updating sessions to 'upcoming' status...")
      const upcomingResult = await this.updateToUpcomingStatus()
      statusUpdates += upcomingResult.updated
      errors.push(...upcomingResult.errors)
      console.log(`✅ Updated ${upcomingResult.updated} sessions to 'upcoming'`)

      // 3. Detect and process no-shows (confirmed sessions past grace period)
      console.log("🚫 Detecting no-shows...")
      const noShowResult = await this.sessionService.detectNoShows()
      noShowsProcessed = noShowResult.processed
      sessionsChecked += noShowResult.processed
      errors.push(...noShowResult.errors)
      console.log(`✅ Processed ${noShowsProcessed} no-show sessions`)

      // 4. Auto-complete sessions that are still 'ongoing' but should be finished
      console.log("🏁 Auto-completing overdue ongoing sessions...")
      const autoCompleteResult = await this.autoCompleteOverdueSessions()
      statusUpdates += autoCompleteResult.updated
      errors.push(...autoCompleteResult.errors)
      console.log(`✅ Auto-completed ${autoCompleteResult.updated} overdue sessions`)

      // 5. Handle sessions stuck in 'upcoming' that should have started
      console.log("🔧 Handling stuck 'upcoming' sessions...")
      const stuckResult = await this.handleStuckUpcomingSessions()
      statusUpdates += stuckResult.updated
      errors.push(...stuckResult.errors)
      console.log(`✅ Processed ${stuckResult.updated} stuck sessions`)

      const endTime = new Date()
      const duration = (endTime.getTime() - startTime.getTime()) / 1000

      console.log(`🎉 Session monitor completed in ${duration}s`)
      console.log(`📊 Summary: ${sessionsChecked} checked, ${noShowsProcessed} no-shows, ${expiredBookingsProcessed} expired, ${statusUpdates} status updates`)

      if (errors.length > 0) {
        console.log(`⚠️ ${errors.length} errors encountered:`)
        errors.forEach(error => console.log(`   - ${error}`))
      }

      return {
        sessionsChecked,
        noShowsProcessed,
        expiredBookingsProcessed,
        statusUpdates,
        errors,
        timestamp: startTime
      }

    } catch (error) {
      console.error("💥 Critical error in session monitor:", error)
      errors.push(`Critical error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      
      return {
        sessionsChecked,
        noShowsProcessed,
        expiredBookingsProcessed,
        statusUpdates,
        errors,
        timestamp: startTime
      }
    }
  }

  /**
   * Update confirmed sessions to 'upcoming' when they're within 30 minutes of start time
   */
  private async updateToUpcomingStatus(): Promise<{ updated: number; errors: string[] }> {
    const now = new Date()
    const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000)
    const errors: string[] = []
    let updated = 0

    try {
      // Find confirmed sessions that should be marked as upcoming
      const sessionsToUpdate = await db
        .select({
          id: bookingSessions.id,
          scheduledDate: bookingSessions.scheduledDate,
        })
        .from(bookingSessions)
        .where(
          and(
            eq(bookingSessions.status, "confirmed"),
            gte(bookingSessions.scheduledDate, now), // Not in the past
            lt(bookingSessions.scheduledDate, thirtyMinutesFromNow) // Within 30 minutes
          )
        )

      for (const session of sessionsToUpdate) {
        try {
          await db
            .update(bookingSessions)
            .set({
              status: "upcoming",
              updatedAt: now,
            })
            .where(eq(bookingSessions.id, session.id))

          // Broadcast the status update
          await safeBroadcastUpdate(session.id, 'status_change', {
            previousStatus: 'confirmed',
            newStatus: 'upcoming',
            systemUpdate: true
          })

          updated++
          console.log(`   📅 Session ${session.id} updated to 'upcoming' (scheduled: ${session.scheduledDate.toISOString()})`)
        } catch (error) {
          const errorMsg = `Failed to update session ${session.id} to upcoming: ${error instanceof Error ? error.message : 'Unknown error'}`
          errors.push(errorMsg)
          console.error(`   ❌ ${errorMsg}`)
        }
      }

    } catch (error) {
      const errorMsg = `Error in updateToUpcomingStatus: ${error instanceof Error ? error.message : 'Unknown error'}`
      errors.push(errorMsg)
      console.error(`❌ ${errorMsg}`)
    }

    return { updated, errors }
  }

  /**
   * Auto-complete sessions that are ongoing but should have finished based on duration
   */
  private async autoCompleteOverdueSessions(): Promise<{ updated: number; errors: string[] }> {
    const now = new Date()
    const errors: string[] = []
    let updated = 0

    try {
      // Find ongoing sessions that should have ended based on scheduled time + duration
      const overdueSessions = await db
        .select({
          id: bookingSessions.id,
          scheduledDate: bookingSessions.scheduledDate,
          durationMinutes: bookingSessions.durationMinutes,
          learnerId: bookingSessions.learnerId,
          mentorId: bookingSessions.mentorId,
          totalCostCredits: bookingSessions.totalCostCredits,
          learnerJoinedAt: bookingSessions.learnerJoinedAt,
          mentorJoinedAt: bookingSessions.mentorJoinedAt,
          learnerConnectionDurationMs: bookingSessions.learnerConnectionDurationMs,
          mentorConnectionDurationMs: bookingSessions.mentorConnectionDurationMs,
        })
        .from(bookingSessions)
        .where(
          and(
            eq(bookingSessions.status, "ongoing"),
            // Session should have ended at least 30 minutes ago (grace period)
            lt(
              sql`${bookingSessions.scheduledDate} + (${bookingSessions.durationMinutes} + 30) * INTERVAL '1 minute'`,
              now
            )
          )
        )

      for (const session of overdueSessions) {
        try {
          // Check if both parties joined and stayed for reasonable duration
          const learnerJoined = !!session.learnerJoinedAt
          const mentorJoined = !!session.mentorJoinedAt
          const learnerDuration = session.learnerConnectionDurationMs || 0
          const mentorDuration = session.mentorConnectionDurationMs || 0
          const minRequiredDuration = 5 * 60 * 1000 // 5 minutes

          let newStatus: string
          if (learnerJoined && mentorJoined && 
              learnerDuration >= minRequiredDuration && 
              mentorDuration >= minRequiredDuration) {
            // Both participated adequately - complete normally
            newStatus = "completed"
            await this.processMentorPayout(session.mentorId, session.totalCostCredits, session.id)
            console.log(`   🏁 Auto-completed session ${session.id} - both parties participated`)
          } else {
            // Technical issues or insufficient participation - refund
            newStatus = "technical_issues"
            await this.processRefund(session.learnerId, session.totalCostCredits, session.id, "Auto-refund for incomplete session")
            console.log(`   🔧 Auto-marked session ${session.id} as technical issues - insufficient participation`)
          }

          await db
            .update(bookingSessions)
            .set({
              status: newStatus as any,
              agoraCallEndedAt: now,
              updatedAt: now,
            })
            .where(eq(bookingSessions.id, session.id))

          // Broadcast the status update
          await safeBroadcastUpdate(session.id, 'status_change', {
            previousStatus: 'ongoing',
            newStatus,
            systemUpdate: true,
            autoCompleted: true
          })

          updated++

        } catch (error) {
          const errorMsg = `Failed to auto-complete session ${session.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
          errors.push(errorMsg)
          console.error(`   ❌ ${errorMsg}`)
        }
      }

    } catch (error) {
      const errorMsg = `Error in autoCompleteOverdueSessions: ${error instanceof Error ? error.message : 'Unknown error'}`
      errors.push(errorMsg)
      console.error(`❌ ${errorMsg}`)
    }

    return { updated, errors }
  }

  /**
   * Handle sessions stuck in 'upcoming' status that should have started or been marked as no-show
   */
  private async handleStuckUpcomingSessions(): Promise<{ updated: number; errors: string[] }> {
    const now = new Date()
    const errors: string[] = []
    let updated = 0

    try {
      // Find upcoming sessions that are past their scheduled time + grace period
      const stuckSessions = await db
        .select({
          id: bookingSessions.id,
          scheduledDate: bookingSessions.scheduledDate,
          learnerJoinedAt: bookingSessions.learnerJoinedAt,
          mentorJoinedAt: bookingSessions.mentorJoinedAt,
          noShowCheckedAt: bookingSessions.noShowCheckedAt,
        })
        .from(bookingSessions)
        .where(
          and(
            eq(bookingSessions.status, "upcoming"),
            // Past scheduled time + 15 minute grace period (consistent with no-show detection)
            lt(
              sql`${bookingSessions.scheduledDate} + INTERVAL '15 minutes'`,
              now
            )
          )
        )

      for (const session of stuckSessions) {
        try {
          // If either party joined, the session should have been marked as ongoing
          if (session.learnerJoinedAt || session.mentorJoinedAt) {
            // Someone joined but status wasn't updated - mark as ongoing
            await db
              .update(bookingSessions)
              .set({
                status: "ongoing",
                agoraCallStartedAt: session.learnerJoinedAt || session.mentorJoinedAt,
                updatedAt: now,
              })
              .where(eq(bookingSessions.id, session.id))

            console.log(`   🚀 Updated stuck session ${session.id} to 'ongoing' (someone joined)`)
          } else {
            // Neither joined - this is a no-show case that needs immediate processing
            // Mark as confirmed temporarily so no-show detection can process it
            // This ensures sessions stuck in upcoming get processed as no-shows
            await tx
              .update(bookingSessions)
              .set({
                status: "confirmed", // Reset to confirmed so no-show detection picks it up
                updatedAt: now,
              })
              .where(eq(bookingSessions.id, session.id))
            
            console.log(`   🔄 Reset stuck session ${session.id} from upcoming to confirmed for no-show detection`)
          }

          updated++

        } catch (error) {
          const errorMsg = `Failed to handle stuck session ${session.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
          errors.push(errorMsg)
          console.error(`   ❌ ${errorMsg}`)
        }
      }

    } catch (error) {
      const errorMsg = `Error in handleStuckUpcomingSessions: ${error instanceof Error ? error.message : 'Unknown error'}`
      errors.push(errorMsg)
      console.error(`❌ ${errorMsg}`)
    }

    return { updated, errors }
  }

  /**
   * Process refund to learner
   */
  private async processRefund(learnerId: number, amount: number, sessionId: number, description: string): Promise<void> {
    await db.transaction(async (tx) => {
      const [learner] = await tx
        .select({ creditsBalance: learners.creditsBalance, userId: learners.userId })
        .from(learners)
        .where(eq(learners.id, learnerId))

      if (learner) {
        const newBalance = learner.creditsBalance + amount
        await tx
          .update(learners)
          .set({ creditsBalance: newBalance, updatedAt: new Date() })
          .where(eq(learners.id, learnerId))

        await tx.insert(creditTransactions).values({
          userId: learner.userId,
          type: "session_refund",
          direction: "credit",
          amount,
          balanceBefore: learner.creditsBalance,
          balanceAfter: newBalance,
          relatedSessionId: sessionId,
          description,
          metadata: { systemProcessed: true, autoMonitor: true },
          createdAt: new Date(),
        })
      }
    })
  }

  /**
   * Process mentor payout
   */
  private async processMentorPayout(mentorId: number, totalCredits: number, sessionId: number): Promise<void> {
    const platformFeePercentage = 20
    const mentorEarnings = Math.floor(totalCredits * (100 - platformFeePercentage) / 100)

    await db.transaction(async (tx) => {
      const [mentor] = await tx
        .select({ creditsBalance: mentors.creditsBalance, userId: mentors.userId })
        .from(mentors)
        .where(eq(mentors.id, mentorId))

      if (mentor) {
        const newBalance = mentor.creditsBalance + mentorEarnings
        await tx
          .update(mentors)
          .set({ creditsBalance: newBalance, updatedAt: new Date() })
          .where(eq(mentors.id, mentorId))

        await tx.insert(mentorPayouts).values({
          mentorId,
          sessionId,
          earnedCredits: mentorEarnings,
          platformFeeCredits: totalCredits - mentorEarnings,
          feePercentage: platformFeePercentage,
          status: "released",
          releasedAt: new Date(),
          createdAt: new Date(),
        })

        await tx.insert(creditTransactions).values({
          userId: mentor.userId,
          type: "mentor_payout",
          direction: "credit",
          amount: mentorEarnings,
          balanceBefore: mentor.creditsBalance,
          balanceAfter: newBalance,
          relatedSessionId: sessionId,
          description: "Auto-payout for completed session",
          metadata: { systemProcessed: true, autoMonitor: true },
          createdAt: new Date(),
        })
      }
    })
  }

  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<{
    pendingSessions: number
    confirmedSessions: number
    upcomingSessions: number
    ongoingSessions: number
    overdueBookings: number
    recentErrors: number
  }> {
    const now = new Date()
    
    const [pendingCount] = await db
      .select({ count: count() })
      .from(bookingSessions)
      .where(eq(bookingSessions.status, "pending"))

    const [confirmedCount] = await db
      .select({ count: count() })
      .from(bookingSessions)
      .where(eq(bookingSessions.status, "confirmed"))

    const [upcomingCount] = await db
      .select({ count: count() })
      .from(bookingSessions)
      .where(eq(bookingSessions.status, "upcoming"))

    const [ongoingCount] = await db
      .select({ count: count() })
      .from(bookingSessions)
      .where(eq(bookingSessions.status, "ongoing"))

    // Count overdue bookings (confirmed sessions past their time)
    const [overdueCount] = await db
      .select({ count: count() })
      .from(bookingSessions)
      .where(
        and(
          eq(bookingSessions.status, "confirmed"),
          lt(bookingSessions.scheduledDate, now)
        )
      )

    return {
      pendingSessions: pendingCount.count,
      confirmedSessions: confirmedCount.count,
      upcomingSessions: upcomingCount.count,
      ongoingSessions: ongoingCount.count,
      overdueBookings: overdueCount.count,
      recentErrors: 0 // Could be implemented with error logging
    }
  }
}

// Export convenience function for cron jobs
export async function runAutoSessionMonitor(): Promise<SessionMonitorResult> {
  console.log("🤖 Auto Session Monitor starting...")
  const monitor = AutoSessionMonitor.getInstance()
  const result = await monitor.runCompleteSessionMonitor()
  console.log("🤖 Auto Session Monitor completed")
  return result
}

// Export health check function
export async function getSessionSystemHealth() {
  const monitor = AutoSessionMonitor.getInstance()
  return await monitor.getSystemHealth()
}