import { db } from '@/db'
import { bookingSessions, learners, mentors, creditTransactions } from '@/db/schema'
import { eq, and, lt } from 'drizzle-orm'
import { agoraService } from '@/lib/agora/AgoraService'

interface SessionTerminationResult {
  sessionId: number
  status: string
  reason: string
  participantsRemoved: boolean
  paymentProcessed: boolean
}

class SessionTerminationService {
  
  /**
   * Automatically terminate sessions that have exceeded their end time
   */
  async terminateExpiredSessions(): Promise<SessionTerminationResult[]> {
    const now = new Date()
    const results: SessionTerminationResult[] = []
    
    try {
      // Find ongoing sessions that have passed their end time
      const expiredSessions = await db
        .select({
          session: bookingSessions,
          learner: learners,
          mentor: mentors,
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

      for (const { session, learner, mentor } of expiredSessions) {
        const result = await this.terminateSession(
          session.id, 
          'time_expired',
          { learner, mentor }
        )
        results.push(result)
      }

      return results
    } catch (error) {
      console.error('Error terminating expired sessions:', error)
      throw error
    }
  }

  /**
   * Detect and handle no-show scenarios
   */
  async handleNoShowSessions(): Promise<SessionTerminationResult[]> {
    const now = new Date()
    const gracePeriodMinutes = 15
    const gracePeriodMs = gracePeriodMinutes * 60 * 1000
    const results: SessionTerminationResult[] = []

    try {
      // Find sessions that are past their start time + grace period but haven't had anyone join
      const noShowSessions = await db
        .select({
          session: bookingSessions,
          learner: learners,
          mentor: mentors,
        })
        .from(bookingSessions)
        .leftJoin(learners, eq(bookingSessions.learnerId, learners.id))
        .leftJoin(mentors, eq(bookingSessions.mentorId, mentors.id))
        .where(
          and(
            eq(bookingSessions.status, 'upcoming'),
            lt(bookingSessions.startTime, new Date(now.getTime() - gracePeriodMs))
          )
        )

      for (const { session, learner, mentor } of noShowSessions) {
        let reason = 'both_no_show'
        
        // Determine who showed up (if anyone)
        if (session.learnerJoinedAt && !session.mentorJoinedAt) {
          reason = 'mentor_no_show'
        } else if (session.mentorJoinedAt && !session.learnerJoinedAt) {
          reason = 'learner_no_show'
        }

        const result = await this.terminateSession(
          session.id,
          reason,
          { learner, mentor }
        )
        results.push(result)
      }

      return results
    } catch (error) {
      console.error('Error handling no-show sessions:', error)
      throw error
    }
  }

  /**
   * Force disconnect users from a specific session
   */
  async forceDisconnectSession(sessionId: number, reason: string = 'force_disconnect'): Promise<SessionTerminationResult> {
    try {
      // Get session data
      const sessionQuery = await db
        .select({
          session: bookingSessions,
          learner: learners,
          mentor: mentors,
        })
        .from(bookingSessions)
        .leftJoin(learners, eq(bookingSessions.learnerId, learners.id))
        .leftJoin(mentors, eq(bookingSessions.mentorId, mentors.id))
        .where(eq(bookingSessions.id, sessionId))
        .limit(1)

      if (sessionQuery.length === 0) {
        throw new Error('Session not found')
      }

      const { session, learner, mentor } = sessionQuery[0]

      return await this.terminateSession(sessionId, reason, { learner, mentor })
    } catch (error) {
      console.error('Error force disconnecting session:', error)
      throw error
    }
  }

  /**
   * Core session termination logic
   */
  private async terminateSession(
    sessionId: number, 
    reason: string,
    participants: { learner: any; mentor: any }
  ): Promise<SessionTerminationResult> {
    const result: SessionTerminationResult = {
      sessionId,
      status: reason,
      reason,
      participantsRemoved: false,
      paymentProcessed: false
    }

    try {
      const now = new Date()
      const { learner, mentor } = participants

      // Get current session data
      const session = await db
        .select()
        .from(bookingSessions)
        .where(eq(bookingSessions.id, sessionId))
        .limit(1)

      if (session.length === 0) {
        throw new Error('Session not found')
      }

      const sessionData = session[0]

      // Calculate connection durations
      const learnerDuration = sessionData.learnerJoinedAt && sessionData.learnerLeftAt
        ? sessionData.learnerLeftAt.getTime() - sessionData.learnerJoinedAt.getTime()
        : sessionData.learnerJoinedAt
        ? now.getTime() - sessionData.learnerJoinedAt.getTime()
        : 0

      const mentorDuration = sessionData.mentorJoinedAt && sessionData.mentorLeftAt
        ? sessionData.mentorLeftAt.getTime() - sessionData.mentorJoinedAt.getTime()
        : sessionData.mentorJoinedAt
        ? now.getTime() - sessionData.mentorJoinedAt.getTime()
        : 0

      // End Agora channel if exists
      if (sessionData.agoraChannelName) {
        try {
          await agoraService.endRoom(sessionData.agoraChannelName, reason)
          result.participantsRemoved = true
        } catch (error) {
          console.error('Error ending Agora room:', error)
          // Continue with termination even if Agora fails
        }
      }

      // Update session status
      const updateData = {
        status: this.getTerminationStatus(reason),
        agoraCallEndedAt: now,
        learnerConnectionDurationMs: Math.max(learnerDuration, sessionData.learnerConnectionDurationMs || 0),
        mentorConnectionDurationMs: Math.max(mentorDuration, sessionData.mentorConnectionDurationMs || 0),
        noShowCheckedAt: now,
      }

      // Mark users as left if they haven't already
      if (sessionData.learnerJoinedAt && !sessionData.learnerLeftAt) {
        updateData.learnerLeftAt = now
      }
      if (sessionData.mentorJoinedAt && !sessionData.mentorLeftAt) {
        updateData.mentorLeftAt = now
      }

      await db
        .update(bookingSessions)
        .set(updateData)
        .where(eq(bookingSessions.id, sessionId))

      // Process payments based on termination reason
      await this.processTerminationPayments(sessionId, reason, sessionData, learner, mentor)
      result.paymentProcessed = true
      result.status = updateData.status

      return result
    } catch (error) {
      console.error(`Error terminating session ${sessionId}:`, error)
      throw error
    }
  }

  /**
   * Process payments based on termination reason
   */
  private async processTerminationPayments(
    sessionId: number,
    reason: string,
    sessionData: any,
    learner: any,
    mentor: any
  ): Promise<void> {
    try {
      switch (reason) {
        case 'time_expired':
        case 'completed':
          // Normal completion - pay mentor 80%, platform keeps 20%
          await this.processNormalCompletion(sessionId, sessionData, learner, mentor)
          break

        case 'mentor_no_show':
          // Refund learner, no payment to mentor
          await this.processRefund(sessionId, sessionData, learner, 'mentor_no_show')
          break

        case 'learner_no_show':
          // Pay mentor full amount as compensation
          await this.processMentorCompensation(sessionId, sessionData, mentor)
          break

        case 'both_no_show':
          // Refund learner, no payment to mentor
          await this.processRefund(sessionId, sessionData, learner, 'both_no_show')
          break

        case 'technical_issues':
          // Partial refund based on session duration
          await this.processPartialRefund(sessionId, sessionData, learner, mentor)
          break

        default:
          // For other reasons (force_disconnect, etc.), handle case by case
          }
    } catch (error) {
      console.error('Error processing termination payments:', error)
      throw error
    }
  }

  private async processNormalCompletion(sessionId: number, sessionData: any, learner: any, mentor: any): Promise<void> {
    const mentorEarnings = Math.floor(sessionData.totalCostCredits * 0.8)
    
    // Update mentor balance
    await db
      .update(mentors)
      .set({
        creditsBalance: mentor.creditsBalance + mentorEarnings
      })
      .where(eq(mentors.id, sessionData.mentorId))

    // Record transaction
    await db.insert(creditTransactions).values({
      userId: mentor.userId,
      type: 'session_payment',
      direction: 'credit',
      amount: mentorEarnings,
      balanceBefore: mentor.creditsBalance,
      balanceAfter: mentor.creditsBalance + mentorEarnings,
      relatedSessionId: sessionId,
      description: `Payment for completed session ${sessionId}`,
    })
  }

  private async processRefund(sessionId: number, sessionData: any, learner: any, reason: string): Promise<void> {
    // Refund escrow credits to learner
    await db
      .update(learners)
      .set({
        creditsBalance: learner.creditsBalance + sessionData.escrowCredits
      })
      .where(eq(learners.id, sessionData.learnerId))

    // Record refund transaction
    await db.insert(creditTransactions).values({
      userId: learner.userId,
      type: 'session_refund',
      direction: 'credit',
      amount: sessionData.escrowCredits,
      balanceBefore: learner.creditsBalance,
      balanceAfter: learner.creditsBalance + sessionData.escrowCredits,
      relatedSessionId: sessionId,
      description: `Refund for session ${sessionId} (${reason})`,
    })

    // Update session with refund info
    await db
      .update(bookingSessions)
      .set({
        refundProcessedAt: new Date(),
        refundAmount: sessionData.escrowCredits
      })
      .where(eq(bookingSessions.id, sessionId))
  }

  private async processMentorCompensation(sessionId: number, sessionData: any, mentor: any): Promise<void> {
    // Pay mentor full amount as compensation for learner no-show
    const compensation = sessionData.totalCostCredits

    await db
      .update(mentors)
      .set({
        creditsBalance: mentor.creditsBalance + compensation
      })
      .where(eq(mentors.id, sessionData.mentorId))

    // Record transaction
    await db.insert(creditTransactions).values({
      userId: mentor.userId,
      type: 'session_payment',
      direction: 'credit',
      amount: compensation,
      balanceBefore: mentor.creditsBalance,
      balanceAfter: mentor.creditsBalance + compensation,
      relatedSessionId: sessionId,
      description: `Compensation for learner no-show session ${sessionId}`,
    })
  }

  private async processPartialRefund(sessionId: number, sessionData: any, learner: any, mentor: any): Promise<void> {
    // For technical issues, split the credits 50/50
    const learnerRefund = Math.floor(sessionData.totalCostCredits * 0.5)
    const mentorPayment = sessionData.totalCostCredits - learnerRefund

    // Refund learner
    await db
      .update(learners)
      .set({
        creditsBalance: learner.creditsBalance + learnerRefund
      })
      .where(eq(learners.id, sessionData.learnerId))

    // Pay mentor
    await db
      .update(mentors)
      .set({
        creditsBalance: mentor.creditsBalance + mentorPayment
      })
      .where(eq(mentors.id, sessionData.mentorId))

    // Record transactions
    await Promise.all([
      db.insert(creditTransactions).values({
        userId: learner.userId,
        type: 'session_refund',
        direction: 'credit',
        amount: learnerRefund,
        balanceBefore: learner.creditsBalance,
        balanceAfter: learner.creditsBalance + learnerRefund,
        relatedSessionId: sessionId,
        description: `Partial refund for session ${sessionId} (technical issues)`,
      }),
      db.insert(creditTransactions).values({
        userId: mentor.userId,
        type: 'session_payment',
        direction: 'credit',
        amount: mentorPayment,
        balanceBefore: mentor.creditsBalance,
        balanceAfter: mentor.creditsBalance + mentorPayment,
        relatedSessionId: sessionId,
        description: `Partial payment for session ${sessionId} (technical issues)`,
      })
    ])
  }

  private getTerminationStatus(reason: string): string {
    switch (reason) {
      case 'time_expired':
        return 'completed'
      case 'mentor_no_show':
        return 'mentor_no_show'
      case 'learner_no_show':
        return 'learner_no_show'
      case 'both_no_show':
        return 'both_no_show'
      case 'technical_issues':
        return 'technical_issues'
      case 'force_disconnect':
        return 'cancelled'
      default:
        return 'completed'
    }
  }
}

export const sessionTerminationService = new SessionTerminationService()