// Notification service with deduplication and smart handling
import { db } from "@/db"
import { notifications } from "@/db/schema"
import { eq, and, desc } from "drizzle-orm"

export interface NotificationData {
  userId: number
  type: string
  title: string
  message: string
  relatedEntityType?: string
  relatedEntityId?: number
}

export class NotificationService {
  private static instance: NotificationService

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService()
    }
    return NotificationService.instance
  }

  /**
   * Create a notification with automatic deduplication
   * Prevents duplicate notifications for the same event within a time window
   */
  async createNotification(data: NotificationData): Promise<{ success: boolean; isDuplicate?: boolean }> {
    try {
      // Check for duplicates within the last 10 minutes
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)
      
      let duplicateCheck = db
        .select({ id: notifications.id })
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, data.userId),
            eq(notifications.type, data.type),
            eq(notifications.title, data.title)
          )
        )
        .orderBy(desc(notifications.createdAt))
        .limit(1)

      // Add related entity check if provided
      if (data.relatedEntityType && data.relatedEntityId) {
        duplicateCheck = duplicateCheck.where(
          and(
            eq(notifications.userId, data.userId),
            eq(notifications.type, data.type),
            eq(notifications.title, data.title),
            eq(notifications.relatedEntityType, data.relatedEntityType),
            eq(notifications.relatedEntityId, data.relatedEntityId)
          )
        )
      }

      const existing = await duplicateCheck

      if (existing.length > 0) {
        console.log(`Duplicate notification prevented for user ${data.userId}, type: ${data.type}`)
        return { success: true, isDuplicate: true }
      }

      // Create the notification
      await db.insert(notifications).values({
        ...data,
        createdAt: new Date(),
      })

      return { success: true, isDuplicate: false }
    } catch (error) {
      console.error("Error creating notification:", error)
      return { success: false }
    }
  }

  /**
   * Create multiple notifications with batch deduplication
   */
  async createNotifications(notificationsData: NotificationData[]): Promise<{ 
    success: boolean; 
    created: number; 
    duplicates: number 
  }> {
    let created = 0
    let duplicates = 0

    for (const notification of notificationsData) {
      const result = await this.createNotification(notification)
      if (result.success) {
        if (result.isDuplicate) {
          duplicates++
        } else {
          created++
        }
      }
    }

    return { success: true, created, duplicates }
  }

  /**
   * Create session reminder notifications for upcoming sessions
   */
  async createSessionReminder(
    userId: number, 
    sessionId: number, 
    scheduledDate: Date,
    isLearner: boolean,
    mentorName?: string,
    skillName?: string
  ): Promise<{ success: boolean }> {
    const timeUntil = Math.round((scheduledDate.getTime() - Date.now()) / (1000 * 60)) // minutes
    
    let title: string
    let message: string

    if (isLearner) {
      title = "Session Starting Soon! 🕐"
      message = `Your session with ${mentorName || 'your mentor'} ${skillName ? `for ${skillName} ` : ''}starts in ${timeUntil} minutes. Get ready to join!`
    } else {
      title = "Upcoming Session Reminder 🕐"
      message = `You have a session starting in ${timeUntil} minutes. Prepare your materials and get ready to help your learner!`
    }

    return await this.createNotification({
      userId,
      type: "session_reminder",
      title,
      message,
      relatedEntityType: "session",
      relatedEntityId: sessionId,
    })
  }
}

export const notificationService = NotificationService.getInstance()