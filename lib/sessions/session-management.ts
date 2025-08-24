// Enhanced session management with attendance tracking and no-show detection

import { db } from "@/db"
import { bookingSessions, learners, mentors, creditTransactions, notifications, mentorPayouts } from "@/db/schema"
import { eq, and, or, lt, gte, count, sql } from "drizzle-orm"
import { notificationService } from "@/lib/notifications/notification-service"

export interface AttendanceData {
  learnerJoined: boolean
  mentorJoined: boolean
  learnerConnectionTime: number // milliseconds
  mentorConnectionTime: number // milliseconds
  sessionActualDuration: number // milliseconds
  technicalIssues?: boolean
}

export class SessionManagementService {
  private static instance: SessionManagementService
  
  // Configuration constants - Enhanced for smoother transitions
  private static readonly NO_SHOW_GRACE_MINUTES = 15 // Grace period for no-shows
  private static readonly MIN_CONNECTION_TIME_MS = 5 * 60 * 1000 // 5 minutes minimum
  private static readonly NO_SHOW_PATTERN_THRESHOLD = 25 // 25%
  private static readonly ESCROW_HOLD_HOURS = 48
  private static readonly UPCOMING_WINDOW_MINUTES = 30 // Minutes before session to mark as upcoming
  private static readonly AUTO_COMPLETE_BUFFER_MINUTES = 30 // Buffer time after scheduled end

  static getInstance(): SessionManagementService {
    if (!SessionManagementService.instance) {
      SessionManagementService.instance = new SessionManagementService()
    }
    return SessionManagementService.instance
  }

  /**
   * Record user joining a session
   */
  async recordUserJoined(sessionId: number, userId: number, userRole: 'learner' | 'mentor'): Promise<{ success: boolean; error?: string }> {
    try {
      const now = new Date()
      const joinField = userRole === 'learner' ? 'learnerJoinedAt' : 'mentorJoinedAt'
      
      await db.transaction(async (tx) => {
        // First, update the join timestamp
        await tx
          .update(bookingSessions)
          .set({ [joinField]: now, updatedAt: now })
          .where(eq(bookingSessions.id, sessionId))

        // Then check if both users have now joined and transition to ongoing if needed
        const [session] = await tx
          .select({
            id: bookingSessions.id,
            status: bookingSessions.status,
            learnerJoinedAt: bookingSessions.learnerJoinedAt,
            mentorJoinedAt: bookingSessions.mentorJoinedAt,
            scheduledDate: bookingSessions.scheduledDate,
          })
          .from(bookingSessions)
          .where(eq(bookingSessions.id, sessionId))

        if (session) {
          // Check if both users have joined and session should be ongoing
          const learnerJoined = userRole === 'learner' ? true : !!session.learnerJoinedAt
          const mentorJoined = userRole === 'mentor' ? true : !!session.mentorJoinedAt
          
          if (learnerJoined && mentorJoined && 
              (session.status === 'confirmed' || session.status === 'upcoming') &&
              session.scheduledDate <= now) {
            
            const agoraCallStartedAt = userRole === 'learner' ? now : 
                                     userRole === 'mentor' ? now :
                                     new Date(Math.max(session.learnerJoinedAt?.getTime() || 0, session.mentorJoinedAt?.getTime() || 0))

            await tx
              .update(bookingSessions)
              .set({
                status: "ongoing",
                agoraCallStartedAt,
                updatedAt: now,
              })
              .where(eq(bookingSessions.id, sessionId))

            console.log(`Auto-transitioned session ${sessionId} to ongoing status (both users joined)`)
          }
        }
      })

      return { success: true }
    } catch (error) {
      console.error(`Error recording ${userRole} joined:`, error)
      return { success: false, error: error instanceof Error ? error.message : "Failed to record join" }
    }
  }

