import { db } from "@/db"
import { bookingSessions, learners, mentors, creditTransactions, mentorPayouts, notifications, users } from "@/db/schema"
import { eq, and, or, lt, isNull } from "drizzle-orm"
import { broadcastSessionUpdate, broadcastForceDisconnect, broadcastBookingUpdate } from "@/app/api/sse/session-updates/route"
import { sessionCompletionService } from './SessionCompletionService'
import { sessionLogService } from './SessionLogService'
import { notificationService } from '../notifications/notification-service'

export class SessionMonitorService {
  private static instance: SessionMonitorService
  private intervalId: NodeJS.Timeout | null = null
  private isRunning = false
  private lastRunTime: Date | null = null
  private lastHealthCheck: Date | null = null
  private consecutiveErrors = 0
  private stats = {
    sessionsProcessed: 0,
    noShowsDetected: 0,
    sessionsCompleted: 0,
    expiredBookings: 0,
    errors: 0,
  }

  // Simple configuration
  private readonly CONFIG = {
    GRACE_PERIOD_MS: 20 * 60 * 1000, // 20 minutes grace period
    MIN_CONNECTION_TIME_MS: 2 * 60 * 1000, // 2 minutes minimum
    MAX_CONSECUTIVE_ERRORS: 5, // Stop service after 5 consecutive errors
    HEALTH_CHECK_INTERVAL_MS: 5 * 60 * 1000, // 5 minutes health check
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
      return
    }

