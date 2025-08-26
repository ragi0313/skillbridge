import { db } from "@/db"
import { bookingSessions, learners, mentors, creditTransactions, mentorPayouts, notifications } from "@/db/schema"
import { eq, and, or, lt, isNull, sql } from "drizzle-orm"
import { broadcastSessionUpdate, broadcastForceDisconnect } from "@/app/api/sse/session-updates/route"

export class SessionMonitorService {
  private static instance: SessionMonitorService
  private intervalId: NodeJS.Timeout | null = null
  private isRunning = false
  private lastRunTime: Date | null = null
  private stats = {
    sessionsProcessed: 0,
    noShowsDetected: 0,
    sessionsCompleted: 0,
    expiredBookings: 0,
  }

  private constructor() {}

  static getInstance(): SessionMonitorService {
    if (!SessionMonitorService.instance) {
      SessionMonitorService.instance = new SessionMonitorService()
    }
    return SessionMonitorService.instance
  }

  start(): void {
    if (this.isRunning) {
      console.log('[SESSION_MONITOR] Service already running')
      return
    }

    console.log('[SESSION_MONITOR] Starting session monitoring service')
    this.isRunning = true
    
    // Run immediately on start
    this.runMonitoring()

    // Then run every 2 minutes
    this.intervalId = setInterval(() => {
      this.runMonitoring()
    }, 2 * 60 * 1000) // 2 minutes
  }

