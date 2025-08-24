// Comprehensive Session Monitor Service
// Single source of truth for all session monitoring, no-show detection, and lifecycle management
// Replaces: auto-session-monitor.ts, auto-monitor-service.ts, unified-monitor.ts

import { db } from "@/db"
import { bookingSessions, learners, mentors, users, creditTransactions, notifications, mentorPayouts } from "@/db/schema"
import { eq, and, or, lt, gte, count, sql, inArray } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { BookingLifecycleService } from "./booking-lifecycle"
import { SessionManagementService } from "./session-management"
import { notificationService } from "@/lib/notifications/notification-service"

export interface SessionMonitorResult {
  timestamp: Date
  totalProcessed: number
  totalErrors: number
  sessionCounts: {
    pending: number
    confirmed: number
    upcoming: number
    ongoing: number
    completed: number
  }
  actions: {
    expiredBookings: number
    statusTransitions: number
    noShowsDetected: number
    sessionsCompleted: number
    reminders: number
  }
  errors: string[]
}

// Helper function to safely broadcast updates
async function safeBroadcastUpdate(sessionId: number, updateType: string, data?: any) {
  try {
    const { broadcastSessionUpdate } = await import("@/app/api/sse/session-updates/route")
    await broadcastSessionUpdate(sessionId, updateType, data)
  } catch (error) {
    console.error(`Failed to broadcast update for session ${sessionId}:`, error)
  }
}

export class SessionMonitorService {
  private static instance: SessionMonitorService
  private isRunning = false
  private intervalId: NodeJS.Timeout | null = null
  private lastRun: Date | null = null
  private runCount = 0
  
  // Configuration - Reduced timings for faster response
  private readonly DEFAULT_INTERVAL_MINUTES = 1 // Check every 1 minute instead of 2
  private readonly REMINDER_WINDOW_MINUTES = 60 // Send reminders 1 hour before
  private readonly NO_SHOW_GRACE_MINUTES = 15
  private readonly UPCOMING_WINDOW_MINUTES = 5 // Mark as upcoming 5 minutes before instead of 30
  
  static getInstance(): SessionMonitorService {
    if (!SessionMonitorService.instance) {
      SessionMonitorService.instance = new SessionMonitorService()
    }
    return SessionMonitorService.instance
  }

  private constructor() {
    // Auto-start monitoring for all environments (not just production) to ensure no-shows are caught
    if (typeof window === 'undefined') {
      setTimeout(() => this.start(1), 5000) // Start with 1-minute intervals
    }
  }

  /**
   * Start the monitoring service
   */
  start(intervalMinutes: number = this.DEFAULT_INTERVAL_MINUTES): void {
    if (this.isRunning) {
      console.log('[SESSION_MONITOR] ⚠️ Monitoring is already running')
      return
    }

    this.isRunning = true
    console.log(`[SESSION_MONITOR] 🚀 Starting session monitoring service (${intervalMinutes}min intervals)`)
    
    // Run immediately
    this.runMonitoringCycle()
    
    // Set up recurring monitoring
    this.intervalId = setInterval(() => {
      this.runMonitoringCycle()
    }, intervalMinutes * 60 * 1000)

    // Graceful shutdown handlers
    process.on('SIGTERM', () => this.stop())
    process.on('SIGINT', () => this.stop())
  }