  /**
   * Record user leaving a session
   */
  async recordUserLeft(sessionId: number, userId: number, userRole: 'learner' | 'mentor'): Promise<{ success: boolean; error?: string }> {
    try {
      const now = new Date()
      const result = await db.transaction(async (tx) => {
        // Get current session data
        const [session] = await tx
          .select({
            id: bookingSessions.id,
            learnerJoinedAt: bookingSessions.learnerJoinedAt,
            mentorJoinedAt: bookingSessions.mentorJoinedAt,
            learnerConnectionDurationMs: bookingSessions.learnerConnectionDurationMs,
            mentorConnectionDurationMs: bookingSessions.mentorConnectionDurationMs,
          })
          .from(bookingSessions)
          .where(eq(bookingSessions.id, sessionId))

        if (!session) {
          throw new Error("Session not found")
        }

        const leftField = userRole === 'learner' ? 'learnerLeftAt' : 'mentorLeftAt'
        const joinedAt = userRole === 'learner' ? session.learnerJoinedAt : session.mentorJoinedAt
        const currentDuration = userRole === 'learner' ? session.learnerConnectionDurationMs : session.mentorConnectionDurationMs

        let connectionDuration = currentDuration || 0
        if (joinedAt) {
          connectionDuration += now.getTime() - joinedAt.getTime()
        }

        const durationField = userRole === 'learner' ? 'learnerConnectionDurationMs' : 'mentorConnectionDurationMs'

        await tx
          .update(bookingSessions)
          .set({ 
            [leftField]: now, 
            [durationField]: connectionDuration,
            updatedAt: now 
          })
          .where(eq(bookingSessions.id, sessionId))

        return { connectionDuration }
      })

      return { success: true }
    } catch (error) {
      console.error(`Error recording ${userRole} left:`, error)
      return { success: false, error: error instanceof Error ? error.message : "Failed to record leave" }
    }
  }

