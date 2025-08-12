// Comprehensive booking lifecycle management with refund policy implementation

import { db } from "@/db"
import { bookingSessions, learners, mentors, creditTransactions, notifications, mentorPayouts } from "@/db/schema"
import { eq, and, or, lt, gte, count } from "drizzle-orm"

export class BookingLifecycleService {
  private static instance: BookingLifecycleService
  
  // Configuration constants
  private static readonly EXPIRY_HOURS = 48 
  private static readonly MIN_BOOKING_BUFFER_MINUTES = 30 
  private static readonly MAX_DAILY_REQUESTS_PER_LEARNER = 10 
  private static readonly FULL_REFUND_HOURS = 24 
  private static readonly PARTIAL_REFUND_HOURS = 2 
  private static readonly NO_SHOW_GRACE_MINUTES = 15 
  private static readonly PLATFORM_FEE_PERCENTAGE = 20 

  static getInstance(): BookingLifecycleService {
    if (!BookingLifecycleService.instance) {
      BookingLifecycleService.instance = new BookingLifecycleService()
    }
    return BookingLifecycleService.instance
  }


  calculateExpiryTime(sessionStartTime: Date): Date {
    const now = new Date()
    const standardExpiry = new Date(now.getTime() + BookingLifecycleService.EXPIRY_HOURS * 60 * 60 * 1000)
    
    // If session starts before standard expiry, set expiry to 2 hours before session
    const sessionBufferTime = new Date(sessionStartTime.getTime() - 2 * 60 * 60 * 1000)
    
    return new Date(Math.min(standardExpiry.getTime(), sessionBufferTime.getTime()))
  }

  private calculateRefundPolicy(
    scheduledDateTime: Date,
    totalCostCredits: number,
    cancelledBy: 'learner' | 'mentor' | 'system',
    cancellationTime: Date = new Date()
  ): {
    refundAmount: number
    mentorPayout: number
    refundType: 'full' | 'partial' | 'none'
    reason: string
  } {
    const hoursUntilSession = (scheduledDateTime.getTime() - cancellationTime.getTime()) / (1000 * 60 * 60)
    const mentorEarnings = Math.floor(totalCostCredits * (100 - BookingLifecycleService.PLATFORM_FEE_PERCENTAGE) / 100)

    if (cancelledBy === 'system') {
      return {
        refundAmount: totalCostCredits,
        mentorPayout: 0,
        refundType: 'full',
        reason: 'System auto-cancellation'
      }
    }

    if (cancelledBy === 'mentor') {
      if (hoursUntilSession >= BookingLifecycleService.FULL_REFUND_HOURS) {
        // Mentor cancels 24+ hours before
        return {
          refundAmount: totalCostCredits,
          mentorPayout: 0,
          refundType: 'full',
          reason: 'Mentor cancellation with sufficient notice'
        }
      } else {
        // Mentor cancels < 24 hours before (penalty + bonus to learner)
        const bonusCredits = Math.floor(totalCostCredits * 0.1) // 10% bonus
        return {
          refundAmount: totalCostCredits + bonusCredits,
          mentorPayout: 0,
          refundType: 'full',
          reason: 'Mentor short-notice cancellation with penalty bonus'
        }
      }
    }

    if (cancelledBy === 'learner') {
      if (hoursUntilSession >= BookingLifecycleService.FULL_REFUND_HOURS) {
        // Learner cancels 24+ hours before - full refund
        return {
          refundAmount: totalCostCredits,
          mentorPayout: 0,
          refundType: 'full',
          reason: 'Learner cancellation with sufficient notice'
        }
      } else if (hoursUntilSession >= BookingLifecycleService.PARTIAL_REFUND_HOURS) {
        // Learner cancels 2-24 hours before - partial refund
        const refundAmount = Math.floor(totalCostCredits * 0.5)
        const mentorPayout = Math.floor((totalCostCredits - refundAmount) * (100 - BookingLifecycleService.PLATFORM_FEE_PERCENTAGE) / 100)
        return {
          refundAmount,
          mentorPayout,
          refundType: 'partial',
          reason: 'Learner partial refund policy (2-24 hours notice)'
        }
      } else {
        // Learner cancels < 2 hours before or no-show - no refund
        return {
          refundAmount: 0,
          mentorPayout: mentorEarnings,
          refundType: 'none',
          reason: 'Learner late cancellation or no-show'
        }
      }
    }

    // Default fallback
    return {
      refundAmount: 0,
      mentorPayout: 0,
      refundType: 'none',
      reason: 'Unknown cancellation scenario'
    }
  }

