import { db } from "@/db"
import { bookingSessions, creditTransactions, mentorPayouts } from "@/db/schema"
import { eq } from "drizzle-orm"

export class BookingLifecycleService {
  private static instance: BookingLifecycleService

  static getInstance(): BookingLifecycleService {
    if (!BookingLifecycleService.instance) {
      BookingLifecycleService.instance = new BookingLifecycleService()
    }
    return BookingLifecycleService.instance
  }

  async endVideoSession(
    sessionId: number,
    endType: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const now = new Date()
      
      // Get session details first
      const [session] = await db
        .select({
          id: bookingSessions.id,
          status: bookingSessions.status,
          totalCostCredits: bookingSessions.totalCostCredits,
          learnerId: bookingSessions.learnerId,
          mentorId: bookingSessions.mentorId,
          agoraChannelName: bookingSessions.agoraChannelName,
        })
        .from(bookingSessions)
        .where(eq(bookingSessions.id, sessionId))

      if (!session) {
        return { success: false, error: "Session not found" }
      }

      // Determine refund and payment logic based on end type
      let refundAmount = 0
      let mentorPayment = 0
      
      switch (endType) {
        case 'completed':
          // Normal completion - mentor gets paid, no refund
          mentorPayment = Math.floor(session.totalCostCredits * 0.8) // 80% to mentor
          break
          
        case 'technical_issues':
          // Technical issues - full refund to learner
          refundAmount = session.totalCostCredits
          break
          
        case 'learner_no_show':
          // Learner no show - mentor gets paid, no refund
          mentorPayment = session.totalCostCredits
          break
          
        case 'mentor_no_show':
          // Mentor no show - full refund to learner
          refundAmount = session.totalCostCredits
          break
          
        case 'both_no_show':
          // Both no show - full refund to learner
          refundAmount = session.totalCostCredits
          break
      }

      // Update session status and financial data
      await db.transaction(async (tx) => {
        // Update session
        await tx
          .update(bookingSessions)
          .set({
            status: endType,
            agoraCallEndedAt: now,
            refundAmount: refundAmount > 0 ? refundAmount : null,
            updatedAt: now,
          })
          .where(eq(bookingSessions.id, sessionId))

        // Process refund if needed
        if (refundAmount > 0) {
          await tx.insert(creditTransactions).values({
            userId: session.learnerId,
            type: 'session_refund',
            direction: 'credit',
            amount: refundAmount,
            balanceBefore: 0, // Would need to calculate actual balance
            balanceAfter: refundAmount, // Would need to calculate actual balance
            relatedSessionId: sessionId,
            description: `Refund for session ${sessionId} - ${endType}`,
            createdAt: now,
          })
        }

        // Process mentor payment if needed
        if (mentorPayment > 0) {
          const platformFee = session.totalCostCredits - mentorPayment

          await tx.insert(mentorPayouts).values({
            mentorId: session.mentorId,
            sessionId: sessionId,
            earnedCredits: mentorPayment,
            platformFeeCredits: platformFee,
            feePercentage: 20,
            status: 'pending',
            createdAt: now,
          })
        }
      })

      // End Agora channel if it exists
      if (session.agoraChannelName) {
        try {
          const { agoraService } = await import('@/lib/agora/AgoraService')
          await agoraService.endCall(session.agoraChannelName)
          console.log(`[BOOKING_LIFECYCLE] Ended Agora channel: ${session.agoraChannelName}`)
        } catch (agoraError) {
          console.error(`[BOOKING_LIFECYCLE] Failed to end Agora channel:`, agoraError)
          // Don't fail the entire operation for Agora cleanup issues
        }
      }

      console.log(`[BOOKING_LIFECYCLE] Session ${sessionId} ended with type: ${endType}`)

      return { success: true }
    } catch (error) {
      console.error(`[BOOKING_LIFECYCLE] Error ending session:`, error)
      return { success: false, error: "Failed to end session" }
    }
  }
}