    this.isRunning = true
    this.consecutiveErrors = 0
    this.lastHealthCheck = new Date()
    
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
      lastHealthCheck: this.lastHealthCheck,
      consecutiveErrors: this.consecutiveErrors,
      stats: { ...this.stats },
      isHealthy: this.isHealthy(),
    }
  }

  private isHealthy(): boolean {
    const now = new Date()
    const timeSinceLastRun = this.lastRunTime ? now.getTime() - this.lastRunTime.getTime() : Infinity
    const timeSinceHealthCheck = this.lastHealthCheck ? now.getTime() - this.lastHealthCheck.getTime() : Infinity
    
    return (
      this.consecutiveErrors < this.CONFIG.MAX_CONSECUTIVE_ERRORS &&
      timeSinceLastRun < 5 * 60 * 1000 && // Last run was within 5 minutes
      timeSinceHealthCheck < this.CONFIG.HEALTH_CHECK_INTERVAL_MS
    )
  }

  private async runMonitoring(): Promise<void> {
    try {
      this.lastRunTime = new Date()

      // Check if we should stop due to too many errors
      if (this.consecutiveErrors >= this.CONFIG.MAX_CONSECUTIVE_ERRORS) {
        console.error('[SESSION_MONITOR] Stopping service due to too many consecutive errors')
        this.stop()
        return
      }

      await this.processExpiredBookings()
      await this.updateToUpcoming()
      await this.detectNoShows()
      await this.completeFinishedSessions()

      // Reset error count on successful run
      this.consecutiveErrors = 0
      this.lastHealthCheck = new Date()
      this.stats.sessionsProcessed++
    } catch (error) {
      this.consecutiveErrors++
      this.stats.errors++
      console.error(`[SESSION_MONITOR] Error in monitoring cycle (${this.consecutiveErrors}/${this.CONFIG.MAX_CONSECUTIVE_ERRORS}):`, error)
      
      // If too many errors, stop the service
      if (this.consecutiveErrors >= this.CONFIG.MAX_CONSECUTIVE_ERRORS) {
        console.error('[SESSION_MONITOR] Maximum consecutive errors reached, stopping service')
        this.stop()
      }
    }
  }

  private async processExpiredBookings(): Promise<void> {
    try {
      const now = new Date()

      // Find pending bookings that are expired due to either:
      // 1. Past their expiry time (24 hours after booking)
      // 2. Session start time has passed without mentor response
      const expiredBookings = await db
        .select({
          id: bookingSessions.id,
          learnerId: bookingSessions.learnerId,
          mentorId: bookingSessions.mentorId,
          escrowCredits: bookingSessions.escrowCredits,
          expiresAt: bookingSessions.expiresAt,
          startTime: bookingSessions.startTime,
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
            or(
              lt(bookingSessions.expiresAt, now), // 24 hour expiry
              lt(bookingSessions.startTime, now)  // Session start time passed
            ),
            // Prevent reprocessing already handled bookings
            isNull(bookingSessions.refundProcessedAt)
          )
        )

      for (const booking of expiredBookings) {
        await db.transaction(async (tx) => {
          // Double-check booking hasn't been processed by another instance
          const [currentBooking] = await tx
            .select({ 
              status: bookingSessions.status, 
              refundProcessedAt: bookingSessions.refundProcessedAt 
            })
            .from(bookingSessions)
            .where(eq(bookingSessions.id, booking.id))
            .limit(1)

          if (currentBooking.status !== 'pending' || currentBooking.refundProcessedAt) {
            return
          }

          // Update booking status
          await tx
            .update(bookingSessions)
            .set({
              status: 'mentor_no_response',
              refundAmount: booking.escrowCredits,
              refundProcessedAt: now,
            })
            .where(eq(bookingSessions.id, booking.id))

          // Log the expiration
          await sessionLogService.logEvent({
            sessionId: booking.id,
            eventType: 'status_changed',
            actorType: 'system',
            oldStatus: 'pending',
            newStatus: 'mentor_no_response',
            description: `Booking expired - mentor did not respond within 24 hours`,
            metadata: {
              expiredReason: new Date() > booking.expiresAt ? '24-hour timeout' : 'session start time passed',
              refundAmount: booking.escrowCredits
            }
          })

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
          if (booking.learner && booking.mentor) {
            await tx.insert(notifications).values([
              {
                userId: booking.learner.userId,
                type: 'booking_expired',
                title: 'Booking Expired',
                message: `Your booking has expired as the mentor did not respond within 24 hours. You have been refunded ${booking.escrowCredits} credits.`,
                relatedEntityType: 'session',
                relatedEntityId: booking.id,
              },
              {
                userId: booking.mentor.userId,
                type: 'booking_expired',
                title: 'Booking Request Expired',
                message: 'A booking request has expired due to no response. Please respond promptly to future booking requests.',
                relatedEntityType: 'session',
                relatedEntityId: booking.id,
              }
            ])
          }
        })

        this.stats.expiredBookings++
        const expiredReason = new Date() > booking.expiresAt ? '24-hour timeout' : 'session start time passed'
        // Broadcast booking status update to affected users
        if (booking.learner && booking.mentor) {
          await broadcastBookingUpdate(
            booking.id,
            'status_changed',
            {
              newStatus: 'mentor_no_response',
              reason: expiredReason,
              refundAmount: booking.escrowCredits
            },
            [booking.learner.userId, booking.mentor.userId]
          )
        }
      }
    } catch (error) {
      console.error('[SESSION_MONITOR] Error processing expired bookings:', error)
    }
  }

  private async updateToUpcoming(): Promise<void> {
    try {
      const now = new Date()
      const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000)

      // First get the sessions that will be updated
      const sessionsToUpdate = await db
        .select({
          sessionId: bookingSessions.id,
          startTime: bookingSessions.startTime,
          skillName: bookingSessions.skillName,
          learnerUserId: learners.userId,
          mentorUserId: mentors.userId,
        })
        .from(bookingSessions)
        .leftJoin(learners, eq(bookingSessions.learnerId, learners.id))
        .leftJoin(mentors, eq(bookingSessions.mentorId, mentors.id))
        .where(
          and(
            eq(bookingSessions.status, 'confirmed'),
            lt(bookingSessions.startTime, thirtyMinutesFromNow)
          )
        )

      // Get mentor and learner names for each session
      const enrichedSessions = await Promise.all(
        sessionsToUpdate.map(async (session) => {
          const [mentorUser, learnerUser] = await Promise.all([
            session.mentorUserId
              ? db.select({ firstName: users.firstName, lastName: users.lastName })
                  .from(users)
                  .where(eq(users.id, session.mentorUserId))
                  .limit(1)
              : Promise.resolve([null]),
            session.learnerUserId
              ? db.select({ firstName: users.firstName, lastName: users.lastName })
                  .from(users)
                  .where(eq(users.id, session.learnerUserId))
                  .limit(1)
              : Promise.resolve([null])
          ])

          return {
            ...session,
            mentorName: mentorUser[0] ? `${mentorUser[0].firstName} ${mentorUser[0].lastName}` : undefined,
            learnerName: learnerUser[0] ? `${learnerUser[0].firstName} ${learnerUser[0].lastName}` : undefined,
          }
        })
      )

      // Update status to upcoming
      await db
        .update(bookingSessions)
        .set({ status: 'upcoming' })
        .where(
          and(
            eq(bookingSessions.status, 'confirmed'),
            lt(bookingSessions.startTime, thirtyMinutesFromNow)
          )
        )

      // Send reminder notifications for each session
      for (const session of enrichedSessions) {
        if (session.learnerUserId && session.mentorUserId && session.startTime) {
          // Send reminder to learner
          await notificationService.createSessionReminder(
            session.learnerUserId,
            session.sessionId,
            new Date(session.startTime),
            true, // isLearner
            session.mentorName || 'your mentor',
            session.skillName || undefined
          )

          // Send reminder to mentor
          await notificationService.createSessionReminder(
            session.mentorUserId,
            session.sessionId,
            new Date(session.startTime),
            false, // isLearner
            undefined,
            session.skillName || undefined
          )
        }
      }
    } catch (error) {
      console.error('[SESSION_MONITOR] Error updating to upcoming status:', error)
    }
  }

  private async detectNoShows(): Promise<void> {
    try {
      const now = new Date()
      const graceTime = new Date(now.getTime() - this.CONFIG.GRACE_PERIOD_MS)

      const sessions = await db
        .select({
          id: bookingSessions.id,
          learnerId: bookingSessions.learnerId,
          mentorId: bookingSessions.mentorId,
          startTime: bookingSessions.startTime,
          totalCostCredits: bookingSessions.totalCostCredits,
          escrowCredits: bookingSessions.escrowCredits,
          learnerJoinedAt: bookingSessions.learnerJoinedAt,
          mentorJoinedAt: bookingSessions.mentorJoinedAt,
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
            or(
              eq(bookingSessions.status, 'confirmed'),
              eq(bookingSessions.status, 'upcoming')
            ),
            lt(bookingSessions.startTime, graceTime),
            isNull(bookingSessions.noShowCheckedAt)
          )
        )

      for (const session of sessions) {
        // Use connection logs to determine actual participation
        // This handles rapid join/leave cycles correctly
        const learnerTotalTime = session.learner
          ? await sessionLogService.getTotalConnectionTime(session.id, session.learner.userId)
          : 0
        const mentorTotalTime = session.mentor
          ? await sessionLogService.getTotalConnectionTime(session.id, session.mentor.userId)
          : 0

        // Consider someone as "joined" if they spent at least 2 minutes in the call
        // This prevents gaming the system by joining and immediately leaving
        const learnerActuallyJoined = learnerTotalTime >= this.CONFIG.MIN_CONNECTION_TIME_MS
        const mentorActuallyJoined = mentorTotalTime >= this.CONFIG.MIN_CONNECTION_TIME_MS

        let noShowType: 'both_no_show' | 'mentor_no_show' | 'learner_no_show' | null = null

        if (!learnerActuallyJoined && !mentorActuallyJoined) {
          noShowType = 'both_no_show'
        } else if (learnerActuallyJoined && !mentorActuallyJoined) {
          noShowType = 'mentor_no_show'
        } else if (!learnerActuallyJoined && mentorActuallyJoined) {
          noShowType = 'learner_no_show'
        }

        if (noShowType) {
          await this.processNoShow(session, noShowType)
          this.stats.noShowsDetected++
        } else {
          // Both users participated sufficiently - mark as checked
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

        // Double-check session hasn't been processed already
        const [currentSession] = await tx
          .select({ 
            status: bookingSessions.status,
            noShowCheckedAt: bookingSessions.noShowCheckedAt
          })
          .from(bookingSessions)
          .where(eq(bookingSessions.id, session.id))
          .limit(1)

        if (currentSession.status !== null && (currentSession.noShowCheckedAt || 
            ['completed', 'cancelled', 'both_no_show', 'mentor_no_show', 'learner_no_show'].includes(currentSession.status))) {
          return
        }

        // Update session status
        await tx
          .update(bookingSessions)
          .set({
            status: noShowType,
            noShowCheckedAt: now,
            agoraCallEndedAt: now,
          })
          .where(eq(bookingSessions.id, session.id))

        // Log the no-show detection
        await sessionLogService.logEvent({
          sessionId: session.id,
          eventType: 'no_show_detected',
          actorType: 'system',
          oldStatus: 'upcoming',
          newStatus: noShowType,
          description: `No-show detected: ${noShowType.replace('_', ' ')}`,
          metadata: {
            noShowType,
            gracePeriodMinutes: this.CONFIG.GRACE_PERIOD_MS / 60000
          }
        })

        // Handle financial processing based on no-show type
        if (noShowType === 'both_no_show' || noShowType === 'mentor_no_show') {
          // Refund learner 100%
          if (session.learner && session.escrowCredits > 0) {
            await tx
              .update(learners)
              .set({ 
                creditsBalance: session.learner.creditsBalance + session.escrowCredits 
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
              userId: session.learner.userId,
              type: 'session_refund',
              direction: 'credit',
              amount: session.escrowCredits,
              balanceBefore: session.learner.creditsBalance,
              balanceAfter: session.learner.creditsBalance + session.escrowCredits,
              relatedSessionId: session.id,
              description: `Refund for session #${session.id} due to ${noShowType}`,
              metadata: { noShowType },
            })
          }

        } else if (noShowType === 'learner_no_show') {
          // Pay mentor 100% as compensation for showing up
          if (session.mentor && session.totalCostCredits > 0) {
            await tx
              .update(mentors)
              .set({ 
                creditsBalance: session.mentor.creditsBalance + session.totalCostCredits 
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
              userId: session.mentor.userId,
              type: 'session_payment',
              direction: 'credit',
              amount: session.totalCostCredits,
              balanceBefore: session.mentor.creditsBalance,
              balanceAfter: session.mentor.creditsBalance + session.totalCostCredits,
              relatedSessionId: session.id,
              description: `Compensation for session #${session.id} (learner no-show)`,
              metadata: { noShowType },
            })
          }
        }

        // Send appropriate notifications
        const notificationData = []
        
        if (noShowType === 'both_no_show' && session.learner && session.mentor) {
          notificationData.push(
            {
              userId: session.learner.userId,
              type: 'session_no_show',
              title: 'Session No-Show',
              message: `Your session was cancelled due to both parties not joining. You have been refunded ${session.escrowCredits} credits.`,
              relatedEntityType: 'session' as const,
              relatedEntityId: session.id,
            },
            {
              userId: session.mentor.userId,
              type: 'session_no_show',
              title: 'Session No-Show',
              message: 'The session was cancelled as neither party joined within the grace period.',
              relatedEntityType: 'session' as const,
              relatedEntityId: session.id,
            }
          )
        } else if (noShowType === 'mentor_no_show' && session.learner && session.mentor) {
          notificationData.push(
            {
              userId: session.learner.userId,
              type: 'session_no_show',
              title: 'Mentor No-Show',
              message: `Your mentor did not join the session. You have been fully refunded ${session.escrowCredits} credits.`,
              relatedEntityType: 'session' as const,
              relatedEntityId: session.id,
            },
            {
              userId: session.mentor.userId,
              type: 'session_no_show',
              title: 'Session Missed',
              message: 'You missed your scheduled session. Please be punctual for future sessions.',
              relatedEntityType: 'session' as const,
              relatedEntityId: session.id,
            }
          )
        } else if (noShowType === 'learner_no_show' && session.learner && session.mentor) {
          notificationData.push(
            {
              userId: session.learner.userId,
              type: 'session_no_show',
              title: 'Session Missed',
              message: 'You missed your scheduled session and have been charged. Please join sessions on time.',
              relatedEntityType: 'session' as const,
              relatedEntityId: session.id,
            },
            {
              userId: session.mentor.userId,
              type: 'session_no_show',
              title: 'Session Compensation',
              message: `You have been compensated ${session.totalCostCredits} credits for the learner's no-show.`,
              relatedEntityType: 'session' as const,
              relatedEntityId: session.id,
            }
          )
        }

        if (notificationData.length > 0) {
          await tx.insert(notifications).values(notificationData)
        }
      })

      // Broadcast force disconnect to remove any participants still in the room
      if (session.learner && session.mentor) {
        await broadcastForceDisconnect(
          session.id,
          `Session ended due to ${noShowType.replace('_', ' ')}`,
          [session.learner.userId, session.mentor.userId]
        )
      }

      } catch (error) {
      console.error(`[SESSION_MONITOR] Error processing ${noShowType} for session ${session.id}:`, error)
    }
  }

  private async completeFinishedSessions(): Promise<void> {
    try {
      const now = new Date()

      const sessions = await db
        .select({
          id: bookingSessions.id,
          status: bookingSessions.status,
          learner: {
            userId: learners.userId,
          },
          mentor: {
            userId: mentors.userId,
          },
        })
        .from(bookingSessions)
        .leftJoin(learners, eq(bookingSessions.learnerId, learners.id))
        .leftJoin(mentors, eq(bookingSessions.mentorId, mentors.id))
        .where(
          and(
            or(
              eq(bookingSessions.status, 'ongoing'),
              eq(bookingSessions.status, 'upcoming'),
              eq(bookingSessions.status, 'confirmed')
            ),
            lt(bookingSessions.endTime, now)
          )
        )

      for (const session of sessions) {
        try {
          // Log if completing a session that wasn't in 'ongoing' status
          if (session.status !== 'ongoing') {
            console.log(`[SESSION_MONITOR] Completing session ${session.id} stuck in '${session.status}' status`)
          }

          const result = await sessionCompletionService.completeSession({
            sessionId: session.id,
            reason: 'time_expired',
            completedBy: 'system_timer'
          })

          if (result.success && !result.alreadyCompleted) {
            this.stats.sessionsCompleted++

            if (session.learner && session.mentor) {
              await broadcastSessionUpdate(
                session.id,
                'session_terminated',
                { reason: 'Session time ended' },
                [session.learner.userId, session.mentor.userId]
              )
            }
          }
        } catch (error) {
          console.error(`[SESSION_MONITOR] Error completing session ${session.id}:`, error)
        }
      }
    } catch (error) {
      console.error('[SESSION_MONITOR] Error completing sessions:', error)
    }
  }
}

// Export singleton instance
export const sessionMonitorService = SessionMonitorService.getInstance()