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

  /**
   * Create comprehensive session status notifications
   */
  async createSessionStatusNotification(
    userId: number,
    sessionId: number,
    notificationType: 'session_upcoming' | 'session_started' | 'session_completed' | 'learner_no_show' | 'mentor_no_show' | 'both_no_show' | 'session_ended',
    data: {
      isLearner?: boolean;
      mentorName?: string;
      learnerName?: string;
      scheduledDate?: Date;
      refundAmount?: number;
      payoutAmount?: number;
      skillName?: string;
    } = {}
  ): Promise<{ success: boolean }> {
    let title: string
    let message: string
    
    switch (notificationType) {
      case 'session_upcoming':
        title = data.isLearner ? "Session Available to Join! 🎯" : "Session Ready - Learner May Join 🎯"
        message = data.isLearner 
          ? `Your session with ${data.mentorName || 'your mentor'} is now available. You can join the video room when ready!`
          : `Your session with the learner is ready. They can now join the video room. Be prepared to help!`
        break

      case 'session_started':
        title = data.isLearner ? "Session Started! 🚀" : "Session in Progress! 🚀" 
        message = data.isLearner
          ? `Your session with ${data.mentorName || 'your mentor'} has begun. Make the most of your learning time!`
          : `Your session with the learner has started. Help them achieve their learning goals!`
        break

      case 'session_completed':
        title = data.isLearner ? "Session Completed! ⭐" : "Session Successfully Completed! ⭐"
        message = data.isLearner
          ? `Great job completing your session! Please rate your experience to help other learners.`
          : `You've successfully completed another mentoring session. Your expertise makes a difference!`
        break

      case 'learner_no_show':
        if (data.isLearner) {
          title = "Session No-Show Penalty 🚫"
          message = `You missed your scheduled session. As per our policy, no refund will be issued. Your mentor has been compensated.`
        } else {
          title = "Learner No-Show - Compensation Issued 💰"
          message = `The learner didn't attend the session. You've received ${data.payoutAmount || 0} credits as compensation.`
        }
        break

      case 'mentor_no_show':
        if (data.isLearner) {
          title = "Mentor No-Show - Refund Issued 💰"
          message = `Your mentor didn't attend the session. You've received a full refund of ${data.refundAmount || 0} credits.`
        } else {
          title = "Session No-Show Penalty 🚫"
          message = `You missed your scheduled session. This may affect your mentor rating and account standing.`
        }
        break

      case 'both_no_show':
        title = "Session Cancelled - Full Refund 💰"
        message = `Neither party attended the session. You've received a full refund of ${data.refundAmount || 0} credits.`
        break

      case 'session_ended':
        title = data.isLearner ? "Session Ended - Please Rate! ⭐" : "Session Ended Successfully! ⭐"
        message = data.isLearner
          ? `Your session has ended. Please take a moment to rate your experience and help other learners.`
          : `Your mentoring session has ended. Thank you for sharing your expertise!`
        break

      default:
        title = "Session Update"
        message = "Your session status has been updated."
    }

    return await this.createNotification({
      userId,
      type: notificationType,
      title,
      message,
      relatedEntityType: "session",
      relatedEntityId: sessionId,
    })
  }

  /**
   * Send session notifications to both participants
   */
  async notifyBothParticipants(
    learnerUserId: number,
    mentorUserId: number,
    sessionId: number,
    notificationType: 'session_upcoming' | 'session_started' | 'session_completed' | 'session_ended',
    data: {
      mentorName?: string;
      learnerName?: string;
      scheduledDate?: Date;
      skillName?: string;
    } = {}
  ): Promise<{ learnerNotified: boolean; mentorNotified: boolean }> {
    const [learnerResult, mentorResult] = await Promise.all([
      this.createSessionStatusNotification(learnerUserId, sessionId, notificationType, { 
        ...data, 
        isLearner: true 
      }),
      this.createSessionStatusNotification(mentorUserId, sessionId, notificationType, { 
        ...data, 
        isLearner: false 
      })
    ])

    return {
      learnerNotified: learnerResult.success,
      mentorNotified: mentorResult.success
    }
  }
}

export const notificationService = NotificationService.getInstance()