  /**
   * Validate booking request before creation
   */
  async validateBookingRequest(params: {
    learnerId: number
    mentorId: number
    mentorSkillId: number
    scheduledDate: Date
    durationMinutes: number
    totalCostCredits: number
  }): Promise<{ valid: boolean; error?: string }> {
    const { learnerId, mentorId, mentorSkillId, scheduledDate, durationMinutes, totalCostCredits } = params

    try {
      // 1. Check if booking is too close to start time
      const now = new Date()
      const minBookingTime = new Date(now.getTime() + BookingLifecycleService.MIN_BOOKING_BUFFER_MINUTES * 60 * 1000)
      if (scheduledDate < minBookingTime) {
        return { valid: false, error: `Bookings must be made at least ${BookingLifecycleService.MIN_BOOKING_BUFFER_MINUTES} minutes in advance` }
      }

      // 2. Check if booking is in the past
      if (scheduledDate < now) {
        return { valid: false, error: "Cannot book sessions in the past" }
      }

      // 3. Check learner's credit balance
      const [learner] = await db
        .select({ creditsBalance: learners.creditsBalance })
        .from(learners)
        .where(eq(learners.id, learnerId))

      if (!learner || learner.creditsBalance < totalCostCredits) {
        return { valid: false, error: "Insufficient credits" }
      }

      // 4. Rate limiting - check daily request count
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const todayEnd = new Date()
      todayEnd.setHours(23, 59, 59, 999)

      const [requestCount] = await db
        .select({ count: count() })
        .from(bookingSessions)
        .where(
          and(
            eq(bookingSessions.learnerId, learnerId),
            gte(bookingSessions.createdAt, todayStart),
            lt(bookingSessions.createdAt, todayEnd)
          )
        )

      if (requestCount.count >= BookingLifecycleService.MAX_DAILY_REQUESTS_PER_LEARNER) {
        return { valid: false, error: "Daily booking request limit exceeded" }
      }

      return { valid: true }
    } catch (error) {
      console.error("Error validating booking request:", error)
      return { valid: false, error: "Failed to validate booking request" }
    }
  }