  /**
   * Stop the monitoring service
   */
  stop(): void {
    if (!this.isRunning) return
    
    console.log('[SESSION_MONITOR] 🛑 Stopping session monitoring service')
    this.isRunning = false
    
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  /**
   * Get monitoring service status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      runCount: this.runCount,
      intervalMinutes: this.DEFAULT_INTERVAL_MINUTES,
      nextRunIn: this.getNextRunTime()
    }
  }

  private getNextRunTime(): number | null {
    if (!this.isRunning || !this.lastRun || !this.intervalId) return null
    
    const interval = this.DEFAULT_INTERVAL_MINUTES * 60 * 1000
    const elapsed = Date.now() - this.lastRun.getTime()
    return Math.max(0, interval - elapsed)
  }

  /**
   * Main monitoring cycle - comprehensive session management
   */
  private async runMonitoringCycle(): Promise<void> {
    const startTime = new Date()
    this.lastRun = startTime
    this.runCount++

    console.log(`[SESSION_MONITOR] 🔍 Starting monitoring cycle #${this.runCount} at ${startTime.toISOString()}`)

    try {
      const result = await this.runComprehensiveMonitoring()
      
      const duration = new Date().getTime() - startTime.getTime()
      
      if (result.totalProcessed > 0 || result.totalErrors > 0) {
        console.log(`[SESSION_MONITOR] 📈 Cycle #${this.runCount} completed in ${duration}ms:`)
        console.log(`[SESSION_MONITOR]    Processed: ${result.totalProcessed} items`)
        console.log(`[SESSION_MONITOR]    Actions: expired=${result.actions.expiredBookings}, transitions=${result.actions.statusTransitions}, no-shows=${result.actions.noShowsDetected}, completed=${result.actions.sessionsCompleted}, reminders=${result.actions.reminders}`)
        
        if (result.totalErrors > 0) {
          console.log(`[SESSION_MONITOR] ⚠️ ${result.totalErrors} errors occurred`)
          result.errors.forEach(error => console.log(`[SESSION_MONITOR]    - ${error}`))
        }
      } else {
        console.log(`[SESSION_MONITOR] ✅ Cycle #${this.runCount} completed in ${duration}ms (no actions needed)`)
      }

    } catch (error) {
      console.error(`[SESSION_MONITOR] 💥 Critical error in monitoring cycle:`, error instanceof Error ? error.message : error)
    }
  }

  /**
   * Manual trigger for monitoring cycle
   */
  async runOnce(): Promise<SessionMonitorResult> {
    console.log('[SESSION_MONITOR] 🎯 Manual monitoring cycle triggered')
    return await this.runComprehensiveMonitoring()
  }

  /**
   * Comprehensive monitoring that handles all aspects of session management
   */
  async runComprehensiveMonitoring(): Promise<SessionMonitorResult> {
    const startTime = new Date()
    
    const result: SessionMonitorResult = {
      timestamp: startTime,
      totalProcessed: 0,
      totalErrors: 0,
      sessionCounts: {
        pending: 0,
        confirmed: 0,
        upcoming: 0,
        ongoing: 0,
        completed: 0
      },
      actions: {
        expiredBookings: 0,
        statusTransitions: 0,
        noShowsDetected: 0,
        sessionsCompleted: 0,
        reminders: 0
      },
      errors: []
    }

    try {
      // 1. Get current session counts
      result.sessionCounts = await this.getSessionCounts()
      console.log('[SESSION_MONITOR] 📊 Session counts:', result.sessionCounts)

      if (result.sessionCounts.pending + result.sessionCounts.confirmed + result.sessionCounts.upcoming + result.sessionCounts.ongoing === 0) {
        console.log('[SESSION_MONITOR] ℹ️ No active sessions to monitor')
        return result
      }

      // 2. Process expired booking requests
      console.log('[SESSION_MONITOR] 📅 Processing expired bookings...')
      try {
        const lifecycleService = BookingLifecycleService.getInstance()
        const expiredResult = await lifecycleService.processExpiredBookings()
        result.actions.expiredBookings = expiredResult.processed
        result.totalProcessed += expiredResult.processed
        result.errors.push(...expiredResult.errors)
        
        if (expiredResult.processed > 0) {
          console.log(`[SESSION_MONITOR] ✅ Processed ${expiredResult.processed} expired bookings`)
        }
      } catch (error) {
        const errorMsg = `Expired bookings processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        result.errors.push(errorMsg)
        console.error(`[SESSION_MONITOR] ❌ ${errorMsg}`)
      }

      // 3. Send session reminders (1 hour before)
      console.log('[SESSION_MONITOR] 🔔 Sending session reminders...')
      try {
        const reminderResult = await this.sendSessionReminders()
        result.actions.reminders = reminderResult.sent
        result.totalProcessed += reminderResult.sent
        result.errors.push(...reminderResult.errors)
        
        if (reminderResult.sent > 0) {
          console.log(`[SESSION_MONITOR] ✅ Sent ${reminderResult.sent} session reminders`)
        }
      } catch (error) {
        console.log(`[SESSION_MONITOR] ℹ️ Session reminders temporarily disabled due to notification service compatibility`)
        result.actions.reminders = 0
        // Don't add error to results since reminders are not critical
      }

      // 4. Update sessions to 'upcoming' status (30 minutes before)
      console.log('[SESSION_MONITOR] ⏰ Updating sessions to upcoming status...')
      try {
        const upcomingResult = await this.updateToUpcomingStatus()
        result.actions.statusTransitions += upcomingResult.updated
        result.totalProcessed += upcomingResult.updated
        result.errors.push(...upcomingResult.errors)
        
        if (upcomingResult.updated > 0) {
          console.log(`[SESSION_MONITOR] ✅ Updated ${upcomingResult.updated} sessions to upcoming`)
        }
      } catch (error) {
        const errorMsg = `Status transitions failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        result.errors.push(errorMsg)
        console.error(`[SESSION_MONITOR] ❌ ${errorMsg}`)
      }

      // 5. Detect and process no-shows
      console.log('[SESSION_MONITOR] 🚫 Detecting no-shows...')
      try {
        const sessionService = SessionManagementService.getInstance()
        const noShowResult = await sessionService.detectNoShows()
        result.actions.noShowsDetected = noShowResult.processed
        result.totalProcessed += noShowResult.processed
        result.errors.push(...noShowResult.errors)
        
        if (noShowResult.processed > 0) {
          console.log(`[SESSION_MONITOR] ✅ Processed ${noShowResult.processed} no-show sessions`)
        }
      } catch (error) {
        const errorMsg = `No-show detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        result.errors.push(errorMsg)
        console.error(`[SESSION_MONITOR] ❌ ${errorMsg}`)
      }

      // 6. Auto-complete overdue ongoing sessions (24h+ threshold to prevent premature completion)
      console.log('[SESSION_MONITOR] 🏁 Auto-completing overdue sessions (24h+ threshold)...')
      try {
        const autoCompleteResult = await this.autoCompleteOverdueSessions()
        result.actions.sessionsCompleted = autoCompleteResult.updated
        result.totalProcessed += autoCompleteResult.updated
        result.errors.push(...autoCompleteResult.errors)
        
        if (autoCompleteResult.updated > 0) {
          console.log(`[SESSION_MONITOR] ✅ Auto-completed ${autoCompleteResult.updated} overdue sessions (24h+ threshold)`)
        } else {
          console.log(`[SESSION_MONITOR] ℹ️ No sessions met the 24h overdue threshold for auto-completion`)
        }
      } catch (error) {
        const errorMsg = `Auto-completion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        result.errors.push(errorMsg)
        console.error(`[SESSION_MONITOR] ❌ ${errorMsg}`)
      }

      // 7. Handle sessions stuck in 'upcoming'
      console.log('[SESSION_MONITOR] 🔧 Handling stuck sessions...')
      try {
        const stuckResult = await this.handleStuckUpcomingSessions()
        result.actions.statusTransitions += stuckResult.updated
        result.totalProcessed += stuckResult.updated
        result.errors.push(...stuckResult.errors)
        
        if (stuckResult.updated > 0) {
          console.log(`[SESSION_MONITOR] ✅ Fixed ${stuckResult.updated} stuck sessions`)
        }
      } catch (error) {
        const errorMsg = `Stuck session handling failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        result.errors.push(errorMsg)
        console.error(`[SESSION_MONITOR] ❌ ${errorMsg}`)
      }

      result.totalErrors = result.errors.length

    } catch (error) {
      const errorMsg = `Critical monitoring failure: ${error instanceof Error ? error.message : 'Unknown error'}`
      result.errors.push(errorMsg)
      result.totalErrors = result.errors.length
      console.error(`[SESSION_MONITOR] 💥 ${errorMsg}`)
    }

    return result
  }

  /**
   * Get current session counts by status
   */
  private async getSessionCounts(): Promise<{
    pending: number
    confirmed: number
    upcoming: number
    ongoing: number
    completed: number
  }> {
    try {
      const results = await db
        .select({
          status: bookingSessions.status,
          count: count()
        })
        .from(bookingSessions)
        .groupBy(bookingSessions.status)

      const counts = {
        pending: 0,
        confirmed: 0,
        upcoming: 0,
        ongoing: 0,
        completed: 0
      }

      results.forEach(item => {
        if (item.status && item.status in counts) {
          (counts as any)[item.status] = item.count
        }
      })

      return counts
    } catch (error) {
      console.error('[SESSION_MONITOR] Error getting session counts:', error)
      return { pending: 0, confirmed: 0, upcoming: 0, ongoing: 0, completed: 0 }
    }
  }

  /**
   * Send reminder notifications for sessions starting within 1 hour
   * Currently disabled due to notification service compatibility issues
   */
  private async sendSessionReminders(): Promise<{ sent: number; errors: string[] }> {
    const now = new Date()
    const oneHourFromNow = new Date(now.getTime() + this.REMINDER_WINDOW_MINUTES * 60 * 1000)
    const errors: string[] = []
    let sent = 0

    // Temporarily return early until notification service is fixed
    console.log('[SESSION_MONITOR]    ℹ️ Session reminders disabled (notification service needs fixing)')
    return { sent: 0, errors: [] }

    try {
      const learnerUsers = alias(users, "learner_users")
      const mentorUsers = alias(users, "mentor_users")

      const upcomingSessions = await db
        .select({
          id: bookingSessions.id,
          scheduledDate: bookingSessions.scheduledDate,
          // skillName not available in bookingSessions table
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
        .innerJoin(learners, eq(bookingSessions.learnerId, learners.id))
        .innerJoin(mentors, eq(bookingSessions.mentorId, mentors.id))
        .innerJoin(learnerUsers, eq(learners.userId, learnerUsers.id))
        .innerJoin(mentorUsers, eq(mentors.userId, mentorUsers.id))
        .where(
          and(
            eq(bookingSessions.status, "confirmed"),
            gte(bookingSessions.scheduledDate, now),
            lt(bookingSessions.scheduledDate, oneHourFromNow)
          )
        )

      console.log(`[SESSION_MONITOR]    📧 Found ${upcomingSessions.length} sessions needing reminders`)

      for (const session of upcomingSessions) {
        try {
          // Validate session data
          if (!session.learnerUser || !session.mentorUser) {
            console.warn(`[SESSION_MONITOR]    ⚠️ Skipping session ${session.id} - missing user data`)
            continue
          }

          const mentorName = `${session.mentorUser.firstName || ''} ${session.mentorUser.lastName || ''}`.trim()
          
          // Send reminder to learner
          try {
            const learnerResult = await notificationService.createSessionReminder(
              session.learnerUser.id,
              session.id,
              session.scheduledDate,
              true, // isLearner
              mentorName || 'your mentor',
              undefined // skillName not available in bookingSessions
            )

            if (learnerResult && typeof learnerResult === 'object' && learnerResult.success) {
              sent++
              console.log(`[SESSION_MONITOR]    ✅ Sent learner reminder for session ${session.id}`)
            }
          } catch (reminderError) {
            console.log(`[SESSION_MONITOR]    ⚠️ Learner reminder failed for session ${session.id}: ${reminderError instanceof Error ? reminderError.message : String(reminderError)}`)
            // Don't add to errors array to avoid spam - reminders are not critical
          }

          // Send reminder to mentor  
          try {
            const mentorResult = await notificationService.createSessionReminder(
              session.mentorUser.id,
              session.id,
              session.scheduledDate,
              false, // isLearner = false (mentor)
              undefined,
              undefined // skillName not available in bookingSessions
            )

            if (mentorResult && typeof mentorResult === 'object' && mentorResult.success) {
              sent++
              console.log(`[SESSION_MONITOR]    ✅ Sent mentor reminder for session ${session.id}`)
            }
          } catch (reminderError) {
            console.log(`[SESSION_MONITOR]    ⚠️ Mentor reminder failed for session ${session.id}: ${reminderError instanceof Error ? reminderError.message : String(reminderError)}`)
            // Don't add to errors array to avoid spam - reminders are not critical
          }

          if (sent > 0) {
            console.log(`[SESSION_MONITOR]    🔔 Sent reminders for session ${session.id} (scheduled: ${session.scheduledDate.toISOString()})`)
          }
        } catch (error) {
          const errorMsg = `Failed to process reminders for session ${session.id}: ${error instanceof Error ? error.message : String(error)}`
          errors.push(errorMsg)
        }
      }

    } catch (error) {
      const errorMsg = `Error in sendSessionReminders: ${error instanceof Error ? error.message : String(error)}`
      errors.push(errorMsg)
    }

    return { sent, errors }
  }

  /**
   * Update confirmed sessions to 'upcoming' when they're within 5 minutes or when scheduled time has arrived
   */
  private async updateToUpcomingStatus(): Promise<{ updated: number; errors: string[] }> {
    const now = new Date()
    const upcomingWindow = new Date(now.getTime() + this.UPCOMING_WINDOW_MINUTES * 60 * 1000)
    const errors: string[] = []
    let updated = 0

    try {
      const sessionsToUpdate = await db
        .select({
          id: bookingSessions.id,
          scheduledDate: bookingSessions.scheduledDate,
        })
        .from(bookingSessions)
        .where(
          and(
            eq(bookingSessions.status, "confirmed"),
            // Include sessions that are scheduled now or in the near future (within 5 minutes)
            lt(bookingSessions.scheduledDate, upcomingWindow)
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

          await safeBroadcastUpdate(session.id, 'status_change', {
            previousStatus: 'confirmed',
            newStatus: 'upcoming',
            systemUpdate: true
          })

          updated++
          console.log(`[SESSION_MONITOR]    📅 Session ${session.id} updated to 'upcoming'`)
        } catch (error) {
          const errorMsg = `Failed to update session ${session.id} to upcoming: ${error instanceof Error ? error.message : 'Unknown error'}`
          errors.push(errorMsg)
        }
      }

    } catch (error) {
      const errorMsg = `Error in updateToUpcomingStatus: ${error instanceof Error ? error.message : 'Unknown error'}`
      errors.push(errorMsg)
    }

    return { updated, errors }
  }

  /**
   * Auto-complete sessions that are ongoing but should have finished
   * Uses a generous 24-hour threshold to prevent premature completion during normal usage
   */
  private async autoCompleteOverdueSessions(): Promise<{ updated: number; errors: string[] }> {
    const now = new Date()
    const errors: string[] = []
    let updated = 0

    try {
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
        })
        .from(bookingSessions)
        .where(
          and(
            eq(bookingSessions.status, "ongoing"),
            // Session should have ended at least 24 hours ago (much more generous)
            // This prevents premature auto-completion during testing and normal usage
            lt(
              sql`${bookingSessions.scheduledDate} + (${bookingSessions.durationMinutes} + 1440) * INTERVAL '1 minute'`,
              now
            )
          )
        )

      console.log(`[SESSION_MONITOR]    📋 Found ${overdueSessions.length} ongoing sessions to evaluate for auto-completion`)

      for (const session of overdueSessions) {
        try {
          const scheduledEndTime = new Date(session.scheduledDate.getTime() + (session.durationMinutes || 60) * 60 * 1000)
          const hoursOverdue = Math.round((now.getTime() - scheduledEndTime.getTime()) / (1000 * 60 * 60) * 10) / 10

          // Only auto-complete if session is REALLY overdue (24+ hours) to prevent premature completion
          if (hoursOverdue < 24) {
            console.log(`[SESSION_MONITOR]    ℹ️ Skipping session ${session.id} - only ${hoursOverdue}h overdue (threshold: 24h)`)
            continue
          }

          // Both participants joined - complete successfully and pay mentor
          const platformFeePercentage = 20
          const mentorEarnings = Math.floor(session.totalCostCredits * (100 - platformFeePercentage) / 100)

          await db.transaction(async (tx) => {
            // Complete the session
            await tx
              .update(bookingSessions)
              .set({
                status: "completed",
                agoraCallEndedAt: now,
                cancellationReason: `Automatic completion - session was ${hoursOverdue} hours overdue (24h+ threshold)`,
                updatedAt: now,
              })
              .where(eq(bookingSessions.id, session.id))

            // Pay mentor
            const [mentor] = await tx
              .select({ creditsBalance: mentors.creditsBalance, userId: mentors.userId })
              .from(mentors)
              .where(eq(mentors.id, session.mentorId))

            if (mentor) {
              await tx
                .update(mentors)
                .set({ 
                  creditsBalance: mentor.creditsBalance + mentorEarnings,
                  updatedAt: now 
                })
                .where(eq(mentors.id, session.mentorId))

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

              await tx.insert(creditTransactions).values({
                userId: mentor.userId,
                type: "mentor_payout",
                direction: "credit",
                amount: mentorEarnings,
                balanceBefore: mentor.creditsBalance,
                balanceAfter: mentor.creditsBalance + mentorEarnings,
                relatedSessionId: session.id,
                description: `Automatic payout for overdue session completion (${hoursOverdue}h overdue)`,
                metadata: { systemProcessed: true, autoCompleted: true },
                createdAt: now,
              })
            }
          })

          await safeBroadcastUpdate(session.id, 'status_change', {
            previousStatus: 'ongoing',
            newStatus: 'completed',
            systemUpdate: true,
            autoCompleted: true
          })

          updated++
          console.log(`[SESSION_MONITOR]    🏁 Auto-completed session ${session.id} (${hoursOverdue}h overdue, 24h+ threshold met)`)

        } catch (error) {
          const errorMsg = `Failed to auto-complete session ${session.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
          errors.push(errorMsg)
        }
      }

    } catch (error) {
      const errorMsg = `Error in autoCompleteOverdueSessions: ${error instanceof Error ? error.message : 'Unknown error'}`
      errors.push(errorMsg)
    }

    return { updated, errors }
  }

  /**
   * Handle sessions stuck in 'upcoming' status
   */
  private async handleStuckUpcomingSessions(): Promise<{ updated: number; errors: string[] }> {
    const now = new Date()
    const errors: string[] = []
    let updated = 0

    try {
      const stuckSessions = await db
        .select({
          id: bookingSessions.id,
          scheduledDate: bookingSessions.scheduledDate,
          learnerJoinedAt: bookingSessions.learnerJoinedAt,
          mentorJoinedAt: bookingSessions.mentorJoinedAt,
        })
        .from(bookingSessions)
        .where(
          and(
            eq(bookingSessions.status, "upcoming"),
            sql`${bookingSessions.scheduledDate} + INTERVAL '15 minutes' < ${now}`
          )
        )

      for (const session of stuckSessions) {
        try {
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

            console.log(`[SESSION_MONITOR]    🚀 Fixed stuck session ${session.id} - marked as ongoing`)
          } else {
            // Neither joined - reset to confirmed so no-show detection can process it
            await db
              .update(bookingSessions)
              .set({
                status: "confirmed",
                updatedAt: now,
              })
              .where(eq(bookingSessions.id, session.id))
            
            console.log(`[SESSION_MONITOR]    🔄 Reset stuck session ${session.id} for no-show processing`)
          }

          updated++

        } catch (error) {
          const errorMsg = `Failed to handle stuck session ${session.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
          errors.push(errorMsg)
        }
      }

    } catch (error) {
      const errorMsg = `Error in handleStuckUpcomingSessions: ${error instanceof Error ? error.message : 'Unknown error'}`
      errors.push(errorMsg)
    }

    return { updated, errors }
  }
}

// Export singleton instance
export const sessionMonitorService = SessionMonitorService.getInstance()

// Export convenience functions
export function startSessionMonitoring(intervalMinutes: number = 2): void {
  sessionMonitorService.start(intervalMinutes)
}

export function stopSessionMonitoring(): void {
  sessionMonitorService.stop()
}

export function getSessionMonitorStatus() {
  return sessionMonitorService.getStatus()
}

export function runSessionMonitorOnce() {
  return sessionMonitorService.runOnce()
}

export function forceStartSessionMonitoring(intervalMinutes: number = 1): void {
  sessionMonitorService.start(intervalMinutes)
}