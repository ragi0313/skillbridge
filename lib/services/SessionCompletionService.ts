import { db } from '@/db'
import { bookingSessions, learners, mentors, creditTransactions, mentorPayouts, notifications } from '@/db/schema'
import { eq, sql } from 'drizzle-orm'

export interface SessionCompletionOptions {
  sessionId: number
  reason: 'completed' | 'cancelled' | 'technical_issues' | 'time_expired' | 'user_ended'
  completedBy: 'user' | 'system_timer' | 'admin'
  userId?: number // User who initiated completion (if applicable)
}

export interface SessionCompletionResult {
  success: boolean
  status: string
  message: string
  paymentProcessed: boolean
  refundProcessed: boolean
  mentorEarnings: number
  alreadyCompleted: boolean
}

class SessionCompletionService {
  private readonly MIN_DURATION_FOR_PAYMENT = 5 * 60 * 1000 // 5 minutes
  private readonly MENTOR_FEE_PERCENTAGE = 0.8 // 80% to mentor, 20% platform fee

  async completeSession(options: SessionCompletionOptions): Promise<SessionCompletionResult> {
    const { sessionId, reason, completedBy, userId } = options

    return await db.transaction(async (tx) => {
      // Get session with row lock to prevent concurrent completion
      const [sessionRecord] = await tx.execute(
        sql`SELECT bs.*, 
            l.id as learner_id, l.user_id as learner_user_id, l.credits_balance as learner_credits,
            m.id as mentor_id, m.user_id as mentor_user_id, m.credits_balance as mentor_credits
            FROM booking_sessions bs
            LEFT JOIN learners l ON bs.learner_id = l.id 
            LEFT JOIN mentors m ON bs.mentor_id = m.id
            WHERE bs.id = ${sessionId}
            FOR UPDATE`
      )

      if (!sessionRecord) {
        throw new Error('Session not found')
      }

      // Check if session is already completed
      const terminalStatuses = ['completed', 'cancelled', 'both_no_show', 'mentor_no_show', 'learner_no_show', 'technical_issues']
      if (terminalStatuses.includes(sessionRecord.status)) {
        return {
          success: true,
          status: sessionRecord.status,
          message: 'Session already completed',
          paymentProcessed: false,
          refundProcessed: false,
          mentorEarnings: 0,
          alreadyCompleted: true
        }
      }

      const now = new Date()
      const completionTime = new Date()

      // Calculate actual connection durations
      const learnerDuration = this.calculateConnectionDuration(
        sessionRecord.learner_joined_at,
        sessionRecord.learner_left_at,
        completionTime
      )

      const mentorDuration = this.calculateConnectionDuration(
        sessionRecord.mentor_joined_at,
        sessionRecord.mentor_left_at,
        completionTime
      )

      // Determine final status and payment logic
      const { finalStatus, shouldProcessPayment, shouldRefundLearner, refundReason } = 
        this.determineCompletionOutcome(reason, learnerDuration, mentorDuration)

      console.log(`[SESSION_COMPLETION] Session ${sessionId}: finalStatus=${finalStatus}, payment=${shouldProcessPayment}, refund=${shouldRefundLearner}`)

      // Update session status and metadata
      const updateData = {
        status: finalStatus,
        agoraCallEndedAt: completionTime,
        learnerConnectionDurationMs: Math.max(learnerDuration, sessionRecord.learner_connection_duration_ms || 0),
        mentorConnectionDurationMs: Math.max(mentorDuration, sessionRecord.mentor_connection_duration_ms || 0),
      }

      await tx
        .update(bookingSessions)
        .set(updateData)
        .where(eq(bookingSessions.id, sessionId))

      let mentorEarnings = 0
      const notificationData = []

      // Process mentor payment
      if (shouldProcessPayment && sessionRecord.total_cost_credits > 0) {
        mentorEarnings = Math.floor(sessionRecord.total_cost_credits * this.MENTOR_FEE_PERCENTAGE)
        const platformFee = sessionRecord.total_cost_credits - mentorEarnings

        // Add credits to mentor balance
        await tx
          .update(mentors)
          .set({
            creditsBalance: sessionRecord.mentor_credits + mentorEarnings
          })
          .where(eq(mentors.id, sessionRecord.mentor_id))

        // Record mentor payout
        await tx.insert(mentorPayouts).values({
          mentorId: sessionRecord.mentor_id,
          sessionId: sessionId,
          earnedCredits: mentorEarnings,
          platformFeeCredits: platformFee,
          feePercentage: 20,
          status: 'released',
          releasedAt: now,
        })

        // Record credit transaction
        await tx.insert(creditTransactions).values({
          userId: sessionRecord.mentor_user_id,
          type: 'session_payment',
          direction: 'credit',
          amount: mentorEarnings,
          balanceBefore: sessionRecord.mentor_credits,
          balanceAfter: sessionRecord.mentor_credits + mentorEarnings,
          relatedSessionId: sessionId,
          description: `Payment for ${finalStatus} session ${sessionId} (${Math.round(Math.min(learnerDuration, mentorDuration) / 60000)} minutes)`,
          metadata: { 
            platformFee, 
            originalAmount: sessionRecord.total_cost_credits,
            completedBy,
            learnerDurationMs: learnerDuration,
            mentorDurationMs: mentorDuration,
            completionReason: reason
          },
        })

        notificationData.push({
          userId: sessionRecord.mentor_user_id,
          type: 'session_completed',
          title: 'Session Completed - Payment Received!',
          message: `Your session has been completed. You earned ${mentorEarnings} credits.`,
          relatedEntityType: 'session',
          relatedEntityId: sessionId,
        })
      }

      // Process refund
      if (shouldRefundLearner && sessionRecord.escrow_credits > 0) {
        await tx
          .update(learners)
          .set({
            creditsBalance: sessionRecord.learner_credits + sessionRecord.escrow_credits
          })
          .where(eq(learners.id, sessionRecord.learner_id))

        await tx
          .update(bookingSessions)
          .set({
            refundAmount: sessionRecord.escrow_credits,
            refundProcessedAt: now,
          })
          .where(eq(bookingSessions.id, sessionId))

        await tx.insert(creditTransactions).values({
          userId: sessionRecord.learner_user_id,
          type: 'session_refund',
          direction: 'credit',
          amount: sessionRecord.escrow_credits,
          balanceBefore: sessionRecord.learner_credits,
          balanceAfter: sessionRecord.learner_credits + sessionRecord.escrow_credits,
          relatedSessionId: sessionId,
          description: `Refund for session ${sessionId}: ${refundReason}`,
          metadata: { 
            reason: finalStatus,
            completedBy,
            learnerDurationMs: learnerDuration,
            mentorDurationMs: mentorDuration
          },
        })

        notificationData.push({
          userId: sessionRecord.learner_user_id,
          type: 'session_refunded',
          title: 'Session Refunded',
          message: `You have been refunded ${sessionRecord.escrow_credits} credits. Reason: ${refundReason}`,
          relatedEntityType: 'session',
          relatedEntityId: sessionId,
        })
      }

      // Add completion notifications for both users
      if (!shouldRefundLearner) {
        notificationData.push({
          userId: sessionRecord.learner_user_id,
          type: 'session_completed',
          title: 'Session Completed!',
          message: 'Your session has been completed. Please rate your mentor!',
          relatedEntityType: 'session',
          relatedEntityId: sessionId,
        })
      }

      // Insert all notifications
      if (notificationData.length > 0) {
        await tx.insert(notifications).values(notificationData)
      }

      return {
        success: true,
        status: finalStatus,
        message: 'Session completed successfully',
        paymentProcessed: shouldProcessPayment,
        refundProcessed: shouldRefundLearner,
        mentorEarnings,
        alreadyCompleted: false
      }
    })
  }

