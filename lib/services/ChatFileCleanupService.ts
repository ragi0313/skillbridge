import { db } from "@/db"
import { messageAttachments, messages, messageUserDeletions } from "@/db/schema"
import { eq, lt, isNull, and, sql } from "drizzle-orm"
import { del } from "@vercel/blob"

export class ChatFileCleanupService {
  
  /**
   * Clean up orphaned file attachments from deleted messages
   */
  static async cleanupOrphanedAttachments(): Promise<{
    deletedCount: number
    errors: string[]
  }> {
    console.log("🧹 Starting cleanup of orphaned chat file attachments...")
    
    let deletedCount = 0
    const errors: string[] = []
    
    try {
      // Find attachments from messages that have been deleted by all participants
      const orphanedAttachments = await db
        .select({
          id: messageAttachments.id,
          blobPathname: messageAttachments.blobPathname,
          fileUrl: messageAttachments.fileUrl,
          originalFileName: messageAttachments.originalFileName,
          messageId: messageAttachments.messageId,
        })
        .from(messageAttachments)
        .innerJoin(messages, eq(messageAttachments.messageId, messages.id))
        .where(
          // Messages that are permanently deleted (old hard delete system)
          isNull(messages.deletedAt) === false
        )
      
      console.log(`Found ${orphanedAttachments.length} orphaned attachments`)
      
      for (const attachment of orphanedAttachments) {
        try {
          // Delete from Vercel Blob if we have a pathname
          if (attachment.blobPathname) {
            console.log(`Deleting blob: ${attachment.blobPathname}`)
            await del(attachment.blobPathname)
          }
          
          // Delete attachment record from database
          await db
            .delete(messageAttachments)
            .where(eq(messageAttachments.id, attachment.id))
          
          deletedCount++
          console.log(`✅ Deleted attachment: ${attachment.originalFileName}`)
          
        } catch (error) {
          const errorMsg = `Failed to delete attachment ${attachment.originalFileName}: ${error instanceof Error ? error.message : 'Unknown error'}`
          console.error(`❌ ${errorMsg}`)
          errors.push(errorMsg)
        }
      }
      
      console.log(`🧹 Cleanup completed. Deleted ${deletedCount} files, ${errors.length} errors`)
      
      return { deletedCount, errors }
      
    } catch (error) {
      const errorMsg = `Failed to cleanup orphaned attachments: ${error instanceof Error ? error.message : 'Unknown error'}`
      console.error(`❌ ${errorMsg}`)
      return { deletedCount, errors: [errorMsg] }
    }
  }
  
  /**
   * Clean up old file attachments (older than specified days)
   */
  static async cleanupOldAttachments(daysOld: number = 30): Promise<{
    deletedCount: number
    errors: string[]
  }> {
    console.log(`🧹 Starting cleanup of chat files older than ${daysOld} days...`)
    
    let deletedCount = 0
    const errors: string[] = []
    
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysOld)
      
      const oldAttachments = await db
        .select({
          id: messageAttachments.id,
          blobPathname: messageAttachments.blobPathname,
          fileUrl: messageAttachments.fileUrl,
          originalFileName: messageAttachments.originalFileName,
          createdAt: messageAttachments.createdAt,
        })
        .from(messageAttachments)
        .where(lt(messageAttachments.createdAt, cutoffDate))
      
      console.log(`Found ${oldAttachments.length} old attachments`)
      
      for (const attachment of oldAttachments) {
        try {
          // Delete from Vercel Blob if we have a pathname
          if (attachment.blobPathname) {
            console.log(`Deleting old blob: ${attachment.blobPathname}`)
            await del(attachment.blobPathname)
          }
          
          // Delete attachment record from database
          await db
            .delete(messageAttachments)
            .where(eq(messageAttachments.id, attachment.id))
          
          deletedCount++
          console.log(`✅ Deleted old attachment: ${attachment.originalFileName} (${attachment.createdAt})`)
          
        } catch (error) {
          const errorMsg = `Failed to delete old attachment ${attachment.originalFileName}: ${error instanceof Error ? error.message : 'Unknown error'}`
          console.error(`❌ ${errorMsg}`)
          errors.push(errorMsg)
        }
      }
      
