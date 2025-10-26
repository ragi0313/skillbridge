import { db } from '@/db'
import { sessionLogs, sessionConnectionLogs } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

export interface LogSessionEventOptions {
  sessionId: number
  eventType: 'status_changed' | 'user_joined' | 'user_left' | 'payment_processed' | 'refund_processed' | 'admin_action' | 'no_show_detected' | 'session_completed' | 'session_cancelled' | 'manual_override'
  actorType: 'system' | 'learner' | 'mentor' | 'admin'
  actorId?: number
  oldStatus?: string
  newStatus?: string
  description: string
  metadata?: Record<string, any>
}

export interface LogConnectionEventOptions {
  sessionId: number
  userId: number
  userRole: 'learner' | 'mentor'
  action: 'joined' | 'left'
  connectionDurationMs?: number
  metadata?: Record<string, any>
}

class SessionLogService {
  /**
   * Log any session event for audit trail
   */
  async logEvent(options: LogSessionEventOptions): Promise<void> {
    try {
      await db.insert(sessionLogs).values({
        sessionId: options.sessionId,
        eventType: options.eventType,
        actorType: options.actorType,
        actorId: options.actorId || null,
        oldStatus: options.oldStatus || null,
        newStatus: options.newStatus || null,
        description: options.description,
        metadata: options.metadata || null,
      })

      console.log(`[SESSION_LOG] ${options.eventType} for session ${options.sessionId} by ${options.actorType}`)
    } catch (error) {
      console.error('[SESSION_LOG] Failed to log session event:', error)
      // Don't throw - logging failures shouldn't break the main flow
    }
  }

  /**
   * Log user join/leave actions
   * This tracks ALL join/leave cycles to detect rapid cycling behavior
   */
  async logConnection(options: LogConnectionEventOptions): Promise<void> {
    try {
      await db.insert(sessionConnectionLogs).values({
        sessionId: options.sessionId,
        userId: options.userId,
        userRole: options.userRole,
        action: options.action,
        connectionDurationMs: options.connectionDurationMs || null,
        metadata: options.metadata || null,
      })

      console.log(`[CONNECTION_LOG] User ${options.userId} ${options.action} session ${options.sessionId}`)
    } catch (error) {
      console.error('[CONNECTION_LOG] Failed to log connection event:', error)
      // Don't throw - logging failures shouldn't break the main flow
    }
  }

  /**
   * Get total actual connection time for a user in a session
   * Handles rapid join/leave cycles
   */
  async getTotalConnectionTime(sessionId: number, userId: number): Promise<number> {
    try {
      const logs = await db
        .select()
        .from(sessionConnectionLogs)
        .where(and(
          eq(sessionConnectionLogs.sessionId, sessionId),
          eq(sessionConnectionLogs.userId, userId)
        ))
        .orderBy(sessionConnectionLogs.createdAt)

      let totalMs = 0
      let lastJoinTime: Date | null = null

      for (const log of logs) {
        if (log.action === 'joined') {
          lastJoinTime = log.createdAt
        } else if (log.action === 'left' && lastJoinTime) {
          const duration = log.createdAt.getTime() - lastJoinTime.getTime()
          totalMs += duration
          lastJoinTime = null
        }
      }

      // If still connected (last action was join), calculate up to now
      if (lastJoinTime) {
        totalMs += Date.now() - lastJoinTime.getTime()
      }

      return totalMs
    } catch (error) {
      console.error('[CONNECTION_LOG] Failed to calculate total connection time:', error)
      return 0
    }
  }

  /**
   * Get join/leave cycle count to detect gaming behavior
   */
  async getJoinLeaveCount(sessionId: number, userId: number): Promise<{ joins: number; leaves: number }> {
    try {
      const logs = await db
        .select()
        .from(sessionConnectionLogs)
        .where(and(
          eq(sessionConnectionLogs.sessionId, sessionId),
          eq(sessionConnectionLogs.userId, userId)
        ))

      const joins = logs.filter(log => log.action === 'joined').length
      const leaves = logs.filter(log => log.action === 'left').length

      return { joins, leaves }
    } catch (error) {
      console.error('[CONNECTION_LOG] Failed to get join/leave count:', error)
      return { joins: 0, leaves: 0 }
    }
  }
}

export const sessionLogService = new SessionLogService()