  /**
   * Process expired booking requests (auto-cancellation)
   */
  async processExpiredBookings(): Promise<{ processed: number; errors: string[] }> {
    const now = new Date()
    const errors: string[] = []
    let processed = 0

    try {
      // Find all expired pending bookings
      const expiredBookings = await db
        .select({
          id: bookingSessions.id,
          learnerId: bookingSessions.learnerId,
          mentorId: bookingSessions.mentorId,
          totalCostCredits: bookingSessions.totalCostCredits,
          escrowCredits: bookingSessions.escrowCredits,
        })
        .from(bookingSessions)
        .where(
          and(
            eq(bookingSessions.status, "pending"),
            lt(bookingSessions.expiresAt, now)
          )
        )

      for (const booking of expiredBookings) {
        try {
          await db.transaction(async (tx) => {
            // Update booking status to expired
            await tx
              .update(bookingSessions)
              .set({
                status: "cancelled",
                cancelledAt: now,
                cancelledBy: "system",
                cancellationReason: "Request expired without mentor response",
                refundAmount: booking.escrowCredits,
                updatedAt: now,
              })
              .where(eq(bookingSessions.id, booking.id))

            // Refund credits to learner
            const [learner] = await tx
              .select({ creditsBalance: learners.creditsBalance, userId: learners.userId })
              .from(learners)
              .where(eq(learners.id, booking.learnerId))

            if (learner) {
              const newBalance = learner.creditsBalance + booking.escrowCredits
              await tx
                .update(learners)
                .set({ 
                  creditsBalance: newBalance,
                  updatedAt: now 
                })
                .where(eq(learners.id, booking.learnerId))

              // Record refund transaction
              await tx.insert(creditTransactions).values({
                userId: learner.userId,
                type: "session_refund",
                direction: "credit",
                amount: booking.escrowCredits,
                balanceBefore: learner.creditsBalance,
                balanceAfter: newBalance,
                relatedSessionId: booking.id,
                description: "Refund for expired booking request",
                metadata: { reason: "expired", systemProcessed: true },
                createdAt: now,
              })

              // Notify learner
              await tx.insert(notifications).values({
                userId: learner.userId,
                type: "booking_expired",
                title: "Booking Request Expired",
                message: `Your booking request expired without a response from the mentor. ${booking.escrowCredits} credits have been refunded to your account.`,
                relatedEntityType: "session",
                relatedEntityId: booking.id,
                createdAt: now,
              })
            }

            // Notify mentor about missed opportunity
            const [mentor] = await tx
              .select({ userId: mentors.userId })
              .from(mentors)
              .where(eq(mentors.id, booking.mentorId))

            if (mentor) {
              await tx.insert(notifications).values({
                userId: mentor.userId,
                type: "booking_expired",
                title: "Booking Request Expired",
                message: "A booking request expired because you didn't respond in time. Please check your notifications regularly to avoid missing opportunities.",
                relatedEntityType: "session",
                relatedEntityId: booking.id,
                createdAt: now,
              })
            }
          })

          processed++
        } catch (error) {
          console.error(`Error processing expired booking ${booking.id}:`, error)
          errors.push(`Booking ${booking.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      return { processed, errors }
    } catch (error) {
      console.error("Error in processExpiredBookings:", error)
      return { processed, errors: [error instanceof Error ? error.message : 'Unknown error'] }
    }
  }

  /**
   * Cancel a booking with comprehensive refund policy
   */
  async cancelBooking(
    bookingId: number,
    userId: number,
    userRole: 'learner' | 'mentor',
    reason?: string
  ): Promise<{ 
    success: boolean; 
    error?: string; 
    refundAmount?: number; 
    refundType?: 'full' | 'partial' | 'none';
    mentorPayout?: number;
  }> {
    try {
      const result = await db.transaction(async (tx) => {
        // Get booking details
        const [booking] = await tx
          .select({
            id: bookingSessions.id,
            learnerId: bookingSessions.learnerId,
            mentorId: bookingSessions.mentorId,
            status: bookingSessions.status,
            totalCostCredits: bookingSessions.totalCostCredits,
            escrowCredits: bookingSessions.escrowCredits,
            scheduledDate: bookingSessions.scheduledDate,
            durationMinutes: bookingSessions.durationMinutes,
          })
          .from(bookingSessions)
          .where(eq(bookingSessions.id, bookingId))

        if (!booking) {
          throw new Error("Booking not found")
        }

        // Verify user authorization
        const [learner] = await tx.select({ userId: learners.userId }).from(learners).where(eq(learners.id, booking.learnerId))
        const [mentor] = await tx.select({ userId: mentors.userId }).from(mentors).where(eq(mentors.id, booking.mentorId))

        const isAuthorized = (userRole === 'learner' && learner?.userId === userId) || 
                           (userRole === 'mentor' && mentor?.userId === userId)

        if (!isAuthorized) {
          throw new Error("Unauthorized to cancel this booking")
        }

        // Check if booking can be cancelled - Fixed null handling
        const currentStatus = booking.status || "unknown"
        if (!['pending', 'confirmed'].includes(currentStatus)) {
          throw new Error(`Cannot cancel booking with status: ${currentStatus}`)
        }

        const now = new Date()
        const scheduledDateTime = booking.scheduledDate

        // Calculate refund policy
        const refundPolicy = this.calculateRefundPolicy(
          scheduledDateTime,
          booking.totalCostCredits,
          userRole,
          now
        )

        // Update booking status
        await tx
          .update(bookingSessions)
          .set({
            status: "cancelled",
            cancelledBy: userRole,
            cancelledAt: now,
            cancellationReason: reason || `Cancelled by ${userRole}`,
            refundAmount: refundPolicy.refundAmount,
            updatedAt: now,
          })
          .where(eq(bookingSessions.id, bookingId))

        // Process refund if applicable
        if (refundPolicy.refundAmount > 0 && learner) {
          const [learnerData] = await tx
            .select({ creditsBalance: learners.creditsBalance })
            .from(learners)
            .where(eq(learners.id, booking.learnerId))

          if (learnerData) {
            const newBalance = learnerData.creditsBalance + refundPolicy.refundAmount
            await tx
              .update(learners)
              .set({ 
                creditsBalance: newBalance,
                updatedAt: now 
              })
              .where(eq(learners.id, booking.learnerId))

            // Record refund transaction
            await tx.insert(creditTransactions).values({
              userId: learner.userId,
              type: "session_refund",
              direction: "credit",
              amount: refundPolicy.refundAmount,
              balanceBefore: learnerData.creditsBalance,
              balanceAfter: newBalance,
              relatedSessionId: bookingId,
              description: `${refundPolicy.refundType} refund: ${refundPolicy.reason}`,
              metadata: { 
                reason: `${userRole}_cancelled`, 
                cancellationReason: reason,
                hoursUntilSession: Math.round(((scheduledDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)) * 100) / 100
              },
              createdAt: now,
            })
          }
        }

        // Process mentor payout if applicable
        if (refundPolicy.mentorPayout > 0 && mentor) {
          const [mentorData] = await tx
            .select({ creditsBalance: mentors.creditsBalance })
            .from(mentors)
            .where(eq(mentors.id, booking.mentorId))

          if (mentorData) {
            // Update mentor balance
            await tx
              .update(mentors)
              .set({ 
                creditsBalance: mentorData.creditsBalance + refundPolicy.mentorPayout,
                updatedAt: now 
              })
              .where(eq(mentors.id, booking.mentorId))

            // Create payout record
            await tx.insert(mentorPayouts).values({
              mentorId: booking.mentorId,
              sessionId: bookingId,
              earnedCredits: refundPolicy.mentorPayout,
              platformFeeCredits: booking.totalCostCredits - refundPolicy.refundAmount - refundPolicy.mentorPayout,
              feePercentage: BookingLifecycleService.PLATFORM_FEE_PERCENTAGE,
              status: "released",
              releasedAt: now,
              createdAt: now,
            })

            // Record mentor earning transaction
            await tx.insert(creditTransactions).values({
              userId: mentor.userId,
              type: "mentor_payout",
              direction: "credit",
              amount: refundPolicy.mentorPayout,
              balanceBefore: mentorData.creditsBalance,
              balanceAfter: mentorData.creditsBalance + refundPolicy.mentorPayout,
              relatedSessionId: bookingId,
              description: `Partial payout for cancelled session: ${refundPolicy.reason}`,
              createdAt: now,
            })
          }
        }

        // Notify the other party
        const notifyUserId = userRole === 'learner' ? mentor?.userId : learner?.userId
        if (notifyUserId) {
          const refundMessage = refundPolicy.refundAmount > 0 
            ? ` ${refundPolicy.refundAmount} credits have been refunded.`
            : ''
          const payoutMessage = refundPolicy.mentorPayout > 0 
            ? ` You will receive ${refundPolicy.mentorPayout} credits as compensation.`
            : ''

          await tx.insert(notifications).values({
            userId: notifyUserId,
            type: "booking_cancelled",
            title: "Session Cancelled",
            message: `Your session has been cancelled by the ${userRole}.${refundMessage}${payoutMessage}`,
            relatedEntityType: "session",
            relatedEntityId: bookingId,
            createdAt: now,
          })
        }

        // Notify the cancelling user about the outcome
        await tx.insert(notifications).values({
          userId: userId,
          type: "booking_cancelled",
          title: "Session Cancelled Successfully",
          message: `Your session has been cancelled. ${refundPolicy.reason}. ${
            refundPolicy.refundAmount > 0 ? `${refundPolicy.refundAmount} credits refunded.` : 'No refund applicable.'
          }`,
          relatedEntityType: "session",
          relatedEntityId: bookingId,
          createdAt: now,
        })

        return { 
          success: true, 
          refundAmount: refundPolicy.refundAmount,
          refundType: refundPolicy.refundType,
          mentorPayout: refundPolicy.mentorPayout
        }
      })

      return result
    } catch (error) {
      console.error("Error cancelling booking:", error)
      return { success: false, error: error instanceof Error ? error.message : "Failed to cancel booking" }
    }
  }

  /**
   * Handle no-show scenarios
   */
  async handleNoShow(
    bookingId: number,
    noShowParty: 'learner' | 'mentor',
    reportedBy: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await db.transaction(async (tx) => {
        const [booking] = await tx
          .select({
            id: bookingSessions.id,
            learnerId: bookingSessions.learnerId,
            mentorId: bookingSessions.mentorId,
            status: bookingSessions.status,
            totalCostCredits: bookingSessions.totalCostCredits,
            scheduledDate: bookingSessions.scheduledDate,
          })
          .from(bookingSessions)
          .where(eq(bookingSessions.id, bookingId))

        // Fixed null handling for status check
        const currentStatus = booking?.status || "unknown"
        if (!booking || currentStatus !== 'confirmed') {
          throw new Error("Booking not found or not in confirmed status")
        }

        const now = new Date()
        const scheduledDateTime = booking.scheduledDate
        const graceEndTime = new Date(scheduledDateTime.getTime() + BookingLifecycleService.NO_SHOW_GRACE_MINUTES * 60 * 1000)

        // Check if we're past the grace period
        if (now < graceEndTime) {
          throw new Error(`Grace period not yet expired. Please wait until ${graceEndTime.toLocaleTimeString()}`)
        }

        const mentorEarnings = Math.floor(booking.totalCostCredits * (100 - BookingLifecycleService.PLATFORM_FEE_PERCENTAGE) / 100)

        if (noShowParty === 'learner') {
          // Learner no-show: No refund, mentor gets full payout
          await tx
            .update(bookingSessions)
            .set({
              status: "completed",
              cancelledAt: now,
              cancelledBy: "system",
              cancellationReason: "Learner no-show",
              refundAmount: 0,
              updatedAt: now,
            })
            .where(eq(bookingSessions.id, bookingId))

          // Pay mentor
          const [mentorData] = await tx
            .select({ creditsBalance: mentors.creditsBalance, userId: mentors.userId })
            .from(mentors)
            .where(eq(mentors.id, booking.mentorId))

          if (mentorData) {
            await tx
              .update(mentors)
              .set({ 
                creditsBalance: mentorData.creditsBalance + mentorEarnings,
                updatedAt: now 
              })
              .where(eq(mentors.id, booking.mentorId))

            await tx.insert(mentorPayouts).values({
              mentorId: booking.mentorId,
              sessionId: bookingId,
              earnedCredits: mentorEarnings,
              platformFeeCredits: booking.totalCostCredits - mentorEarnings,
              feePercentage: BookingLifecycleService.PLATFORM_FEE_PERCENTAGE,
              status: "released",
              releasedAt: now,
              createdAt: now,
            })

            // Notify mentor
            await tx.insert(notifications).values({
              userId: mentorData.userId,
              type: "no_show_payout",
              title: "No-Show Payout Processed",
              message: `The learner didn't show up for the session. You've received ${mentorEarnings} credits as compensation.`,
              relatedEntityType: "session",
              relatedEntityId: bookingId,
              createdAt: now,
            })
          }

        } else {
          // Mentor no-show: Full refund + bonus to learner
          const bonusCredits = Math.floor(booking.totalCostCredits * 0.1) // 10% bonus
          const totalRefund = booking.totalCostCredits + bonusCredits

          await tx
            .update(bookingSessions)
            .set({
              status: "cancelled",
              cancelledAt: now,
              cancelledBy: "system",
              cancellationReason: "Mentor no-show",
              refundAmount: totalRefund,
              updatedAt: now,
            })
            .where(eq(bookingSessions.id, bookingId))

          // Refund learner with bonus
          const [learnerData] = await tx
            .select({ creditsBalance: learners.creditsBalance, userId: learners.userId })
            .from(learners)
            .where(eq(learners.id, booking.learnerId))

          if (learnerData) {
            await tx
              .update(learners)
              .set({ 
                creditsBalance: learnerData.creditsBalance + totalRefund,
                updatedAt: now 
              })
              .where(eq(learners.id, booking.learnerId))

            await tx.insert(creditTransactions).values({
              userId: learnerData.userId,
              type: "session_refund",
              direction: "credit",
              amount: totalRefund,
              balanceBefore: learnerData.creditsBalance,
              balanceAfter: learnerData.creditsBalance + totalRefund,
              relatedSessionId: bookingId,
              description: `Full refund + 10% bonus for mentor no-show`,
              createdAt: now,
            })

            // Notify learner
            await tx.insert(notifications).values({
              userId: learnerData.userId,
              type: "no_show_refund",
              title: "No-Show Refund Processed",
              message: `The mentor didn't show up for the session. You've received a full refund of ${booking.totalCostCredits} credits plus a ${bonusCredits} credit bonus for the inconvenience.`,
              relatedEntityType: "session",
              relatedEntityId: bookingId,
              createdAt: now,
            })
          }
        }

        return { success: true }
      })

      return result
    } catch (error) {
      console.error("Error handling no-show:", error)
      return { success: false, error: error instanceof Error ? error.message : "Failed to process no-show" }
    }
  }
}