      console.log(`🧹 Old files cleanup completed. Deleted ${deletedCount} files, ${errors.length} errors`)
      
      return { deletedCount, errors }
      
    } catch (error) {
      const errorMsg = `Failed to cleanup old attachments: ${error instanceof Error ? error.message : 'Unknown error'}`
      console.error(`❌ ${errorMsg}`)
      return { deletedCount, errors: [errorMsg] }
    }
  }
  
  /**
   * Clean up files from inactive conversations (no messages in X days)
   */
  static async cleanupInactiveConversationFiles(daysInactive: number = 90): Promise<{
    deletedCount: number
    errors: string[]
  }> {
    console.log(`🧹 Starting cleanup of files from conversations inactive for ${daysInactive} days...`)
    
    let deletedCount = 0
    const errors: string[] = []
    
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysInactive)
      
      // Find attachments from conversations with no recent activity
      const inactiveAttachments = await db
        .select({
          id: messageAttachments.id,
          blobPathname: messageAttachments.blobPathname,
          fileUrl: messageAttachments.fileUrl,
          originalFileName: messageAttachments.originalFileName,
        })
        .from(messageAttachments)
        .innerJoin(messages, eq(messageAttachments.messageId, messages.id))
        .where(
          and(
            lt(messages.createdAt, cutoffDate),
            isNull(messages.deletedAt) // Only from active messages
          )
        )
      
      console.log(`Found ${inactiveAttachments.length} attachments from inactive conversations`)
      
      for (const attachment of inactiveAttachments) {
        try {
          // Delete from Vercel Blob if we have a pathname
          if (attachment.blobPathname) {
            console.log(`Deleting inactive conversation blob: ${attachment.blobPathname}`)
            await del(attachment.blobPathname)
          }
          
          // Delete attachment record from database
          await db
            .delete(messageAttachments)
            .where(eq(messageAttachments.id, attachment.id))
          
          deletedCount++
          console.log(`✅ Deleted inactive attachment: ${attachment.originalFileName}`)
          
        } catch (error) {
          const errorMsg = `Failed to delete inactive attachment ${attachment.originalFileName}: ${error instanceof Error ? error.message : 'Unknown error'}`
          console.error(`❌ ${errorMsg}`)
          errors.push(errorMsg)
        }
      }
      
      console.log(`🧹 Inactive conversation cleanup completed. Deleted ${deletedCount} files, ${errors.length} errors`)
      
      return { deletedCount, errors }
      
    } catch (error) {
      const errorMsg = `Failed to cleanup inactive conversation files: ${error instanceof Error ? error.message : 'Unknown error'}`
      console.error(`❌ ${errorMsg}`)
      return { deletedCount, errors: [errorMsg] }
    }
  }
  
  /**
   * Run comprehensive cleanup (combines all cleanup methods)
   */
  static async runFullCleanup(): Promise<{
    totalDeleted: number
    results: Array<{ type: string; deletedCount: number; errors: string[] }>
  }> {
    console.log("🧹 Starting comprehensive chat file cleanup...")
    
    const results = []
    let totalDeleted = 0
    
    // Clean orphaned attachments
    const orphanedResult = await this.cleanupOrphanedAttachments()
    results.push({ type: 'orphaned', ...orphanedResult })
    totalDeleted += orphanedResult.deletedCount
    
    // Clean old attachments (30 days)
    const oldResult = await this.cleanupOldAttachments(30)
    results.push({ type: 'old_files', ...oldResult })
    totalDeleted += oldResult.deletedCount
    
    // Clean inactive conversation files (90 days)
    const inactiveResult = await this.cleanupInactiveConversationFiles(90)
    results.push({ type: 'inactive_conversations', ...inactiveResult })
    totalDeleted += inactiveResult.deletedCount
    
    console.log(`🧹 Comprehensive cleanup completed. Total deleted: ${totalDeleted} files`)
    
    return { totalDeleted, results }
  }
}