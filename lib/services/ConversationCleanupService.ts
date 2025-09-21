import { db } from '@/db/index'
import { conversations, messages, messageUserDeletions, conversationUserDeletions } from '@/db/schema'
import { eq, lt, and, or, desc, count, sql } from 'drizzle-orm'
import { Metrics } from '@/lib/monitoring/metrics'

interface CleanupConfig {
  maxConversationAge: number      // Maximum age for inactive conversations (days)
  maxMessagesPerConversation: number  // Maximum messages to keep per conversation
  maxDeletedMessageAge: number    // Maximum age for soft-deleted messages (days)
  batchSize: number              // Number of records to process at once
  dryRun: boolean               // If true, only log what would be cleaned up
}

const DEFAULT_CONFIG: CleanupConfig = {
  maxConversationAge: 365,        // 1 year for inactive conversations
  maxMessagesPerConversation: 10000,  // Keep last 10k messages per conversation
  maxDeletedMessageAge: 90,       // Keep deleted messages for 90 days
  batchSize: 1000,
  dryRun: false,
}

export class ConversationCleanupService {
  private config: CleanupConfig

  constructor(config: Partial<CleanupConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Run comprehensive cleanup of chat data
   */
  async runCleanup(): Promise<{
    conversationsArchived: number
    messagesDeleted: number
    deletionRecordsRemoved: number
    errors: string[]
  }> {
    const results = {
      conversationsArchived: 0,
      messagesDeleted: 0,
      deletionRecordsRemoved: 0,
      errors: [] as string[]
    }

    console.log('[CLEANUP] Starting conversation cleanup process...', this.config)

    try {
      // Step 1: Archive very old inactive conversations
      const archivedCount = await this.archiveOldConversations()
      results.conversationsArchived = archivedCount

      // Step 2: Clean up excess messages in active conversations
      const deletedMessagesCount = await this.cleanupExcessMessages()
      results.messagesDeleted = deletedMessagesCount

      // Step 3: Remove old deletion records
      const deletionRecordsCount = await this.cleanupOldDeletionRecords()
      results.deletionRecordsRemoved = deletionRecordsCount

      // Log metrics
      Metrics.increment('chat.cleanup.completed', 1, {
        conversations_archived: archivedCount.toString(),
        messages_deleted: deletedMessagesCount.toString(),
      })

      console.log('[CLEANUP] Cleanup completed successfully:', results)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      results.errors.push(errorMessage)
      console.error('[CLEANUP] Cleanup failed:', error)

      Metrics.error('chat.cleanup.failed', 'ConversationCleanupService')
    }

    return results
  }

  /**
   * Archive conversations that haven't been active for a long time
   */
  private async archiveOldConversations(): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - this.config.maxConversationAge)

    console.log(`[CLEANUP] Finding conversations inactive since ${cutoffDate.toISOString()}`)