  stop(): void {
    if (!this.isRunning) {
      return
    }

    console.log('[SESSION_MONITOR] Stopping session monitoring service')
    this.isRunning = false
    
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRunTime: this.lastRunTime,
      stats: { ...this.stats },
    }
  }

  private async runMonitoring(): Promise<void> {
    try {
      console.log('[SESSION_MONITOR] Running monitoring cycle...')
      this.lastRunTime = new Date()

      await this.processExpiredBookings()
      await this.processPendingAtStartTime()
      await this.updateToUpcomingStatus()
      await this.detectNoShows()
      await this.completeSessionsAtEndTime()
      await this.handleStuckSessions()

      console.log('[SESSION_MONITOR] Monitoring cycle completed', this.stats)
    } catch (error) {
      console.error('[SESSION_MONITOR] Error in monitoring cycle:', error)
    }
  }

  private async processExpiredBookings(): Promise<void> {
    try {
      const now = new Date()
      
      // Find pending bookings past their expiry time (24 hours)
      const expiredBookings = await db
        .select({
          id: bookingSessions.id,
          learnerId: bookingSessions.learnerId,
          mentorId: bookingSessions.mentorId,
          escrowCredits: bookingSessions.escrowCredits,
          expiresAt: bookingSessions.expiresAt,
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
        .where(
          and(
            eq(bookingSessions.status, 'pending'),
            lt(bookingSessions.expiresAt, now)
          )
        )

      for (const booking of expiredBookings) {
        await db.transaction(async (tx) => {
          // Update booking status
          await tx
            .update(bookingSessions)
            .set({
              status: 'mentor_no_response',
              refundAmount: booking.escrowCredits,
              refundProcessedAt: now,
            })
            .where(eq(bookingSessions.id, booking.id))

          // Refund learner
          if (booking.learner && booking.escrowCredits > 0) {
            await tx
              .update(learners)
              .set({ 
                creditsBalance: booking.learner.creditsBalance + booking.escrowCredits 
              })
              .where(eq(learners.id, booking.learnerId))

            // Record refund transaction
            await tx.insert(creditTransactions).values({
              userId: booking.learner.userId,
              type: 'session_refund',
              direction: 'credit',
              amount: booking.escrowCredits,
              balanceBefore: booking.learner.creditsBalance,
              balanceAfter: booking.learner.creditsBalance + booking.escrowCredits,
              relatedSessionId: booking.id,
              description: `Refund for expired booking #${booking.id} (mentor did not respond)`,
              metadata: { reason: 'mentor_no_response' },
            })
          }

          // Send notifications
          await tx.insert(notifications).values([
            {
              userId: booking.learner!.userId,
              type: 'booking_expired',
              title: 'Booking Expired',
              message: `Your booking has expired as the mentor did not respond within 24 hours. You have been refunded ${booking.escrowCredits} credits.`,
              relatedEntityType: 'session',
              relatedEntityId: booking.id,
            },
            {
              userId: booking.mentor!.userId,
              type: 'booking_expired',
              title: 'Booking Request Expired',
              message: 'A booking request has expired due to no response. Please respond promptly to future booking requests.',
              relatedEntityType: 'session',
              relatedEntityId: booking.id,
            }
          ])
        })

        this.stats.expiredBookings++
        console.log(`[SESSION_MONITOR] Processed expired booking ${booking.id}`)
      }
    } catch (error) {
      console.error('[SESSION_MONITOR] Error processing expired bookings:', error)
    }
  }

  private async processPendingAtStartTime(): Promise<void> {
    try {
      const now = new Date()
      
      // Find pending sessions that have reached their start time (mentor didn't respond)
      const pendingAtStartTime = await db
        .select({
          id: bookingSessions.id,
          learnerId: bookingSessions.learnerId,
          mentorId: bookingSessions.mentorId,
          startTime: bookingSessions.startTime,
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
        .where(
          and(
            eq(bookingSessions.status, 'pending'),
            lt(bookingSessions.startTime, now) // Start time has passed
          )
        )

      for (const booking of pendingAtStartTime) {
        await db.transaction(async (tx) => {
          // Update booking status to mentor_no_response
          await tx
            .update(bookingSessions)
            .set({
              status: 'mentor_no_response',
              refundAmount: booking.escrowCredits,
              refundProcessedAt: now,
            })
            .where(eq(bookingSessions.id, booking.id))

          // Refund learner
          if (booking.learner && booking.escrowCredits > 0) {
            await tx
              .update(learners)
              .set({ 
                creditsBalance: booking.learner.creditsBalance + booking.escrowCredits 
              })
              .where(eq(learners.id, booking.learnerId))

            // Record refund transaction
            await tx.insert(creditTransactions).values({
              userId: booking.learner.userId,
              type: 'session_refund',
              direction: 'credit',
              amount: booking.escrowCredits,
              balanceBefore: booking.learner.creditsBalance,
              balanceAfter: booking.learner.creditsBalance + booking.escrowCredits,
              relatedSessionId: booking.id,
              description: `Refund for session #${booking.id} (mentor did not respond by start time)`,
              metadata: { reason: 'mentor_no_response_at_start_time' },
            })
          }

          // Send notifications
          await tx.insert(notifications).values([
            {
              userId: booking.learner!.userId,
              type: 'session_cancelled',
              title: 'Session Cancelled - No Mentor Response',
              message: `Your session was cancelled as the mentor did not respond by the start time. You have been refunded ${booking.escrowCredits} credits.`,
              relatedEntityType: 'session',
              relatedEntityId: booking.id,
            },
            {
              userId: booking.mentor!.userId,
              type: 'session_missed',
              title: 'Session Missed - No Response',
              message: 'You missed a session by not responding to the booking request before the start time. Please respond promptly to future requests.',
              relatedEntityType: 'session',
              relatedEntityId: booking.id,
            }
          ])
        })

        this.stats.expiredBookings++
        console.log(`[SESSION_MONITOR] Processed pending session ${booking.id} that reached start time without mentor response`)
      }
    } catch (error) {
      console.error('[SESSION_MONITOR] Error processing pending sessions at start time:', error)
    }
  }

  private async updateToUpcomingStatus(): Promise<void> {
    try {
      const now = new Date()
      const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000)
      
      // Find confirmed sessions that should be updated to upcoming (30 min before start)
      const sessionsToUpdate = await db
        .select({
          id: bookingSessions.id,
          startTime: bookingSessions.startTime,
        })
        .from(bookingSessions)
        .where(
          and(
            eq(bookingSessions.status, 'confirmed'),
            lt(bookingSessions.startTime, thirtyMinutesFromNow)
          )
        )

      for (const session of sessionsToUpdate) {
        await db
          .update(bookingSessions)
          .set({ status: 'upcoming' })
          .where(eq(bookingSessions.id, session.id))

        console.log(`[SESSION_MONITOR] Updated session ${session.id} to upcoming status`)
      }
    } catch (error) {
      console.error('[SESSION_MONITOR] Error updating to upcoming status:', error)
    }
  }

  private async detectNoShows(): Promise<void> {
    try {
      const now = new Date()
      
      // Find sessions past their grace period (15 minutes after start)
      const potentialNoShows = await db
        .select({
          id: bookingSessions.id,
          learnerId: bookingSessions.learnerId,
          mentorId: bookingSessions.mentorId,
          startTime: bookingSessions.startTime,
          totalCostCredits: bookingSessions.totalCostCredits,
          escrowCredits: bookingSessions.escrowCredits,
          learnerJoinedAt: bookingSessions.learnerJoinedAt,
          mentorJoinedAt: bookingSessions.mentorJoinedAt,
          learnerLeftAt: bookingSessions.learnerLeftAt,
          mentorLeftAt: bookingSessions.mentorLeftAt,
          learner: {
            id: learners.id,
            userId: learners.userId,
            creditsBalance: learners.creditsBalance,
          },
          mentor: {
            id: mentors.id,
            userId: mentors.userId,
            creditsBalance: mentors.creditsBalance,
          },
        })
        .from(bookingSessions)
        .leftJoin(learners, eq(bookingSessions.learnerId, learners.id))
        .leftJoin(mentors, eq(bookingSessions.mentorId, mentors.id))
        .where(
          and(
            or(eq(bookingSessions.status, 'confirmed'), eq(bookingSessions.status, 'upcoming')),
            lt(sql`${bookingSessions.startTime} + INTERVAL '15 minutes'`, now),
            isNull(bookingSessions.noShowCheckedAt) // Only process once
          )
        )

      for (const session of potentialNoShows) {
        const noShowType = this.determineNoShowType(session)
        if (noShowType) {
          await this.processNoShow(session, noShowType)
          this.stats.noShowsDetected++
        } else {
          // Mark as checked even if no no-show to avoid reprocessing
          await db
            .update(bookingSessions)
            .set({ noShowCheckedAt: now })
            .where(eq(bookingSessions.id, session.id))
        }
      }
    } catch (error) {
      console.error('[SESSION_MONITOR] Error detecting no-shows:', error)
    }
  }

  private determineNoShowType(session: {
    learnerJoinedAt: Date | null
    mentorJoinedAt: Date | null
    learnerLeftAt: Date | null
    mentorLeftAt: Date | null
  }): 'both_no_show' | 'mentor_no_show' | 'learner_no_show' | null {
    // Check if users actually joined the session (not just briefly connected and left)
    const learnerJoined = !!session.learnerJoinedAt
    const mentorJoined = !!session.mentorJoinedAt
    
    // Consider minimum connection time to avoid marking brief connections as "joined"
    const minConnectionTimeMs = 30 * 1000 // 30 seconds minimum connection
    const learnerConnectedLongEnough = learnerJoined && (
      !session.learnerLeftAt || 
      (session.learnerLeftAt.getTime() - session.learnerJoinedAt!.getTime()) >= minConnectionTimeMs
    )
    const mentorConnectedLongEnough = mentorJoined && (
      !session.mentorLeftAt || 
      (session.mentorLeftAt.getTime() - session.mentorJoinedAt!.getTime()) >= minConnectionTimeMs
    )

    if (!learnerConnectedLongEnough && !mentorConnectedLongEnough) {
      return 'both_no_show'
    } else if (learnerConnectedLongEnough && !mentorConnectedLongEnough) {
      return 'mentor_no_show'
    } else if (!learnerConnectedLongEnough && mentorConnectedLongEnough) {
      return 'learner_no_show'
    }
    
    return null // Both joined and connected for sufficient time
  }

  private async processNoShow(session: {
    id: number
    learnerId: number
    mentorId: number
    totalCostCredits: number
    escrowCredits: number
    learner: { id: number; userId: number; creditsBalance: number } | null
    mentor: { id: number; userId: number; creditsBalance: number } | null
  }, noShowType: 'both_no_show' | 'mentor_no_show' | 'learner_no_show'): Promise<void> {
    try {
      await db.transaction(async (tx) => {
        const now = new Date()

        // Update session status
        await tx
          .update(bookingSessions)
          .set({
            status: noShowType,
            noShowCheckedAt: now,
            agoraCallEndedAt: now,
          })
          .where(eq(bookingSessions.id, session.id))

        // Handle financial processing based on no-show type
        if (noShowType === 'both_no_show' || noShowType === 'mentor_no_show') {
          // Refund learner 100%
          await tx
            .update(learners)
            .set({ 
              creditsBalance: session.learner!.creditsBalance + session.escrowCredits 
            })
            .where(eq(learners.id, session.learnerId))

          // Update session with refund info
          await tx
            .update(bookingSessions)
            .set({
              refundAmount: session.escrowCredits,
              refundProcessedAt: now,
            })
            .where(eq(bookingSessions.id, session.id))

          // Record refund transaction
          await tx.insert(creditTransactions).values({
            userId: session.learner!.userId,
            type: 'session_refund',
            direction: 'credit',
            amount: session.escrowCredits,
            balanceBefore: session.learner!.creditsBalance,
            balanceAfter: session.learner!.creditsBalance + session.escrowCredits,
            relatedSessionId: session.id,
            description: `Refund for session #${session.id} due to ${noShowType}`,
            metadata: { noShowType },
          })

        } else if (noShowType === 'learner_no_show') {
          // Pay mentor 100% as compensation for showing up
          await tx
            .update(mentors)
            .set({ 
              creditsBalance: session.mentor!.creditsBalance + session.totalCostCredits 
            })
            .where(eq(mentors.id, session.mentorId))

          // Record mentor payout (100% due to learner no-show)
          await tx.insert(mentorPayouts).values({
            mentorId: session.mentorId,
            sessionId: session.id,
            earnedCredits: session.totalCostCredits,
            platformFeeCredits: 0,
            feePercentage: 0,
            status: 'released',
            releasedAt: now,
          })

          // Record credit transaction
          await tx.insert(creditTransactions).values({
            userId: session.mentor!.userId,
            type: 'session_payment',
            direction: 'credit',
            amount: session.totalCostCredits,
            balanceBefore: session.mentor!.creditsBalance,
            balanceAfter: session.mentor!.creditsBalance + session.totalCostCredits,
            relatedSessionId: session.id,
            description: `Compensation for session #${session.id} (learner no-show)`,
            metadata: { noShowType },
          })
        }

        // Send appropriate notifications
        const notificationData = []
        
        if (noShowType === 'both_no_show') {
          notificationData.push(
            {
              userId: session.learner!.userId,
              type: 'session_no_show',
              title: 'Session No-Show',
              message: `Your session was cancelled due to both parties not joining. You have been refunded ${session.escrowCredits} credits.`,
              relatedEntityType: 'session' as const,
              relatedEntityId: session.id,
            },
            {
              userId: session.mentor!.userId,
              type: 'session_no_show',
              title: 'Session No-Show',
              message: 'The session was cancelled as neither party joined within the grace period.',
              relatedEntityType: 'session' as const,
              relatedEntityId: session.id,
            }
          )
        } else if (noShowType === 'mentor_no_show') {
          notificationData.push(
            {
              userId: session.learner!.userId,
              type: 'session_no_show',
              title: 'Mentor No-Show',
              message: `Your mentor did not join the session. You have been fully refunded ${session.escrowCredits} credits.`,
              relatedEntityType: 'session' as const,
              relatedEntityId: session.id,
            },
            {
              userId: session.mentor!.userId,
              type: 'session_no_show',
              title: 'Session Missed',
              message: 'You missed your scheduled session. Please be punctual for future sessions.',
              relatedEntityType: 'session' as const,
              relatedEntityId: session.id,
            }
          )
        } else if (noShowType === 'learner_no_show') {
          notificationData.push(
            {
              userId: session.learner!.userId,
              type: 'session_no_show',
              title: 'Session Missed',
              message: 'You missed your scheduled session and have been charged. Please join sessions on time.',
              relatedEntityType: 'session' as const,
              relatedEntityId: session.id,
            },
            {
              userId: session.mentor!.userId,
              type: 'session_no_show',
              title: 'Session Compensation',
              message: `You have been compensated ${session.totalCostCredits} credits for the learner's no-show.`,
              relatedEntityType: 'session' as const,
              relatedEntityId: session.id,
            }
          )
        }

        await tx.insert(notifications).values(notificationData)
      })

      // Broadcast force disconnect to remove any participants still in the room
      await broadcastForceDisconnect(
        session.id,
        `Session ended due to ${noShowType.replace('_', ' ')}`,
        [session.learner!.userId, session.mentor!.userId]
      )

      console.log(`[SESSION_MONITOR] Processed ${noShowType} for session ${session.id}`)

    } catch (error) {
      console.error(`[SESSION_MONITOR] Error processing ${noShowType} for session ${session.id}:`, error)
    }
  }

  private async completeSessionsAtEndTime(): Promise<void> {
    try {
      const now = new Date()
      
      // Find ongoing sessions that have reached their end time
      const sessionsToComplete = await db
        .select({
          id: bookingSessions.id,
          learnerId: bookingSessions.learnerId,
          mentorId: bookingSessions.mentorId,
          endTime: bookingSessions.endTime,
          totalCostCredits: bookingSessions.totalCostCredits,
          learner: {
            id: learners.id,
            userId: learners.userId,
          },
          mentor: {
            id: mentors.id,
            userId: mentors.userId,
            creditsBalance: mentors.creditsBalance,
          },
        })
        .from(bookingSessions)
        .leftJoin(learners, eq(bookingSessions.learnerId, learners.id))
        .leftJoin(mentors, eq(bookingSessions.mentorId, mentors.id))
        .where(
          and(
            eq(bookingSessions.status, 'ongoing'),
            lt(bookingSessions.endTime, now)
          )
        )

      for (const session of sessionsToComplete) {
        await db.transaction(async (tx) => {
          const completionTime = new Date()

          // Update session status
          await tx
            .update(bookingSessions)
            .set({
              status: 'completed',
              agoraCallEndedAt: completionTime,
            })
            .where(eq(bookingSessions.id, session.id))

          // Pay mentor (80%) and platform fee (20%)
          const mentorEarnings = Math.floor(session.totalCostCredits * 0.8)
          const platformFee = session.totalCostCredits - mentorEarnings

          // Add credits to mentor balance
          await tx
            .update(mentors)
            .set({ 
              creditsBalance: session.mentor!.creditsBalance + mentorEarnings 
            })
            .where(eq(mentors.id, session.mentorId))

          // Record mentor payout
          await tx.insert(mentorPayouts).values({
            mentorId: session.mentorId,
            sessionId: session.id,
            earnedCredits: mentorEarnings,
            platformFeeCredits: platformFee,
            feePercentage: 20,
            status: 'released',
            releasedAt: completionTime,
          })

          // Record credit transaction
          await tx.insert(creditTransactions).values({
            userId: session.mentor!.userId,
            type: 'session_payment',
            direction: 'credit',
            amount: mentorEarnings,
            balanceBefore: session.mentor!.creditsBalance,
            balanceAfter: session.mentor!.creditsBalance + mentorEarnings,
            relatedSessionId: session.id,
            description: `Payment for completed session #${session.id}`,
            metadata: { 
              platformFee, 
              originalAmount: session.totalCostCredits,
              completedBy: 'system_timer'
            },
          })

          // Send notifications
          await tx.insert(notifications).values([
            {
              userId: session.mentor!.userId,
              type: 'session_completed',
              title: 'Session Completed!',
              message: `Your session has been completed. You earned ${mentorEarnings} credits.`,
              relatedEntityType: 'session',
              relatedEntityId: session.id,
            },
            {
              userId: session.learner!.userId,
              type: 'session_completed',
              title: 'Session Completed!',
              message: 'Your session has been completed. Please rate your mentor!',
              relatedEntityType: 'session',
              relatedEntityId: session.id,
            }
          ])
        })

        // Broadcast session termination
        await broadcastSessionUpdate(
          session.id,
          'session_terminated',
          { 
            reason: 'Session time ended',
            completedBy: 'system_timer'
          },
          [session.learner!.userId, session.mentor!.userId]
        )

        this.stats.sessionsCompleted++
        console.log(`[SESSION_MONITOR] Auto-completed session ${session.id}`)
      }
    } catch (error) {
      console.error('[SESSION_MONITOR] Error completing sessions at end time:', error)
    }
  }

  private async handleStuckSessions(): Promise<void> {
    try {
      const now = new Date()
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
      
      // Find sessions stuck in 'upcoming' status for more than 1 hour
      const stuckSessions = await db
        .select({
          id: bookingSessions.id,
          startTime: bookingSessions.startTime,
          endTime: bookingSessions.endTime,
        })
        .from(bookingSessions)
        .where(
          and(
            eq(bookingSessions.status, 'upcoming'),
            lt(bookingSessions.startTime, oneHourAgo)
          )
        )

      for (const session of stuckSessions) {
        // If session is past its end time, mark as no-show
        // If still within session time, continue monitoring
        if (now > new Date(session.endTime!)) {
          await db
            .update(bookingSessions)
            .set({
              status: 'both_no_show',
              noShowCheckedAt: now,
              agoraCallEndedAt: now,
            })
            .where(eq(bookingSessions.id, session.id))

          console.log(`[SESSION_MONITOR] Fixed stuck session ${session.id} - marked as both_no_show`)
        }
      }
    } catch (error) {
      console.error('[SESSION_MONITOR] Error handling stuck sessions:', error)
    }
  }
}

// Export singleton instance
export const sessionMonitorService = SessionMonitorService.getInstance()