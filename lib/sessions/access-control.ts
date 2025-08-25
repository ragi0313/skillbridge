import { db } from "@/db"
import { bookingSessions, learners, mentors, users } from "@/db/schema"
import { eq } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"

export interface SessionAccessValidation {
  isAuthorized: boolean
  userRole?: 'learner' | 'mentor' | 'admin'
  error?: string
  session?: {
    id: number
    status: string | null
    learnerId: number
    mentorId: number
    learnerUserId?: number | null
    mentorUserId?: number | null
  }
}

/**
 * Enhanced access control for 1-on-1 video sessions
 * Ensures only the specific booked learner and mentor can access the session
 */
export async function validateSessionAccess(
  sessionId: number, 
  userId: number
): Promise<SessionAccessValidation> {
  try {
    // Create aliases for user table joins
    const learnerUsers = alias(users, "learner_users")
    const mentorUsers = alias(users, "mentor_users")

    // Get session details with participant information
    const [sessionData] = await db
      .select({
        id: bookingSessions.id,
        status: bookingSessions.status,
        learnerId: bookingSessions.learnerId,
        mentorId: bookingSessions.mentorId,
        learnerUserId: learnerUsers.id,
        mentorUserId: mentorUsers.id,
        learnerJoinedAt: bookingSessions.learnerJoinedAt,
        mentorJoinedAt: bookingSessions.mentorJoinedAt,
        learnerLeftAt: bookingSessions.learnerLeftAt,
        mentorLeftAt: bookingSessions.mentorLeftAt,
        agoraCallEndedAt: bookingSessions.agoraCallEndedAt,
      })
      .from(bookingSessions)
      .leftJoin(learners, eq(bookingSessions.learnerId, learners.id))
      .leftJoin(mentors, eq(bookingSessions.mentorId, mentors.id))
      .leftJoin(learnerUsers, eq(learners.userId, learnerUsers.id))
      .leftJoin(mentorUsers, eq(mentors.userId, mentorUsers.id))
      .where(eq(bookingSessions.id, sessionId))
      .limit(1)

    if (!sessionData) {
      return {
        isAuthorized: false,
        error: "Session not found"
      }
    }

    // Check if user is the booked learner or mentor
    const isLearner = sessionData.learnerUserId === userId
    const isMentor = sessionData.mentorUserId === userId

    if (!isLearner && !isMentor) {
      return {
        isAuthorized: false,
        error: "Access denied. Only the booked learner and mentor can access this session."
      }
    }

    // Determine user role
    const userRole = isLearner ? 'learner' : 'mentor'

    // Additional validation for session status
    const validStatuses = ['pending', 'confirmed', 'upcoming', 'ongoing', 'completed']
    if (!sessionData.status || !validStatuses.includes(sessionData.status)) {
      return {
        isAuthorized: false,
        userRole,
        error: `Session is ${sessionData.status || 'invalid'} and cannot be accessed.`
      }
    }

    return {
      isAuthorized: true,
      userRole,
      session: {
        id: sessionData.id,
        status: sessionData.status,
        learnerId: sessionData.learnerId,
        mentorId: sessionData.mentorId,
        learnerUserId: sessionData.learnerUserId ?? undefined,
        mentorUserId: sessionData.mentorUserId ?? undefined,
      }
    }

  } catch (error) {
    console.error('[ACCESS_CONTROL] Error validating session access:', error)
    return {
      isAuthorized: false,
      error: "Failed to validate session access"
    }
  }
}

/**
 * Check if a user already has an active connection to prevent duplicates
 */
export async function checkActiveConnection(
  sessionId: number, 
  userId: number, 
  userRole: 'learner' | 'mentor'
): Promise<{ hasActiveConnection: boolean; error?: string }> {
  try {
    const [sessionData] = await db
      .select({
        learnerJoinedAt: bookingSessions.learnerJoinedAt,
        learnerLeftAt: bookingSessions.learnerLeftAt,
        mentorJoinedAt: bookingSessions.mentorJoinedAt,
        mentorLeftAt: bookingSessions.mentorLeftAt,
        agoraCallEndedAt: bookingSessions.agoraCallEndedAt,
        status: bookingSessions.status,
      })
      .from(bookingSessions)
      .where(eq(bookingSessions.id, sessionId))
      .limit(1)

    if (!sessionData) {
      return { hasActiveConnection: false, error: "Session not found" }
    }

    // Check if user already has an active connection
    if (userRole === 'learner') {
      const hasActiveConnection = sessionData.learnerJoinedAt && 
                                 !sessionData.learnerLeftAt && 
                                 !sessionData.agoraCallEndedAt
      return { hasActiveConnection: !!hasActiveConnection }
    } else if (userRole === 'mentor') {
      const hasActiveConnection = sessionData.mentorJoinedAt && 
                                 !sessionData.mentorLeftAt && 
                                 !sessionData.agoraCallEndedAt
      return { hasActiveConnection: !!hasActiveConnection }
    }

    return { hasActiveConnection: false }

  } catch (error) {
    console.error('[ACCESS_CONTROL] Error checking active connection:', error)
    return { hasActiveConnection: false, error: "Failed to check connection status" }
  }
}

/**
 * Validate that participant count doesn't exceed 2 for 1-on-1 sessions
 */
export async function validateParticipantLimit(
  sessionId: number
): Promise<{ withinLimit: boolean; currentCount: number; error?: string }> {
  try {
    const [sessionData] = await db
      .select({
        learnerJoinedAt: bookingSessions.learnerJoinedAt,
        learnerLeftAt: bookingSessions.learnerLeftAt,
        mentorJoinedAt: bookingSessions.mentorJoinedAt,
        mentorLeftAt: bookingSessions.mentorLeftAt,
        agoraCallEndedAt: bookingSessions.agoraCallEndedAt,
      })
      .from(bookingSessions)
      .where(eq(bookingSessions.id, sessionId))
      .limit(1)

    if (!sessionData) {
      return { withinLimit: false, currentCount: 0, error: "Session not found" }
    }

    // Count active participants
    let currentCount = 0
    
    if (sessionData.learnerJoinedAt && !sessionData.learnerLeftAt && !sessionData.agoraCallEndedAt) {
      currentCount++
    }
    
    if (sessionData.mentorJoinedAt && !sessionData.mentorLeftAt && !sessionData.agoraCallEndedAt) {
      currentCount++
    }

    // For 1-on-1 sessions, limit is 2
    const withinLimit = currentCount < 2

    return { withinLimit, currentCount }

  } catch (error) {
    console.error('[ACCESS_CONTROL] Error validating participant limit:', error)
    return { withinLimit: false, currentCount: 0, error: "Failed to validate participant limit" }
  }
}