    try {
      // Find conversations to archive
      const oldConversations = await db
        .select({ id: conversations.id, lastMessageAt: conversations.lastMessageAt })
        .from(conversations)
        .where(
          and(
            eq(conversations.isActive, true),
            or(
              lt(conversations.lastMessageAt, cutoffDate),
              sql`${conversations.lastMessageAt} IS NULL AND ${conversations.createdAt} < ${cutoffDate}`
            )
          )
        )
        .limit(this.config.batchSize)

      if (oldConversations.length === 0) {
        console.log('[CLEANUP] No old conversations found to archive')
        return 0
      }

      console.log(`[CLEANUP] Found ${oldConversations.length} conversations to archive`)

      if (this.config.dryRun) {
        console.log('[CLEANUP] [DRY RUN] Would archive conversations:',
          oldConversations.map(c => c.id))
        return oldConversations.length
      }

      // Archive conversations (mark as inactive)
      const conversationIds = oldConversations.map(c => c.id)

      await db
        .update(conversations)
        .set({
          isActive: false,
          updatedAt: new Date()
        })
        .where(sql`${conversations.id} = ANY(${conversationIds})`)

      console.log(`[CLEANUP] Archived ${oldConversations.length} old conversations`)
      return oldConversations.length

    } catch (error) {
      console.error('[CLEANUP] Error archiving old conversations:', error)
      throw error
    }
  }

  /**
   * Clean up excess messages in conversations (keep only the most recent messages)
   */
  private async cleanupExcessMessages(): Promise<number> {
    let totalDeleted = 0

    try {
      // Find conversations with too many messages
      const conversationsWithExcessMessages = await db
        .select({
          conversationId: messages.conversationId,
          messageCount: count(messages.id)
        })
        .from(messages)
        .groupBy(messages.conversationId)
        .having(sql`count(${messages.id}) > ${this.config.maxMessagesPerConversation}`)
        .limit(100) // Process 100 conversations at a time

      console.log(`[CLEANUP] Found ${conversationsWithExcessMessages.length} conversations with excess messages`)

      for (const conv of conversationsWithExcessMessages) {
        const deleted = await this.cleanupConversationMessages(
          conv.conversationId,
          Number(conv.messageCount)
        )
        totalDeleted += deleted
      }

      return totalDeleted

    } catch (error) {
      console.error('[CLEANUP] Error cleaning up excess messages:', error)
      throw error
    }
  }

  /**
   * Clean up excess messages for a specific conversation
   */
  private async cleanupConversationMessages(conversationId: number, messageCount: number): Promise<number> {
    const excessCount = messageCount - this.config.maxMessagesPerConversation

    if (excessCount <= 0) {
      return 0
    }

    console.log(`[CLEANUP] Conversation ${conversationId} has ${messageCount} messages, removing ${excessCount} oldest`)

    if (this.config.dryRun) {
      console.log(`[CLEANUP] [DRY RUN] Would delete ${excessCount} messages from conversation ${conversationId}`)
      return excessCount
    }

    try {
      // Find the oldest messages to delete (keep the most recent ones)
      const oldMessages = await db
        .select({ id: messages.id })
        .from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(messages.createdAt) // Oldest first
        .limit(excessCount)

      if (oldMessages.length === 0) {
        return 0
      }

      const messageIds = oldMessages.map(m => m.id)

      // Delete messages and their deletion records
      await db.transaction(async (tx) => {
        // Delete user deletion records first (foreign key constraint)
        await tx
          .delete(messageUserDeletions)
          .where(sql`${messageUserDeletions.messageId} = ANY(${messageIds})`)

        // Delete the messages
        await tx
          .delete(messages)
          .where(sql`${messages.id} = ANY(${messageIds})`)
      })

      console.log(`[CLEANUP] Deleted ${oldMessages.length} old messages from conversation ${conversationId}`)
      return oldMessages.length

    } catch (error) {
      console.error(`[CLEANUP] Error cleaning messages for conversation ${conversationId}:`, error)
      throw error
    }
  }

  /**
   * Remove old soft-deletion records
   */
  private async cleanupOldDeletionRecords(): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - this.config.maxDeletedMessageAge)

    let totalRemoved = 0

    try {
      console.log(`[CLEANUP] Removing deletion records older than ${cutoffDate.toISOString()}`)

      // Clean up old message deletion records
      const oldMessageDeletions = await db
        .select({ id: messageUserDeletions.id })
        .from(messageUserDeletions)
        .where(lt(messageUserDeletions.deletedAt, cutoffDate))
        .limit(this.config.batchSize)

      if (oldMessageDeletions.length > 0) {
        console.log(`[CLEANUP] Found ${oldMessageDeletions.length} old message deletion records`)

        if (!this.config.dryRun) {
          const deletionIds = oldMessageDeletions.map(d => d.id)
          await db
            .delete(messageUserDeletions)
            .where(sql`${messageUserDeletions.id} = ANY(${deletionIds})`)

          totalRemoved += oldMessageDeletions.length
        }
      }

      // Clean up old conversation deletion records
      const oldConversationDeletions = await db
        .select({ id: conversationUserDeletions.id })
        .from(conversationUserDeletions)
        .where(lt(conversationUserDeletions.deletedAt, cutoffDate))
        .limit(this.config.batchSize)

      if (oldConversationDeletions.length > 0) {
        console.log(`[CLEANUP] Found ${oldConversationDeletions.length} old conversation deletion records`)

        if (!this.config.dryRun) {
          const deletionIds = oldConversationDeletions.map(d => d.id)
          await db
            .delete(conversationUserDeletions)
            .where(sql`${conversationUserDeletions.id} = ANY(${deletionIds})`)

          totalRemoved += oldConversationDeletions.length
        }
      }

      console.log(`[CLEANUP] Removed ${totalRemoved} old deletion records`)
      return totalRemoved

    } catch (error) {
      console.error('[CLEANUP] Error cleaning up deletion records:', error)
      throw error
    }
  }

  /**
   * Get cleanup statistics without performing cleanup
   */
  async getCleanupStats(): Promise<{
    oldConversations: number
    conversationsWithExcessMessages: number
    oldDeletionRecords: number
    totalMessages: number
    totalConversations: number
  }> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - this.config.maxConversationAge)

      const deletionCutoffDate = new Date()
      deletionCutoffDate.setDate(deletionCutoffDate.getDate() - this.config.maxDeletedMessageAge)

      // Count old conversations
      const [oldConversationsResult] = await db
        .select({ count: count() })
        .from(conversations)
        .where(
          and(
            eq(conversations.isActive, true),
            or(
              lt(conversations.lastMessageAt, cutoffDate),
              sql`${conversations.lastMessageAt} IS NULL AND ${conversations.createdAt} < ${cutoffDate}`
            )
          )
        )

      // Count conversations with excess messages
      const conversationsWithExcess = await db
        .select({ count: count() })
        .from(
          db.select({
            conversationId: messages.conversationId,
            messageCount: count(messages.id)
          })
          .from(messages)
          .groupBy(messages.conversationId)
          .having(sql`count(${messages.id}) > ${this.config.maxMessagesPerConversation}`)
          .as('excess_conversations')
        )

      // Count old deletion records
      const [oldMessageDeletionsResult] = await db
        .select({ count: count() })
        .from(messageUserDeletions)
        .where(lt(messageUserDeletions.deletedAt, deletionCutoffDate))

      const [oldConversationDeletionsResult] = await db
        .select({ count: count() })
        .from(conversationUserDeletions)
        .where(lt(conversationUserDeletions.deletedAt, deletionCutoffDate))

      // Get total counts
      const [totalMessagesResult] = await db
        .select({ count: count() })
        .from(messages)

      const [totalConversationsResult] = await db
        .select({ count: count() })
        .from(conversations)

      return {
        oldConversations: Number(oldConversationsResult.count),
        conversationsWithExcessMessages: Number(conversationsWithExcess[0]?.count || 0),
        oldDeletionRecords: Number(oldMessageDeletionsResult.count) + Number(oldConversationDeletionsResult.count),
        totalMessages: Number(totalMessagesResult.count),
        totalConversations: Number(totalConversationsResult.count),
      }

    } catch (error) {
      console.error('[CLEANUP] Error getting cleanup stats:', error)
      throw error
    }
  }
}

// Export singleton instance for common use
export const conversationCleanupService = new ConversationCleanupService()