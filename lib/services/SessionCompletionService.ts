import { db } from '@/db'
import { bookingSessions, learners, mentors, creditTransactions, mentorPayouts, notifications, creditPurchases } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { Xendit } from 'xendit-node'
import { sessionLogService } from './SessionLogService'
import { validateTransitionOrThrow, TERMINAL_STATES } from './SessionStateValidator'
import { sessionChatService } from './SessionChatService'

const xendit = new Xendit({ 
  secretKey: process.env.XENDIT_SECRET_KEY! 
})

// Use the correct way to access Payout API (Xendit calls disbursements "Payouts")
const Payout = xendit.Payout

export interface SessionCompletionOptions {
  sessionId: number
  reason: 'completed' | 'cancelled' | 'technical_issues' | 'time_expired' | 'user_ended'
  completedBy: 'user' | 'system_timer' | 'admin'
  userId?: number
  cancellationReason?: string
}

export interface SessionCompletionResult {
  success: boolean
  status: string
  message: string
  paymentProcessed: boolean
  refundProcessed: boolean
  mentorEarnings: number
  platformFeePhp: number
  alreadyCompleted: boolean
}

class SessionCompletionService {
  private readonly MIN_DURATION_FOR_PAYMENT = 5 * 60 * 1000 // 5 minutes
  private readonly MENTOR_FEE_PERCENTAGE = 0.8 // 80% to mentor, 20% platform fee
  private readonly CREDITS_TO_PHP_RATE = 11.2 // 1 credit = ₱11.2

