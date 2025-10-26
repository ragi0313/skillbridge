/**
 * Session Chat Service
 * Hybrid approach: Redis for live chat + DB archive for completed sessions
 */

import { db } from '@/db'
import { sessionMessages } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getRedisConnection } from '@/lib/cache/redis-safe'

const CHAT_TTL_SECONDS = 2 * 60 * 60 // 2 hours

interface ChatMessage {
  id: string
  message: string
  messageType: string
  timestamp: number
  senderName: string
  senderRole: string
  senderId: string
  attachment?: any
}

export class SessionChatService {
  private redis: any = null

  constructor() {
    // Try to connect to Redis (optional)
    try {
      this.redis = getRedisConnection()
    } catch (error) {
      console.warn('[SESSION_CHAT] Redis not available, using database fallback')
    }
  }

  /**
   * Store message during active session
   * Uses Redis for performance, falls back to DB if Redis unavailable
   */
  async storeMessage(
    sessionId: number,
    senderId: number,
    senderRole: string,
    message: string
  ): Promise<ChatMessage> {
    const chatMessage: ChatMessage = {
      id: `${Date.now()}-${senderId}`,
      message,
      messageType: 'text',
      timestamp: Date.now(),
      senderName: '', // Populated by frontend
      senderRole,
      senderId: `${senderRole}-${senderId}`,
    }

    // Try Redis first (preferred for active sessions)
    if (this.redis) {
      try {
        const key = `session:${sessionId}:chat`

        // Get existing messages
        const existing = await this.redis.get(key)
        const messages = existing ? JSON.parse(existing) : []

        // Add new message
        messages.push(chatMessage)

        // Store with TTL
        await this.redis.setex(key, CHAT_TTL_SECONDS, JSON.stringify(messages))

        console.log(`[SESSION_CHAT] Message stored in Redis for session ${sessionId}`)
        return chatMessage
      } catch (redisError) {
        console.error('[SESSION_CHAT] Redis error, falling back to database:', redisError)
      }
    }

    // Fallback: Store in database
    const [stored] = await db
      .insert(sessionMessages)
      .values({
        sessionId,
        senderId,
        senderRole,
        message,
      })
      .returning()

    console.log(`[SESSION_CHAT] Message stored in database for session ${sessionId}`)

    return {
      ...chatMessage,
      id: stored.id.toString(),
      timestamp: stored.timestamp.getTime(),
    }
  }

  /**
   * Retrieve messages for active session
   * Checks Redis first, falls back to DB
   */
  async getMessages(sessionId: number): Promise<ChatMessage[]> {
    // Try Redis first
    if (this.redis) {
      try {
        const key = `session:${sessionId}:chat`
        const data = await this.redis.get(key)

        if (data) {
          console.log(`[SESSION_CHAT] Retrieved ${JSON.parse(data).length} messages from Redis`)
          return JSON.parse(data)
        }
      } catch (redisError) {
        console.error('[SESSION_CHAT] Redis error, falling back to database:', redisError)
      }
    }

    // Fallback: Get from database
    const messages = await db
      .select()
      .from(sessionMessages)
      .where(eq(sessionMessages.sessionId, sessionId))
      .orderBy(sessionMessages.timestamp)

    console.log(`[SESSION_CHAT] Retrieved ${messages.length} messages from database`)

    return messages.map(msg => ({
      id: msg.id.toString(),
      message: msg.message,
      messageType: 'text',
      timestamp: msg.timestamp.getTime(),
      senderName: '',
      senderRole: msg.senderRole,
      senderId: `${msg.senderRole}-${msg.senderId}`,
    }))
  }

  /**
   * Archive session chat to database when session completes
   * Call this when session ends successfully
   */
  async archiveSession(sessionId: number): Promise<void> {
    if (!this.redis) {
      console.log(`[SESSION_CHAT] No Redis - messages already in database`)
      return
    }

    try {
      const key = `session:${sessionId}:chat`
      const data = await this.redis.get(key)

      if (!data) {
        console.log(`[SESSION_CHAT] No messages to archive for session ${sessionId}`)
        return
      }

      const messages: ChatMessage[] = JSON.parse(data)

      // Only archive if there are messages
      if (messages.length === 0) {
        return
      }

      // Check if already archived
      const existing = await db
        .select()
        .from(sessionMessages)
        .where(eq(sessionMessages.sessionId, sessionId))
        .limit(1)

      if (existing.length > 0) {
        console.log(`[SESSION_CHAT] Session ${sessionId} already archived`)
        return
      }

      // Archive to database
      const values = messages.map(msg => ({
        sessionId,
        senderId: parseInt(msg.senderId.split('-')[1]) || 0,
        senderRole: msg.senderRole,
        message: msg.message,
        timestamp: new Date(msg.timestamp),
      }))

      await db.insert(sessionMessages).values(values)

      console.log(`[SESSION_CHAT] Archived ${messages.length} messages for session ${sessionId}`)

      // Keep in Redis for 2 more hours (in case users want to review)
      // Will auto-expire after TTL
    } catch (error) {
      console.error(`[SESSION_CHAT] Error archiving session ${sessionId}:`, error)
      // Don't throw - archival is best-effort
    }
  }

  /**
   * Delete old chat messages from database
   * Call this from a scheduled job (e.g., daily cron)
   */
  async cleanupOldMessages(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

    try {
      const result = await db
        .delete(sessionMessages)
        .where(eq(sessionMessages.timestamp, cutoffDate))
        .returning()

      console.log(`[SESSION_CHAT] Deleted ${result.length} messages older than ${daysToKeep} days`)
      return result.length
    } catch (error) {
      console.error('[SESSION_CHAT] Error cleaning up old messages:', error)
      return 0
    }
  }

  /**
   * Clear Redis cache for a session (e.g., when session is cancelled)
   */
  async clearSession(sessionId: number): Promise<void> {
    if (this.redis) {
      try {
        const key = `session:${sessionId}:chat`
        await this.redis.del(key)
        console.log(`[SESSION_CHAT] Cleared Redis cache for session ${sessionId}`)
      } catch (error) {
        console.error(`[SESSION_CHAT] Error clearing session ${sessionId}:`, error)
      }
    }
  }
}

// Singleton instance
export const sessionChatService = new SessionChatService()
