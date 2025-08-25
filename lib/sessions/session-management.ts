import { db } from "@/db"
import { bookingSessions } from "@/db/schema"
import { eq } from "drizzle-orm"

export class SessionManagementService {
  private static instance: SessionManagementService

  static getInstance(): SessionManagementService {
    if (!SessionManagementService.instance) {
      SessionManagementService.instance = new SessionManagementService()
    }
    return SessionManagementService.instance
  }

  async recordUserLeft(
    sessionId: number,
    userId: number,
    userRole: 'learner' | 'mentor'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const now = new Date()
      
      const updateData: any = {
        updatedAt: now
      }

      if (userRole === 'learner') {
        updateData.learnerLeftAt = now
      } else if (userRole === 'mentor') {
        updateData.mentorLeftAt = now
      }

      await db
        .update(bookingSessions)
        .set(updateData)
        .where(eq(bookingSessions.id, sessionId))

      console.log(`[SESSION_MANAGEMENT] Recorded ${userRole} leaving session ${sessionId}`)

      return { success: true }
    } catch (error) {
      console.error(`[SESSION_MANAGEMENT] Error recording user left:`, error)
      return { success: false, error: "Failed to record user leaving session" }
    }
  }

  async recordUserJoined(
    sessionId: number,
    userId: number,
    userRole: 'learner' | 'mentor'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const now = new Date()
      
      const updateData: any = {
        updatedAt: now
      }

      if (userRole === 'learner') {
        updateData.learnerJoinedAt = now
        updateData.learnerLeftAt = null
      } else if (userRole === 'mentor') {
        updateData.mentorJoinedAt = now
        updateData.mentorLeftAt = null
      }

      await db
        .update(bookingSessions)
        .set(updateData)
        .where(eq(bookingSessions.id, sessionId))

      console.log(`[SESSION_MANAGEMENT] Recorded ${userRole} joining session ${sessionId}`)

      return { success: true }
    } catch (error) {
      console.error(`[SESSION_MANAGEMENT] Error recording user joined:`, error)
      return { success: false, error: "Failed to record user joining session" }
    }
  }

  async updateSessionStatus(
    sessionId: number,
    status: string,
    additionalData?: Record<string, any>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData = {
        status,
        updatedAt: new Date(),
        ...additionalData
      }

      await db
        .update(bookingSessions)
        .set(updateData)
        .where(eq(bookingSessions.id, sessionId))

      console.log(`[SESSION_MANAGEMENT] Updated session ${sessionId} status to ${status}`)

      return { success: true }
    } catch (error) {
      console.error(`[SESSION_MANAGEMENT] Error updating session status:`, error)
      return { success: false, error: "Failed to update session status" }
    }
  }
}