import { db } from "@/db"
import { 
  conversations, 
  messages, 
  messageUserDeletions, 
  conversationUserDeletions 
} from "@/db/schema"
import { eq, and, inArray } from "drizzle-orm"

export class ChatCleanupService {
  /**
   * Clean up messages that have been deleted by all participants
   */
  static async cleanupOrphanedMessages(): Promise<{
    deletedMessages: number
    clearedDeletions: number
  }> {
    try {
      // Find messages where all participants have deleted them
      const messagesWithDeletions = await db
        .select({
          messageId: messageUserDeletions.messageId,
          deletionCount: db.$count(messageUserDeletions.messageId)
        })
        .from(messageUserDeletions)
        .groupBy(messageUserDeletions.messageId)
        .having(eq(db.$count(messageUserDeletions.messageId), 2)) // Both mentor and learner deleted

      const messageIdsToDelete = messagesWithDeletions.map(m => m.messageId)

      if (messageIdsToDelete.length === 0) {
        return { deletedMessages: 0, clearedDeletions: 0 }
      }

      // Hard delete the messages
      await db
        .update(messages)
        .set({ 
          isDeleted: true,
          deletedAt: new Date(),
          content: null // Clear content to save space
        })
        .where(inArray(messages.id, messageIdsToDelete))

      // Remove the deletion records since messages are now hard deleted
      await db
        .delete(messageUserDeletions)
        .where(inArray(messageUserDeletions.messageId, messageIdsToDelete))

      console.log(`Cleaned up ${messageIdsToDelete.length} orphaned messages`)
      
      return {
        deletedMessages: messageIdsToDelete.length,
        clearedDeletions: messageIdsToDelete.length
      }
    } catch (error) {
      console.error('Error cleaning up orphaned messages:', error)
      throw error
    }
  }

  /**
   * Clean up conversations that have been deleted by all participants
   */
  static async cleanupOrphanedConversations(): Promise<{
    deactivatedConversations: number
    deletedMessages: number
    clearedDeletions: number
  }> {
    try {
      // Find conversations where all participants have deleted them
      const conversationsWithDeletions = await db
        .select({
          conversationId: conversationUserDeletions.conversationId,
          deletionCount: db.$count(conversationUserDeletions.conversationId)
        })
        .from(conversationUserDeletions)
        .groupBy(conversationUserDeletions.conversationId)
        .having(eq(db.$count(conversationUserDeletions.conversationId), 2)) // Both mentor and learner deleted

      const conversationIdsToCleanup = conversationsWithDeletions.map(c => c.conversationId)

      if (conversationIdsToCleanup.length === 0) {
        return { deactivatedConversations: 0, deletedMessages: 0, clearedDeletions: 0 }
      }

      // Get all messages in these conversations
      const messagesToDelete = await db
        .select({ id: messages.id })
        .from(messages)
        .where(inArray(messages.conversationId, conversationIdsToCleanup))

      const messageIds = messagesToDelete.map(m => m.id)

      // Hard delete all messages in these conversations
      if (messageIds.length > 0) {
        await db
          .update(messages)
          .set({ 
            isDeleted: true,
            deletedAt: new Date(),
            content: null
          })
          .where(inArray(messages.id, messageIds))

        // Clean up message deletion records
        await db
          .delete(messageUserDeletions)
          .where(inArray(messageUserDeletions.messageId, messageIds))
      }

      // Mark conversations as inactive instead of deleting them (for audit trail)
      await db
        .update(conversations)
        .set({ 
          isActive: false,
          updatedAt: new Date()
        })
        .where(inArray(conversations.id, conversationIdsToCleanup))

      // Clean up conversation deletion records
      await db
        .delete(conversationUserDeletions)
        .where(inArray(conversationUserDeletions.conversationId, conversationIdsToCleanup))

      console.log(`Cleaned up ${conversationIdsToCleanup.length} orphaned conversations with ${messageIds.length} messages`)
      
      return {
        deactivatedConversations: conversationIdsToCleanup.length,
        deletedMessages: messageIds.length,
        clearedDeletions: conversationIdsToCleanup.length
      }
    } catch (error) {
      console.error('Error cleaning up orphaned conversations:', error)
      throw error
    }
  }

  /**
   * Full cleanup of both messages and conversations
   */
  static async performFullCleanup(): Promise<{
    messages: { deletedMessages: number; clearedDeletions: number }
    conversations: { deactivatedConversations: number; deletedMessages: number; clearedDeletions: number }
  }> {
    console.log('Starting chat cleanup process...')
    
    const messageCleanup = await this.cleanupOrphanedMessages()
    const conversationCleanup = await this.cleanupOrphanedConversations()
    
    console.log('Chat cleanup completed:', {
      messages: messageCleanup,
      conversations: conversationCleanup
    })
    
    return {
      messages: messageCleanup,
      conversations: conversationCleanup
    }
  }

  /**
   * Get cleanup statistics without performing cleanup
   */
  static async getCleanupStats(): Promise<{
    orphanedMessages: number
    orphanedConversations: number
    totalDeletionRecords: number
  }> {
    try {
      // Count messages with 2 deletion records (both users deleted)
      const orphanedMessages = await db
        .select({
          messageId: messageUserDeletions.messageId,
          deletionCount: db.$count(messageUserDeletions.messageId)
        })
        .from(messageUserDeletions)
        .groupBy(messageUserDeletions.messageId)
        .having(eq(db.$count(messageUserDeletions.messageId), 2))

      // Count conversations with 2 deletion records (both users deleted)
      const orphanedConversations = await db
        .select({
          conversationId: conversationUserDeletions.conversationId,
          deletionCount: db.$count(conversationUserDeletions.conversationId)
        })
        .from(conversationUserDeletions)
        .groupBy(conversationUserDeletions.conversationId)
        .having(eq(db.$count(conversationUserDeletions.conversationId), 2))

      // Count total deletion records
      const [messageDelCount] = await db
        .select({ count: db.$count() })
        .from(messageUserDeletions)

      const [conversationDelCount] = await db
        .select({ count: db.$count() })
        .from(conversationUserDeletions)

      return {
        orphanedMessages: orphanedMessages.length,
        orphanedConversations: orphanedConversations.length,
        totalDeletionRecords: messageDelCount.count + conversationDelCount.count
      }
    } catch (error) {
      console.error('Error getting cleanup stats:', error)
      throw error
    }
  }
}