  /**
   * Transition sessions to ongoing when both users have joined
   */
  async transitionScheduledSessions(): Promise<{ processed: number; errors: string[] }> {
    const now = new Date()
    const errors: string[] = []
    let processed = 0

    try {
      // Find sessions where both users have joined but status hasn't been updated to ongoing
      const sessionsToTransition = await db
        .select({
          id: bookingSessions.id,
          status: bookingSessions.status,
          scheduledDate: bookingSessions.scheduledDate,
          learnerJoinedAt: bookingSessions.learnerJoinedAt,
          mentorJoinedAt: bookingSessions.mentorJoinedAt,
        })
        .from(bookingSessions)
        .where(
          and(
            // Sessions that are confirmed or upcoming
            or(
              eq(bookingSessions.status, "confirmed"),
              eq(bookingSessions.status, "upcoming")
            ),
            // Both users have joined
            sql`${bookingSessions.learnerJoinedAt} IS NOT NULL`,
            sql`${bookingSessions.mentorJoinedAt} IS NOT NULL`,
            // Session time has arrived (not future sessions)
            lt(bookingSessions.scheduledDate, now)
          )
        )

      console.log(`Found ${sessionsToTransition.length} sessions to transition to ongoing (both users joined)`)

      for (const session of sessionsToTransition) {
        try {
          const agoraCallStartedAt = session.learnerJoinedAt && session.mentorJoinedAt 
            ? new Date(Math.max(session.learnerJoinedAt.getTime(), session.mentorJoinedAt.getTime()))
            : now

          await db
            .update(bookingSessions)
            .set({
              status: "ongoing",
              agoraCallStartedAt,
              updatedAt: now,
            })
            .where(eq(bookingSessions.id, session.id))

          console.log(`Transitioned session ${session.id} to ongoing status (both users joined)`)
          processed++
        } catch (error) {
          console.error(`Error transitioning session ${session.id}:`, error)
          errors.push(`Session ${session.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      return { processed, errors }
    } catch (error) {
      console.error("Error in transitionScheduledSessions:", error)
      return { processed, errors: [error instanceof Error ? error.message : 'Unknown error'] }
    }
  }

  /**
   * Automatically detect no-shows after grace period
   */
  async detectNoShows(): Promise<{ processed: number; errors: string[]; results: any[] }> {
    const now = new Date()
    const errors: string[] = []
    const results: any[] = []
    let processed = 0

    try {
      // Find sessions where scheduled time has passed by at least 15 minutes grace period and no-show hasn't been checked
      // Check BOTH confirmed and upcoming sessions to catch all cases
      // Also include sessions that might be stuck in other statuses but need no-show detection
      
      const sessionsToCheck = await db
        .select({
          id: bookingSessions.id,
          learnerId: bookingSessions.learnerId,
          mentorId: bookingSessions.mentorId,
          status: bookingSessions.status,
          scheduledDate: bookingSessions.scheduledDate,
          durationMinutes: bookingSessions.durationMinutes,
          learnerJoinedAt: bookingSessions.learnerJoinedAt,
          mentorJoinedAt: bookingSessions.mentorJoinedAt,
          learnerConnectionDurationMs: bookingSessions.learnerConnectionDurationMs,
          mentorConnectionDurationMs: bookingSessions.mentorConnectionDurationMs,
          totalCostCredits: bookingSessions.totalCostCredits,
          noShowCheckedAt: bookingSessions.noShowCheckedAt,
        })
        .from(bookingSessions)
        .where(
          and(
            // Check confirmed, upcoming sessions that should be processed
            or(
              eq(bookingSessions.status, "confirmed"),
              eq(bookingSessions.status, "upcoming")
            ),
            // Session scheduled time + 15 minutes grace period has passed
            sql`${bookingSessions.scheduledDate} + INTERVAL '15 minutes' < ${now}`
            // REMOVED: Don't skip sessions that have been checked - this was the bug!
            // This allows re-checking sessions and catching new bookings
          )
        )

      console.log(`Found ${sessionsToCheck.length} sessions to check for no-shows`)

      for (const session of sessionsToCheck) {
        try {
          // Skip sessions that have already been fully processed (to avoid double processing)
          if (
            session.noShowCheckedAt !== null &&
            session.status !== null &&
            ['both_no_show', 'learner_no_show', 'mentor_no_show', 'completed'].includes(session.status)
          ) {
            continue
          }

          const result = await this.processNoShowDetection(session)
          results.push({
            sessionId: session.id,
            ...result
          })
          processed++
        } catch (error) {
          console.error(`Error processing no-show for session ${session.id}:`, error)
          errors.push(`Session ${session.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      return { processed, errors, results }
    } catch (error) {
      console.error("Error in detectNoShows:", error)
      return { processed, errors: [error instanceof Error ? error.message : 'Unknown error'], results: [] }
    }
  }

  /**
   * Process no-show detection for a specific session
   */
  private async processNoShowDetection(session: any): Promise<{
    learnerNoShow: boolean;
    mentorNoShow: boolean;
    refundProcessed: boolean;
    refundAmount: number;
    mentorPayout: number;
  }> {
    const now = new Date()

    // Check if either party joined the session
    const learnerJoined = !!session.learnerJoinedAt
    const mentorJoined = !!session.mentorJoinedAt

    let newStatus: string
    let refundAmount = 0
    let mentorPayout = 0
    const platformFeePercentage = 20

    console.log(`Processing no-show for session ${session.id}: learnerJoined=${learnerJoined}, mentorJoined=${mentorJoined}, status=${session.status}`)

    if (!learnerJoined && !mentorJoined) {
      // Both no-show - full refund to learner
      newStatus = "both_no_show"
      refundAmount = session.totalCostCredits
      console.log(`🚫 Both parties no-show for session ${session.id} - refunding ${refundAmount} credits to learner`)
    } else if (!learnerJoined && mentorJoined) {
      // Learner no-show - mentor gets paid
      newStatus = "learner_no_show"
      mentorPayout = Math.floor(session.totalCostCredits * (100 - platformFeePercentage) / 100)
      console.log(`👨‍🎓 Learner no-show for session ${session.id} - mentor gets ${mentorPayout} credits`)
    } else if (learnerJoined && !mentorJoined) {
      // Mentor no-show - learner gets full refund (no bonus)
      newStatus = "mentor_no_show"
      refundAmount = session.totalCostCredits
      console.log(`👨‍🏫 Mentor no-show for session ${session.id} - learner gets ${refundAmount} credits refund`)
    } else if (learnerJoined && mentorJoined) {
      // Both joined - this session should have transitioned to 'ongoing' already
      // This indicates a race condition or system issue - transition it now
      console.log(`🚀 Session ${session.id} has both parties joined but wasn't marked ongoing - transitioning now`)
      const agoraCallStartedAt = new Date(Math.max(session.learnerJoinedAt!.getTime(), session.mentorJoinedAt!.getTime()))
      
      await db
        .update(bookingSessions)
        .set({
          status: "ongoing",
          agoraCallStartedAt,
          noShowCheckedAt: now,
          updatedAt: now,
        })
        .where(eq(bookingSessions.id, session.id))

      return {
        learnerNoShow: false,
        mentorNoShow: false,
        refundProcessed: false,
        refundAmount: 0,
        mentorPayout: 0
      }
    } else {
      // This should never happen, but handle gracefully
      console.error(`⚠️ Unexpected state for session ${session.id}: learnerJoined=${learnerJoined}, mentorJoined=${mentorJoined}`)
      throw new Error(`Unexpected session state for session ${session.id}`)
    }

    const notificationResult = await db.transaction(async (tx) => {
      // Update session status
      await tx
        .update(bookingSessions)
        .set({
          status: newStatus as any,
          noShowCheckedAt: now,
          refundAmount,
          updatedAt: now,
        })
        .where(eq(bookingSessions.id, session.id))

      // Process refunds and payouts
      if (refundAmount > 0) {
        await this.processRefund(tx, session.learnerId, refundAmount, session.id, `Auto-refund for no-show`)
      }

      if (mentorPayout > 0) {
        await this.processMentorPayout(tx, session.mentorId, mentorPayout, session.id, session.totalCostCredits)
      }

      // Prepare notifications (don't send inside transaction to avoid duplicates)
      const notificationData = await this.sendNoShowNotifications(tx, session, newStatus, refundAmount, mentorPayout, learnerJoined, mentorJoined)
      
      console.log(`✅ Successfully processed no-show for session ${session.id}: status=${newStatus}, refund=${refundAmount}, payout=${mentorPayout}`)
      
      // Return notifications to send after transaction
      return notificationData
    })

    // Send notifications after transaction with deduplication
    if (notificationResult.notificationsToSend.length > 0) {
      const result = await notificationService.createNotifications(notificationResult.notificationsToSend)
      console.log(`📧 Sent ${result.created} notifications, ${result.duplicates} duplicates prevented for session ${session.id}`)
    }
      
    // Broadcast the status update
    await this.safeBroadcastUpdate(session.id, 'status_change', {
      previousStatus: session.status,
      newStatus,
      systemUpdate: true,
      noShowDetected: true,
      learnerNoShow: !learnerJoined,
      mentorNoShow: !mentorJoined
    })

    return {
      learnerNoShow: !learnerJoined,
      mentorNoShow: !mentorJoined,
      refundProcessed: refundAmount > 0,
      refundAmount,
      mentorPayout
    }
  }

  /**
   * Process refund to learner
   */
  private async processRefund(tx: any, learnerId: number, amount: number, sessionId: number, description: string): Promise<void> {
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
        metadata: { systemProcessed: true, autoDetected: true },
        createdAt: new Date(),
      })
    }
  }

  /**
   * Process mentor payout
   */
  private async processMentorPayout(tx: any, mentorId: number, amount: number, sessionId: number, totalCredits: number): Promise<void> {
    const [mentor] = await tx
      .select({ creditsBalance: mentors.creditsBalance, userId: mentors.userId })
      .from(mentors)
      .where(eq(mentors.id, mentorId))

    if (mentor) {
      const newBalance = mentor.creditsBalance + amount
      await tx
        .update(mentors)
        .set({ creditsBalance: newBalance, updatedAt: new Date() })
        .where(eq(mentors.id, mentorId))

      await tx.insert(mentorPayouts).values({
        mentorId,
        sessionId,
        earnedCredits: amount,
        platformFeeCredits: totalCredits - amount,
        feePercentage: 20,
        status: "released",
        releasedAt: new Date(),
        createdAt: new Date(),
      })

      await tx.insert(creditTransactions).values({
        userId: mentor.userId,
        type: "mentor_payout",
        direction: "credit",
        amount,
        balanceBefore: mentor.creditsBalance,
        balanceAfter: newBalance,
        relatedSessionId: sessionId,
        description: "Auto-payout for learner no-show",
        metadata: { systemProcessed: true, autoDetected: true },
        createdAt: new Date(),
      })
    }
  }


  /**
   * Send notifications for no-show outcomes (with deduplication)
   */
  private async sendNoShowNotifications(tx: any, session: any, status: string, refundAmount: number, mentorPayout: number, learnerJoined: boolean, mentorJoined: boolean): Promise<{ learnerUserId?: number; mentorUserId?: number; notificationsToSend: any[] }> {
    // Get user IDs
    const [learner] = await tx.select({ userId: learners.userId }).from(learners).where(eq(learners.id, session.learnerId))
    const [mentor] = await tx.select({ userId: mentors.userId }).from(mentors).where(eq(mentors.id, session.mentorId))

    const notificationsToSend: any[] = []

    if (!learnerJoined && mentorJoined && learner && mentor) {
      // Learner no-show
      notificationsToSend.push({
        userId: learner.userId,
        type: "no_show_penalty",
        title: "Session No-Show Detected",
        message: `You did not attend your scheduled session. No refund will be issued as per our no-show policy.`,
        relatedEntityType: "session",
        relatedEntityId: session.id,
      })

      notificationsToSend.push({
        userId: mentor.userId,
        type: "no_show_payout",
        title: "No-Show Compensation",
        message: `The learner did not attend the session. You have received ${mentorPayout} credits as compensation.`,
        relatedEntityType: "session",
        relatedEntityId: session.id,
      })
    } else if (learnerJoined && !mentorJoined && learner && mentor) {
      // Mentor no-show
      notificationsToSend.push({
        userId: learner.userId,
        type: "no_show_refund",
        title: "Mentor No-Show Compensation",
        message: `The mentor did not attend your session. You have received a refund of ${refundAmount} credits.`,
        relatedEntityType: "session",
        relatedEntityId: session.id,
      })

      notificationsToSend.push({
        userId: mentor.userId,
        type: "no_show_penalty",
        title: "Session No-Show Penalty",
        message: `You missed your scheduled session. This has been recorded and may affect your account standing.`,
        relatedEntityType: "session",
        relatedEntityId: session.id,
      })
    } else if (!learnerJoined && !mentorJoined && learner) {
      // Both no-show
      notificationsToSend.push({
        userId: learner.userId,
        type: "session_refund",
        title: "Session Cancelled - Both Parties Absent",
        message: `Neither party attended the session. You have received a full refund of ${refundAmount} credits.`,
        relatedEntityType: "session",
        relatedEntityId: session.id,
      })
    }

    return {
      learnerUserId: learner?.userId,
      mentorUserId: mentor?.userId,
      notificationsToSend
    }
  }

  /**
   * Helper function to safely broadcast updates
   */
  private async safeBroadcastUpdate(sessionId: number, updateType: string, data?: any): Promise<void> {
    try {
      // Dynamic import to avoid circular dependencies and SSR issues
      const { broadcastSessionUpdate } = await import("@/app/api/sse/session-updates/route")
      await broadcastSessionUpdate(sessionId, updateType, data)
    } catch (error) {
      console.error(`Failed to broadcast update for session ${sessionId}:`, error)
      // Don't throw - broadcasting is not critical for functionality
    }
  }

  /**
   * Enhanced status transition logic with automatic progression
   */
  async processStatusTransitions(): Promise<{ processed: number; errors: string[] }> {
    const now = new Date()
    const errors: string[] = []
    let processed = 0

    try {
      // 1. Update confirmed sessions to 'upcoming' when within 30 minutes
      const upcomingWindowMinutes = SessionManagementService.UPCOMING_WINDOW_MINUTES || 30
      const upcomingWindow = new Date(now.getTime() + upcomingWindowMinutes * 60 * 1000)
      
      const sessionsToMarkUpcoming = await db
        .select({
          id: bookingSessions.id,
          scheduledDate: bookingSessions.scheduledDate,
        })
        .from(bookingSessions)
        .where(
          and(
            eq(bookingSessions.status, "confirmed"),
            sql`${bookingSessions.scheduledDate} IS NOT NULL`, // Ensure date is not null
            gte(bookingSessions.scheduledDate, now), // Not in the past
            lt(bookingSessions.scheduledDate, upcomingWindow) // Within 30 minutes
          )
        )
      
      console.log(`Found ${sessionsToMarkUpcoming.length} confirmed sessions to mark as upcoming`)

      for (const session of sessionsToMarkUpcoming) {
        try {
          // Validate session data
          if (!session.id || !session.scheduledDate) {
            console.log(`   ⚠️ Skipping invalid session: ID=${session.id}, Date=${session.scheduledDate}`)
            continue
          }

          // Validate the scheduled date
          const scheduledDate = new Date(session.scheduledDate)
          if (isNaN(scheduledDate.getTime())) {
            console.log(`   ⚠️ Skipping session ${session.id} with invalid date: ${session.scheduledDate}`)
            continue
          }

          await db
            .update(bookingSessions)
            .set({
              status: "upcoming",
              updatedAt: now,
            })
            .where(eq(bookingSessions.id, session.id))

          await this.safeBroadcastUpdate(session.id, 'status_change', {
            previousStatus: 'confirmed',
            newStatus: 'upcoming',
            systemUpdate: true,
            autoTransitioned: true
          })

          processed++
          console.log(`   📅 Session ${session.id} transitioned to 'upcoming'`)
        } catch (error) {
          const errorMsg = `Failed to transition session ${session.id} to upcoming: ${error instanceof Error ? error.message : 'Unknown error'}`
          errors.push(errorMsg)
          console.error(`   ❌ ${errorMsg}`)
        }
      }

      // 2. Handle sessions that should transition from upcoming/confirmed to ongoing when users join
      await this.transitionScheduledSessions()

    } catch (error) {
      const errorMsg = `Error in processStatusTransitions: ${error instanceof Error ? error.message : 'Unknown error'}`
      errors.push(errorMsg)
      console.error(`❌ ${errorMsg}`)
    }

    return { processed, errors }
  }

}

// Export helper function for cron jobs or manual execution
export async function runNoShowCheck(): Promise<{ 
  processed: number; 
  errors: string[]; 
  results: Array<{
    sessionId: number;
    learnerNoShow: boolean;
    mentorNoShow: boolean;
    refundProcessed: boolean;
    refundAmount: number;
    mentorPayout: number;
  }>
}> {
  console.log("Starting enhanced session management check...")
  const service = SessionManagementService.getInstance()
  
  // First, process any status transitions
  const statusResults = await service.processStatusTransitions()
  console.log(`Status transitions completed. Processed ${statusResults.processed} sessions.`)
  
  // Then, transition any scheduled sessions to ongoing
  const transitionResults = await service.transitionScheduledSessions()
  console.log(`Session transition completed. Processed ${transitionResults.processed} sessions.`)
  
  // Finally, detect no-shows for sessions past grace period
  const noShowResults = await service.detectNoShows()
  console.log(`No-show check completed. Processed ${noShowResults.processed} sessions.`)
  
  if (noShowResults.results.length > 0) {
    console.log("No-show results:", noShowResults.results)
  }
  
  return {
    processed: statusResults.processed + transitionResults.processed + noShowResults.processed,
    errors: [...statusResults.errors, ...transitionResults.errors, ...noShowResults.errors],
    results: noShowResults.results
  }
}

// Export enhanced session monitoring function
export async function runEnhancedSessionMonitoring(): Promise<{
  statusTransitions: { processed: number; errors: string[] };
  sessionTransitions: { processed: number; errors: string[] };
  noShowDetection: { processed: number; errors: string[]; results: any[] };
  totalProcessed: number;
  totalErrors: string[];
}> {
  console.log("🔍 Starting enhanced session monitoring...")
  const service = SessionManagementService.getInstance()
  
  // Run all monitoring processes
  const statusTransitions = await service.processStatusTransitions()
  const sessionTransitions = await service.transitionScheduledSessions()
  const noShowDetection = await service.detectNoShows()
  
  const totalProcessed = statusTransitions.processed + sessionTransitions.processed + noShowDetection.processed
  const totalErrors = [...statusTransitions.errors, ...sessionTransitions.errors, ...noShowDetection.errors]
  
  console.log(`✅ Enhanced session monitoring completed: ${totalProcessed} sessions processed, ${totalErrors.length} errors`)
  
  return {
    statusTransitions,
    sessionTransitions,
    noShowDetection,
    totalProcessed,
    totalErrors
  }
}