  async completeSession(options: SessionCompletionOptions): Promise<SessionCompletionResult> {
    const { sessionId, reason, completedBy, cancellationReason } = options

    const result = await db.transaction(async (tx) => {
      // Get session with row lock to prevent concurrent completion
      const sessionData = await tx
        .select()
        .from(bookingSessions)
        .where(eq(bookingSessions.id, sessionId))
        .for('update')
        .limit(1)

      if (sessionData.length === 0) {
        throw new Error('Session not found')
      }

      const session = sessionData[0]

      // Get learner and mentor data separately
      const [learner, mentor] = await Promise.all([
        tx.select().from(learners).where(eq(learners.id, session.learnerId)).limit(1),
        tx.select().from(mentors).where(eq(mentors.id, session.mentorId)).limit(1)
      ])

      if (!learner.length || !mentor.length) {
        throw new Error('Learner or mentor not found')
      }

      // Combine the data for compatibility
      const sessionRecord = {
        ...session,
        learner_id: learner[0].id,
        learner_user_id: learner[0].userId,
        learner_credits: learner[0].creditsBalance,
        mentor_id: mentor[0].id,
        mentor_user_id: mentor[0].userId,
        mentor_credits: mentor[0].creditsBalance
      }

      // Check if session is already completed (IDEMPOTENCY)
      if (sessionRecord.status !== null && TERMINAL_STATES.includes(sessionRecord.status as any)) {
        // Log this duplicate completion attempt
        await sessionLogService.logEvent({
          sessionId,
          eventType: 'admin_action',
          actorType: completedBy === 'admin' ? 'admin' : 'system',
          actorId: options.userId,
          description: `Duplicate completion attempt blocked - session already ${sessionRecord.status}`,
          metadata: { reason, completedBy, attemptedStatus: reason }
        })

        return {
          success: true,
          status: sessionRecord.status,
          message: 'Session already completed',
          paymentProcessed: false,
          refundProcessed: false,
          mentorEarnings: 0,
          platformFeePhp: 0,
          alreadyCompleted: true
        }
      }

      const now = new Date()
      const completionTime = new Date()

      // Calculate actual connection durations
      const learnerDuration = this.calculateConnectionDuration(
        sessionRecord.learnerJoinedAt,
        sessionRecord.learnerLeftAt,
        completionTime
      )

      const mentorDuration = this.calculateConnectionDuration(
        sessionRecord.mentorJoinedAt,
        sessionRecord.mentorLeftAt,
        completionTime
      )

      // Determine final status and payment logic
      const { finalStatus, shouldProcessPayment, shouldRefundLearner, refundReason } =
        this.determineCompletionOutcome(reason, learnerDuration, mentorDuration, cancellationReason)

      // SECURITY: Validate state transition
      validateTransitionOrThrow(sessionRecord.status, finalStatus)

      // Update session status and metadata
      const updateData: any = {
        status: finalStatus,
        agoraCallEndedAt: completionTime,
        learnerConnectionDurationMs: Math.max(learnerDuration, sessionRecord.learnerConnectionDurationMs || 0),
        mentorConnectionDurationMs: Math.max(mentorDuration, sessionRecord.mentorConnectionDurationMs || 0),
      }

      // Add cancellationReason if provided and session is being cancelled
      if (cancellationReason && (finalStatus === 'cancelled' || reason === 'cancelled')) {
        updateData.cancellationReason = cancellationReason
      }

      await tx
        .update(bookingSessions)
        .set(updateData)
        .where(eq(bookingSessions.id, sessionId))

      // Log the status change
      await sessionLogService.logEvent({
        sessionId,
        eventType: 'status_changed',
        actorType: completedBy === 'admin' ? 'admin' : (completedBy === 'user' ? 'learner' : 'system'),
        actorId: options.userId,
        oldStatus: sessionRecord.status || 'ongoing',
        newStatus: finalStatus,
        description: `Session completed via ${completedBy} - ${reason}`,
        metadata: {
          reason,
          completedBy,
          learnerDurationMs: learnerDuration,
          mentorDurationMs: mentorDuration,
          shouldProcessPayment,
          shouldRefundLearner
        }
      })

      let mentorEarnings = 0
      let platformFeePhp = 0
      let platformFeeChargeId: string | null = null
      const notificationData = []

      // Process mentor payment AND platform fee capture
      if (shouldProcessPayment && sessionRecord.totalCostCredits > 0) {
        mentorEarnings = Math.floor(sessionRecord.totalCostCredits * this.MENTOR_FEE_PERCENTAGE)
        const platformFeeCredits = sessionRecord.totalCostCredits - mentorEarnings
        platformFeePhp = platformFeeCredits * this.CREDITS_TO_PHP_RATE

        // PLATFORM FEE COLLECTION: Transfer platform fee to Xendit account
        // Note: This requires verified Xendit business account with payout permissions
        try {
          // Check if Xendit account details are configured
          if (!process.env.XENDIT_PLATFORM_ACCOUNT_NUMBER) {
            console.warn(`[PLATFORM_FEE] Xendit platform account not configured. Platform fee of ₱${platformFeePhp} will be tracked but not transferred.`)
          } else {
            // Create a payout to transfer platform fee to your business account
            const platformFeePayout = await Payout.createPayout({
              idempotencyKey: `platform_fee_${sessionId}_${Date.now()}`,
              data: {
                referenceId: `platform_fee_${sessionId}_${Date.now()}`,
                channelCode: `PH_${process.env.XENDIT_PLATFORM_BANK_CODE || 'BPI'}`,
                channelProperties: {
                  accountHolderName: process.env.XENDIT_PLATFORM_ACCOUNT_NAME || 'SkillBridge',
                  accountNumber: process.env.XENDIT_PLATFORM_ACCOUNT_NUMBER!,
                },
                description: `Platform fee - Session ${sessionId} (${platformFeeCredits} credits)`,
                amount: Math.round(platformFeePhp * 100) / 100,
                currency: 'PHP',
                metadata: {
                  sessionId: sessionId.toString(),
                  platformFeeCredits: platformFeeCredits.toString(),
                  platformFeePhp: platformFeePhp.toString(),
                  type: 'platform_fee',
                  learnerUserId: sessionRecord.learner_user_id.toString(),
                  mentorUserId: sessionRecord.mentor_user_id.toString(),
                }
              }
            })

            // Record the Xendit payout ID for reference
            platformFeeChargeId = platformFeePayout.id
            console.log(`[PLATFORM_FEE] Successfully created Xendit payout: ${platformFeeChargeId} for ₱${platformFeePhp}`)
          }
        } catch (xenditError: any) {
          // Handle specific Xendit errors
          if (xenditError?.status === 403 || xenditError?.errorCode === 'REQUEST_FORBIDDEN_ERROR') {
            console.warn(`[PLATFORM_FEE] Xendit account not verified for payouts yet. Platform fee of ₱${platformFeePhp} will be tracked in database. Error: ${xenditError?.errorMessage || 'Permission denied'}`)
          } else {
            console.error(`[PLATFORM_FEE] Failed to create Xendit payout for platform fee:`, xenditError)
          }
          // Continue processing - don't fail the session completion
          // Platform fees are still tracked in the database for manual processing
        }
        
        // Record platform fee capture for accounting purposes
        await tx.insert(creditTransactions).values({
          userId: 1, // Platform/admin user ID  
          type: 'platform_fee_collected',
          direction: 'debit', // Credits leaving the system, converted to cash
          amount: platformFeeCredits,
          balanceBefore: 0,
          balanceAfter: 0, 
          relatedSessionId: sessionId,
          description: `Platform fee collected: ₱${platformFeePhp} from session ${sessionId}${platformFeeChargeId ? ` (Xendit: ${platformFeeChargeId})` : ''}`,
          metadata: {
            platformFeePhp,
            mentorEarnings,
            originalAmount: sessionRecord.totalCostCredits,
            feePercentage: 20,
            xenditPayoutId: platformFeeChargeId,
            xenditAmountPhp: Math.round(platformFeePhp), // PHP amount
            note: platformFeeChargeId ? 'Platform fee transferred via Xendit' : 'Platform fee recorded (Xendit payout failed)'
          },
        })

        // Add credits to mentor balance (unchanged)
        await tx
          .update(mentors)
          .set({
            creditsBalance: sessionRecord.mentor_credits + mentorEarnings
          })
          .where(eq(mentors.id, sessionRecord.mentor_id))

        // Record mentor payout (unchanged)
        await tx.insert(mentorPayouts).values({
          mentorId: sessionRecord.mentor_id,
          sessionId: sessionId,
          earnedCredits: mentorEarnings,
          platformFeeCredits: platformFeeCredits,
          feePercentage: 20,
          status: 'released',
          releasedAt: now,
        })

        // Record credit transaction for mentor (unchanged)
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
            platformFeeCredits,
            platformFeePhp,
            originalAmount: sessionRecord.totalCostCredits,
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

        // Log payment processing
        await sessionLogService.logEvent({
          sessionId,
          eventType: 'payment_processed',
          actorType: 'system',
          description: `Mentor paid ${mentorEarnings} credits, platform fee ${platformFeeCredits} credits (₱${platformFeePhp})`,
          metadata: {
            mentorEarnings,
            platformFeeCredits,
            platformFeePhp,
            xenditPayoutId: platformFeeChargeId,
            totalAmount: sessionRecord.totalCostCredits
          }
        })
      }

      // Process refund (unchanged)
      if (shouldRefundLearner && sessionRecord.escrowCredits > 0) {
        await tx
          .update(learners)
          .set({
            creditsBalance: sessionRecord.learner_credits + sessionRecord.escrowCredits
          })
          .where(eq(learners.id, sessionRecord.learner_id))

        await tx
          .update(bookingSessions)
          .set({
            refundAmount: sessionRecord.escrowCredits,
            refundProcessedAt: now,
          })
          .where(eq(bookingSessions.id, sessionId))

        await tx.insert(creditTransactions).values({
          userId: sessionRecord.learner_user_id,
          type: 'session_refund',
          direction: 'credit',
          amount: sessionRecord.escrowCredits,
          balanceBefore: sessionRecord.learner_credits,
          balanceAfter: sessionRecord.learner_credits + sessionRecord.escrowCredits,
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
          message: `You have been refunded ${sessionRecord.escrowCredits} credits. Reason: ${refundReason}`,
          relatedEntityType: 'session',
          relatedEntityId: sessionId,
        })

        // Log refund processing
        await sessionLogService.logEvent({
          sessionId,
          eventType: 'refund_processed',
          actorType: 'system',
          description: `Learner refunded ${sessionRecord.escrowCredits} credits - ${refundReason}`,
          metadata: {
            refundAmount: sessionRecord.escrowCredits,
            refundReason,
            finalStatus
          }
        })
      }

      // Add completion notifications for both users
      if (!shouldRefundLearner) {
        notificationData.push({
          userId: sessionRecord.learner_user_id,
          type: 'session_completed',
          title: 'Session Completed!',
          message: 'Your session has been completed successfully. Share your feedback to help improve the platform!',
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
        platformFeePhp,
        alreadyCompleted: false
      }
    })

    // Archive chat messages AFTER transaction completes (best-effort, non-blocking)
    // This prevents transaction timeout issues caused by nested DB queries
    if (result.status === 'completed' && result.paymentProcessed) {
      // Run asynchronously without awaiting to avoid blocking the response
      sessionChatService.archiveSession(sessionId).catch(archiveError => {
        console.error(`[SESSION_COMPLETION] Failed to archive chat for session ${sessionId}:`, archiveError)
      })
    }

    return result
  }

  private calculateConnectionDuration(joinedAt: Date | null, leftAt: Date | null, completionTime: Date): number {
    if (!joinedAt) return 0
    const endTime = leftAt || completionTime
    return Math.max(0, endTime.getTime() - joinedAt.getTime())
  }

  private determineCompletionOutcome(
    reason: string,
    learnerDuration: number,
    mentorDuration: number,
    cancellationReason?: string
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
          refundReason: cancellationReason || 'Session cancelled by user'
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