  private calculateConnectionDuration(joinedAt: Date | null, leftAt: Date | null, completionTime: Date): number {
    if (!joinedAt) return 0
    const endTime = leftAt || completionTime
    return Math.max(0, endTime.getTime() - joinedAt.getTime())
  }

  private determineCompletionOutcome(
    reason: string, 
    learnerDuration: number, 
    mentorDuration: number
  ): {
    finalStatus: string
    shouldProcessPayment: boolean
    shouldRefundLearner: boolean
    refundReason: string
  } {
    const bothUsersParticipated = learnerDuration >= this.MIN_DURATION_FOR_PAYMENT && 
                                 mentorDuration >= this.MIN_DURATION_FOR_PAYMENT

    switch (reason) {
      case 'cancelled':
        return {
          finalStatus: 'cancelled',
          shouldProcessPayment: false,
          shouldRefundLearner: true,
          refundReason: 'Session cancelled by user'
        }

      case 'technical_issues':
        if (bothUsersParticipated) {
          return {
            finalStatus: 'completed',
            shouldProcessPayment: true,
            shouldRefundLearner: false,
            refundReason: ''
          }
        } else {
          return {
            finalStatus: 'technical_issues',
            shouldProcessPayment: false,
            shouldRefundLearner: true,
            refundReason: 'Technical issues prevented session completion'
          }
        }

      case 'completed':
      case 'user_ended':
      case 'time_expired':
      default:
        if (bothUsersParticipated) {
          return {
            finalStatus: 'completed',
            shouldProcessPayment: true,
            shouldRefundLearner: false,
            refundReason: ''
          }
        } else {
          const durationMinutes = Math.round(Math.min(learnerDuration, mentorDuration) / 60000)
          return {
            finalStatus: 'cancelled',
            shouldProcessPayment: false,
            shouldRefundLearner: true,
            refundReason: `Session too short or incomplete (${durationMinutes} minutes)`
          }
        }
    }
  }
}

export const sessionCompletionService = new SessionCompletionService()