import { db } from "@/db"
import { bookingSessions, learners, mentors, creditTransactions, mentorPayouts, notifications } from "@/db/schema"
import { eq, and, or, lt, isNull, gt } from "drizzle-orm"
import { broadcastSessionUpdate, broadcastForceDisconnect } from "@/app/api/sse/session-updates/route"
import { sessionCompletionService } from './SessionCompletionService'

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
    antiGamingDetections: 0,
    sustainedConnectionUpgrades: 0,
  }

  // Anti-Gaming Configuration
  private readonly ANTI_GAMING_CONFIG = {
    MINIMUM_CONNECTION_TIME_MS: 2 * 60 * 1000, // 2 minutes minimum connection
    MINIMUM_PARTICIPATION_PERCENTAGE: 0.10, // 10% of session duration
    MAX_LATE_JOIN_MS: 10 * 60 * 1000, // Max 10 minutes late
    MIN_COMPLETION_PERCENTAGE: 0.25, // Must stay for 25% of session
    SUSTAINED_CONNECTION_TIME_MS: 30 * 1000, // 30 seconds for ongoing status
    GRACE_PERIOD_MS: 20 * 60 * 1000, // 20 minutes grace period
    MAX_INACTIVITY_MS: 10 * 60 * 1000, // 10 minutes max inactivity
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
      antiGamingConfig: { ...this.ANTI_GAMING_CONFIG },
    }
  }

  // Get anti-gaming configuration for debugging/monitoring
  getAntiGamingConfig() {
    return { ...this.ANTI_GAMING_CONFIG }
  }

  private async runMonitoring(): Promise<void> {
    try {
      console.log('[SESSION_MONITOR] Running monitoring cycle...')
      this.lastRunTime = new Date()

      await this.processExpiredBookings()
      await this.processPendingAtStartTime()
      await this.updateToUpcomingStatus()
      await this.updateConfirmedToOngoing()
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
            lt(bookingSessions.expiresAt, now),
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
            console.log(`[SESSION_MONITOR] Booking ${booking.id} already processed, skipping`)
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
          refundProcessedAt: bookingSessions.refundProcessedAt,
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
            lt(bookingSessions.startTime, now),
            isNull(bookingSessions.refundProcessedAt) // Prevent duplicate processing
          )
        )

      for (const booking of pendingAtStartTime) {
        await db.transaction(async (tx) => {
          // Double-check booking hasn't been processed
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
          if (booking.learner && booking.mentor) {
            await tx.insert(notifications).values([
              {
                userId: booking.learner.userId,
                type: 'session_cancelled',
                title: 'Session Cancelled - No Mentor Response',
                message: `Your session was cancelled as the mentor did not respond by the start time. You have been refunded ${booking.escrowCredits} credits.`,
                relatedEntityType: 'session',
                relatedEntityId: booking.id,
              },
              {
                userId: booking.mentor.userId,
                type: 'session_missed',
                title: 'Session Missed - No Response',
                message: 'You missed a session by not responding to the booking request before the start time. Please respond promptly to future requests.',
                relatedEntityType: 'session',
                relatedEntityId: booking.id,
              }
            ])
          }
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

  private async updateConfirmedToOngoing(): Promise<void> {
    try {
      const now = new Date()
      
      // Find confirmed or upcoming sessions that should be marked as ongoing 
      // (both users have joined and sustained connection)
      const sessionsToUpdate = await db
        .select({
          id: bookingSessions.id,
          startTime: bookingSessions.startTime,
          learnerJoinedAt: bookingSessions.learnerJoinedAt,
          mentorJoinedAt: bookingSessions.mentorJoinedAt,
          learnerConnectionDurationMs: bookingSessions.learnerConnectionDurationMs,
          mentorConnectionDurationMs: bookingSessions.mentorConnectionDurationMs,
          status: bookingSessions.status,
        })
        .from(bookingSessions)
        .where(
          and(
            or(
              eq(bookingSessions.status, 'confirmed'),
              eq(bookingSessions.status, 'upcoming')
            )
          )
        )

      for (const session of sessionsToUpdate) {
        const bothUsersJoined = session.learnerJoinedAt !== null && session.mentorJoinedAt !== null
        
        if (bothUsersJoined) {
          // Check for sustained connection before marking as ongoing
          const sustainedConnectionTimeMs = this.ANTI_GAMING_CONFIG.SUSTAINED_CONNECTION_TIME_MS
          const learnerConnectionTime = session.learnerConnectionDurationMs || 0
          const mentorConnectionTime = session.mentorConnectionDurationMs || 0
          
          // Calculate current connection time if still connected
          const currentLearnerConnection = session.learnerJoinedAt ? 
            (now.getTime() - session.learnerJoinedAt.getTime()) : 0
          const currentMentorConnection = session.mentorJoinedAt ? 
            (now.getTime() - session.mentorJoinedAt.getTime()) : 0
          
          const learnerSustainedConnection = Math.max(learnerConnectionTime, currentLearnerConnection) >= sustainedConnectionTimeMs
          const mentorSustainedConnection = Math.max(mentorConnectionTime, currentMentorConnection) >= sustainedConnectionTimeMs
          
          if (learnerSustainedConnection && mentorSustainedConnection) {
            // Both users have sustained connection - mark as ongoing
            await db
              .update(bookingSessions)
              .set({ 
                status: 'ongoing',
                agoraCallStartedAt: session.startTime <= now ? now : session.startTime
              })
              .where(eq(bookingSessions.id, session.id))

            console.log(`[SESSION_MONITOR] Updated session ${session.id} to ongoing status (both users sustained connection 30+ seconds)`)
            this.stats.sustainedConnectionUpgrades++
          }
        }
      }
    } catch (error) {
      console.error('[SESSION_MONITOR] Error updating confirmed sessions to ongoing:', error)
    }
  }

  private async detectNoShows(): Promise<void> {
    try {
      const now = new Date()
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000) // Don't check sessions older than 2 hours
      
      // OPTIMIZED: Find sessions that need no-show checking
      const potentialNoShows = await db
        .select({
          id: bookingSessions.id,
          learnerId: bookingSessions.learnerId,
          mentorId: bookingSessions.mentorId,
          startTime: bookingSessions.startTime,
          endTime: bookingSessions.endTime,
          totalCostCredits: bookingSessions.totalCostCredits,
          escrowCredits: bookingSessions.escrowCredits,
          learnerJoinedAt: bookingSessions.learnerJoinedAt,
          mentorJoinedAt: bookingSessions.mentorJoinedAt,
          learnerLeftAt: bookingSessions.learnerLeftAt,
          mentorLeftAt: bookingSessions.mentorLeftAt,
          noShowCheckedAt: bookingSessions.noShowCheckedAt,
          status: bookingSessions.status,
          learnerConnectionDurationMs: bookingSessions.learnerConnectionDurationMs,
          mentorConnectionDurationMs: bookingSessions.mentorConnectionDurationMs,
          learnerActiveTimeMs: bookingSessions.learnerActiveTimeMs,
          mentorActiveTimeMs: bookingSessions.mentorActiveTimeMs,
          learnerLastActiveAt: bookingSessions.learnerLastActiveAt,
          mentorLastActiveAt: bookingSessions.mentorLastActiveAt,
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
              eq(bookingSessions.status, 'upcoming'),
              eq(bookingSessions.status, 'ongoing') // Include ongoing sessions for no-show check
            ),
            gt(bookingSessions.startTime, twoHoursAgo), // OPTIMIZATION: Don't check very old sessions
            isNull(bookingSessions.noShowCheckedAt) // Only process once
          )
        )

      for (const session of potentialNoShows) {
        const sessionStartTime = new Date(session.startTime)

        // ENHANCED NO-SHOW CONDITIONS:
        // Check for no-show if we're past the grace period from session start time
        const gracePeroidFromStart = new Date(sessionStartTime.getTime() + this.ANTI_GAMING_CONFIG.GRACE_PERIOD_MS)
        
        if (now < gracePeroidFromStart) {
          continue // Too early to check - give 20 minute grace period
        }

        console.log(`[SESSION_MONITOR] Checking session ${session.id} for no-show - ${Math.floor((now.getTime() - sessionStartTime.getTime()) / (60 * 1000))} minutes past start time`)

        // Enhanced validation for ongoing sessions
        if (session.status === 'ongoing') {
          // For ongoing sessions, apply stricter criteria to prevent gaming
          // Users can still be marked as no-show if they don't meet meaningful participation criteria
          console.log(`[SESSION_MONITOR] Session ${session.id} is ongoing - applying enhanced anti-gaming validation`)
        }

        const noShowType = await this.determineNoShowTypeEnhanced({
          id: session.id,
          learnerJoinedAt: session.learnerJoinedAt,
          mentorJoinedAt: session.mentorJoinedAt,
          learnerLeftAt: session.learnerLeftAt,
          mentorLeftAt: session.mentorLeftAt,
          learnerConnectionDurationMs: session.learnerConnectionDurationMs,
          mentorConnectionDurationMs: session.mentorConnectionDurationMs,
          learnerActiveTimeMs: session.learnerActiveTimeMs,
          mentorActiveTimeMs: session.mentorActiveTimeMs,
          learnerLastActiveAt: session.learnerLastActiveAt,
          mentorLastActiveAt: session.mentorLastActiveAt,
          startTime: session.startTime,
          endTime: session.endTime,
          currentTime: now,
          learner: session.learner,
          mentor: session.mentor
        })
        
        if (noShowType) {
          await this.processNoShow(session, noShowType)
          this.stats.noShowsDetected++
          this.stats.antiGamingDetections++
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

  private async determineNoShowTypeEnhanced(session: {
    id: number
    learnerJoinedAt: Date | null
    mentorJoinedAt: Date | null
    learnerLeftAt: Date | null
    mentorLeftAt: Date | null
    learnerConnectionDurationMs: number | null
    mentorConnectionDurationMs: number | null
    learnerActiveTimeMs: number | null
    mentorActiveTimeMs: number | null
    learnerLastActiveAt: Date | null
    mentorLastActiveAt: Date | null
    startTime: Date
    endTime: Date
    currentTime: Date
    learner: { userId: number } | null
    mentor: { userId: number } | null
  }): Promise<'both_no_show' | 'mentor_no_show' | 'learner_no_show' | null> {
    const sessionStartTime = new Date(session.startTime)
    const sessionEndTime = new Date(session.endTime)
    const sessionDurationMs = sessionEndTime.getTime() - sessionStartTime.getTime()
    const sessionElapsedMs = session.currentTime.getTime() - sessionStartTime.getTime()

    // Use centralized anti-gaming configuration
    const {
      MINIMUM_CONNECTION_TIME_MS,
      MINIMUM_PARTICIPATION_PERCENTAGE,
      MAX_LATE_JOIN_MS,
      MIN_COMPLETION_PERCENTAGE,
      GRACE_PERIOD_MS
    } = this.ANTI_GAMING_CONFIG
    
    console.log(`[SESSION_MONITOR] Enhanced no-show analysis for session ${session.id}:`);
    console.log(`- Session duration: ${Math.floor(sessionDurationMs / 60000)} minutes`);
    console.log(`- Time elapsed: ${Math.floor(sessionElapsedMs / 60000)} minutes`);
    
    // Only check for no-shows after grace period
    if (sessionElapsedMs < GRACE_PERIOD_MS) {
      console.log(`[SESSION_MONITOR] Too early for no-show check (${Math.floor(sessionElapsedMs / 60000)} < ${Math.floor(GRACE_PERIOD_MS / 60000)} min)`);
      return null
    }

    let learnerIsNoShow = false
    let mentorIsNoShow = false

    // Analyze learner participation
    const learnerAnalysis = this.analyzeParticipation({
      userId: session.learner?.userId || 0,
      userType: 'learner',
      joinedAt: session.learnerJoinedAt,
      leftAt: session.learnerLeftAt,
      connectionDurationMs: session.learnerConnectionDurationMs,
      activeTimeMs: session.learnerActiveTimeMs,
      lastActiveAt: session.learnerLastActiveAt,
      sessionStartTime,
      sessionEndTime,
      currentTime: session.currentTime,
      sessionDurationMs,
      criteria: {
        MINIMUM_CONNECTION_TIME_MS,
        MINIMUM_PARTICIPATION_PERCENTAGE,
        MAX_LATE_JOIN_MS,
        MIN_COMPLETION_PERCENTAGE
      }
    })

    // Analyze mentor participation
    const mentorAnalysis = this.analyzeParticipation({
      userId: session.mentor?.userId || 0,
      userType: 'mentor',
      joinedAt: session.mentorJoinedAt,
      leftAt: session.mentorLeftAt,
      connectionDurationMs: session.mentorConnectionDurationMs,
      activeTimeMs: session.mentorActiveTimeMs,
      lastActiveAt: session.mentorLastActiveAt,
      sessionStartTime,
      sessionEndTime,
      currentTime: session.currentTime,
      sessionDurationMs,
      criteria: {
        MINIMUM_CONNECTION_TIME_MS,
        MINIMUM_PARTICIPATION_PERCENTAGE,
        MAX_LATE_JOIN_MS,
        MIN_COMPLETION_PERCENTAGE
      }
    })

    console.log(`[SESSION_MONITOR] Learner participation: ${JSON.stringify(learnerAnalysis)}`);
    console.log(`[SESSION_MONITOR] Mentor participation: ${JSON.stringify(mentorAnalysis)}`);

    learnerIsNoShow = !learnerAnalysis.meaningfulParticipation
    mentorIsNoShow = !mentorAnalysis.meaningfulParticipation

    // Return appropriate no-show type
    if (learnerIsNoShow && mentorIsNoShow) {
      console.log(`[SESSION_MONITOR] Both users failed meaningful participation criteria`);
      return 'both_no_show'
    } else if (learnerIsNoShow && !mentorIsNoShow) {
      console.log(`[SESSION_MONITOR] Learner failed meaningful participation criteria`);
      return 'learner_no_show'
    } else if (!learnerIsNoShow && mentorIsNoShow) {
      console.log(`[SESSION_MONITOR] Mentor failed meaningful participation criteria`);
      return 'mentor_no_show'
    }
    
    console.log(`[SESSION_MONITOR] Both users met meaningful participation criteria`);
    return null // Neither is a no-show
  }

  private analyzeParticipation(params: {
    userId: number
    userType: 'learner' | 'mentor'
    joinedAt: Date | null
    leftAt: Date | null
    connectionDurationMs: number | null
    activeTimeMs: number | null
    lastActiveAt: Date | null
    sessionStartTime: Date
    sessionEndTime: Date
    currentTime: Date
    sessionDurationMs: number
    criteria: {
      MINIMUM_CONNECTION_TIME_MS: number
      MINIMUM_PARTICIPATION_PERCENTAGE: number
      MAX_LATE_JOIN_MS: number
      MIN_COMPLETION_PERCENTAGE: number
    }
  }): {
    meaningfulParticipation: boolean
    reasons: string[]
    metrics: {
      neverJoined: boolean
      joinedTooLate: boolean
      connectionTimeTooShort: boolean
      leftTooEarly: boolean
      insufficientParticipation: boolean
      prolongedInactivity: boolean
    }
  } {
    const {
      userId, userType, joinedAt, leftAt, connectionDurationMs, activeTimeMs, lastActiveAt,
      sessionStartTime, sessionEndTime, currentTime, sessionDurationMs, criteria
    } = params

    const reasons: string[] = []
    const metrics = {
      neverJoined: false,
      joinedTooLate: false,
      connectionTimeTooShort: false,
      leftTooEarly: false,
      insufficientParticipation: false,
      prolongedInactivity: false
    }

    // 1. Never joined the session
    if (!joinedAt) {
      metrics.neverJoined = true
      reasons.push('never joined session')
      return { meaningfulParticipation: false, reasons, metrics }
    }

    // 2. Joined more than 10 minutes late
    const lateJoinMs = joinedAt.getTime() - sessionStartTime.getTime()
    if (lateJoinMs > criteria.MAX_LATE_JOIN_MS) {
      metrics.joinedTooLate = true
      reasons.push(`joined ${Math.floor(lateJoinMs / 60000)} min late (max ${Math.floor(criteria.MAX_LATE_JOIN_MS / 60000)} min)`)
    }

    // 3. Calculate actual connection time
    let actualConnectionTime = 0
    if (connectionDurationMs !== null && connectionDurationMs > 0) {
      actualConnectionTime = connectionDurationMs
    } else if (leftAt) {
      actualConnectionTime = leftAt.getTime() - joinedAt.getTime()
    } else {
      // Still connected, calculate current connection time
      actualConnectionTime = currentTime.getTime() - joinedAt.getTime()
    }

    // 4. Connection time too short (less than 2 minutes)
    if (actualConnectionTime < criteria.MINIMUM_CONNECTION_TIME_MS) {
      metrics.connectionTimeTooShort = true
      reasons.push(`connected for only ${Math.floor(actualConnectionTime / 1000)}s (min ${Math.floor(criteria.MINIMUM_CONNECTION_TIME_MS / 1000)}s)`)
    }

    // 5. Left before 25% of session was complete
    const minStayTimeMs = sessionDurationMs * criteria.MIN_COMPLETION_PERCENTAGE
    const sessionProgressWhenLeft = leftAt ? 
      (leftAt.getTime() - sessionStartTime.getTime()) : 
      (currentTime.getTime() - sessionStartTime.getTime())
    
    if (leftAt && sessionProgressWhenLeft < minStayTimeMs) {
      metrics.leftTooEarly = true
      reasons.push(`left after ${Math.floor(sessionProgressWhenLeft / 60000)} min (min ${Math.floor(minStayTimeMs / 60000)} min required)`)
    }

    // 6. Active time insufficient (less than 10% of session duration)
    const requiredActiveTime = sessionDurationMs * criteria.MINIMUM_PARTICIPATION_PERCENTAGE
    const userActiveTime = activeTimeMs || 0
    
    if (userActiveTime < requiredActiveTime) {
      metrics.insufficientParticipation = true
      reasons.push(`active for ${Math.floor(userActiveTime / 60000)} min (min ${Math.floor(requiredActiveTime / 60000)} min required)`)
    }

    // 7. Prolonged inactivity (inactive for specified time while connected)
    if (lastActiveAt && joinedAt && !leftAt) {
      const inactiveTime = currentTime.getTime() - lastActiveAt.getTime()
      const maxInactivityMs = 10 * 60 * 1000 // Using constant for consistency
      if (inactiveTime > maxInactivityMs) {
        metrics.prolongedInactivity = true
        reasons.push(`inactive for ${Math.floor(inactiveTime / 60000)} min (max ${Math.floor(maxInactivityMs / 60000)} min)`);
      }
    }

    // Determine if participation was meaningful
    const failedCriteria = metrics.neverJoined || metrics.joinedTooLate || 
      metrics.connectionTimeTooShort || metrics.leftTooEarly || 
      metrics.insufficientParticipation || metrics.prolongedInactivity

    return {
      meaningfulParticipation: !failedCriteria,
      reasons,
      metrics
    }
  }


  private calculateConnectionTimeInWindow(
    joinedAt: Date | null,
    leftAt: Date | null,
    windowStart: Date,
    windowEnd: Date,
    totalConnectionMs: number | null
  ): number {
    if (!joinedAt) {
      return 0 // Never joined
    }

    // Use stored connection duration if available and reliable
    if (totalConnectionMs !== null && leftAt !== null) {
      // Calculate overlap between connection period and window
      const connectionStart = Math.max(joinedAt.getTime(), windowStart.getTime())
      const connectionEnd = Math.min(leftAt.getTime(), windowEnd.getTime())
      
      if (connectionEnd > connectionStart) {
        return connectionEnd - connectionStart
      }
      return 0
    }

    // Fallback: calculate based on join/leave times
    const connectionStart = Math.max(joinedAt.getTime(), windowStart.getTime())
    const connectionEnd = Math.min(
      leftAt ? leftAt.getTime() : windowEnd.getTime(), 
      windowEnd.getTime()
    )
    
    if (connectionEnd > connectionStart) {
      return connectionEnd - connectionStart
    }
    
    return 0
  }

  // Legacy method - keeping for backward compatibility, but enhanced version is used by default

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
          console.log(`[SESSION_MONITOR] Session ${session.id} already processed, skipping no-show`)
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

      console.log(`[SESSION_MONITOR] Processed ${noShowType} for session ${session.id}`)

    } catch (error) {
      console.error(`[SESSION_MONITOR] Error processing ${noShowType} for session ${session.id}:`, error)
    }
  }

  private async completeSessionsAtEndTime(): Promise<void> {
    try {
      const now = new Date()
      
      // Find ongoing sessions that have reached their ACTUAL end time
      const sessionsToComplete = await db
        .select({
          id: bookingSessions.id,
          learnerId: bookingSessions.learnerId,
          mentorId: bookingSessions.mentorId,
          endTime: bookingSessions.endTime,
          startTime: bookingSessions.startTime, // Add this for validation
          totalCostCredits: bookingSessions.totalCostCredits,
          learnerJoinedAt: bookingSessions.learnerJoinedAt,
          mentorJoinedAt: bookingSessions.mentorJoinedAt,
          learnerLeftAt: bookingSessions.learnerLeftAt,
          mentorLeftAt: bookingSessions.mentorLeftAt,
          learnerConnectionDurationMs: bookingSessions.learnerConnectionDurationMs,
          mentorConnectionDurationMs: bookingSessions.mentorConnectionDurationMs,
          learnerActiveTimeMs: bookingSessions.learnerActiveTimeMs,
          mentorActiveTimeMs: bookingSessions.mentorActiveTimeMs,
          status: bookingSessions.status,
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
            lt(bookingSessions.endTime, now) // Only sessions that have ACTUALLY ended
          )
        )

      console.log(`[SESSION_MONITOR] Found ${sessionsToComplete.length} sessions that have reached their end time`)

      for (const session of sessionsToComplete) {
        // CRITICAL: Double-check that the session has actually reached its end time
        const sessionEndTime = new Date(session.endTime!)
        if (now < sessionEndTime) {
          console.log(`[SESSION_MONITOR] Skipping session ${session.id} - end time not reached yet (${sessionEndTime.toISOString()} vs ${now.toISOString()})`)
          continue
        }

        try {
          // Use unified completion service instead of duplicate logic
          const completionResult = await sessionCompletionService.completeSession({
            sessionId: session.id,
            reason: 'time_expired',
            completedBy: 'system_timer'
          })

          if (completionResult.success && !completionResult.alreadyCompleted) {
            console.log(`[SESSION_MONITOR] Auto-completed session ${session.id} at scheduled end time`)
            this.stats.sessionsCompleted++

            // Broadcast session termination
            if (session.learner && session.mentor) {
              await broadcastSessionUpdate(
                session.id,
                'session_terminated',
                { 
                  reason: 'Scheduled session time ended',
                  completedBy: 'system_timer',
                  completedAt: new Date().toISOString()
                },
                [session.learner.userId, session.mentor.userId]
              )
            }
          }
        } catch (error) {
          console.error(`[SESSION_MONITOR] Error auto-completing session ${session.id}:`, error)
        }

        // No additional logic needed - completion service handles everything
      }
    } catch (error) {
      console.error('[SESSION_MONITOR] Error completing sessions at end time:', error)
    }
  }
  

  private async handleStuckSessions(): Promise<void> {
    try {
      const now = new Date()
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
      
      // Find sessions stuck in 'upcoming' status for more than 1 hour past start time
      const stuckSessions = await db
        .select({
          id: bookingSessions.id,
          startTime: bookingSessions.startTime,
          endTime: bookingSessions.endTime,
          status: bookingSessions.status,
          noShowCheckedAt: bookingSessions.noShowCheckedAt,
        })
        .from(bookingSessions)
        .where(
          and(
            eq(bookingSessions.status, 'upcoming'),
            lt(bookingSessions.startTime, oneHourAgo),
            isNull(bookingSessions.noShowCheckedAt) // Only handle if not already processed for no-show
          )
        )

      for (const session of stuckSessions) {
        // If session is past its end time, mark as no-show
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