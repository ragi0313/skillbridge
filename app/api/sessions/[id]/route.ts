import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { db } from '@/db'
import { bookingSessions, learners, mentors, users } from '@/db/schema'
import { eq, and, sql } from 'drizzle-orm'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    
    if (!session?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const sessionId = parseInt(id)
    if (isNaN(sessionId)) {
      return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 })
    }

    // OPTIMIZED: Single query with all necessary joins for better performance
    const sessionQuery = await db
      .select({
        // Session data
        id: bookingSessions.id,
        learnerId: bookingSessions.learnerId,
        mentorId: bookingSessions.mentorId,
        scheduledDate: bookingSessions.scheduledDate,
        startTime: bookingSessions.startTime,
        endTime: bookingSessions.endTime,
        durationMinutes: bookingSessions.durationMinutes,
        totalCostCredits: bookingSessions.totalCostCredits,
        escrowCredits: bookingSessions.escrowCredits,
        sessionNotes: bookingSessions.sessionNotes,
        status: bookingSessions.status,
        agoraChannelName: bookingSessions.agoraChannelName,
        agoraCallStartedAt: bookingSessions.agoraCallStartedAt,
        agoraCallEndedAt: bookingSessions.agoraCallEndedAt,
        learnerJoinedAt: bookingSessions.learnerJoinedAt,
        mentorJoinedAt: bookingSessions.mentorJoinedAt,
        learnerLeftAt: bookingSessions.learnerLeftAt,
        mentorLeftAt: bookingSessions.mentorLeftAt,
        learnerConnectionDurationMs: bookingSessions.learnerConnectionDurationMs,
        mentorConnectionDurationMs: bookingSessions.mentorConnectionDurationMs,
        expiresAt: bookingSessions.expiresAt,
        // Learner data
        learner: {
          id: learners.id,
          userId: learners.userId,
          profilePictureUrl: learners.profilePictureUrl,
          timezone: learners.timezone,
        },
        learnerUser: {
          id: sql`learner_users.id`,
          firstName: sql`learner_users.first_name`,
          lastName: sql`learner_users.last_name`,
          email: sql`learner_users.email`,
        },
        // Mentor data in same query
        mentor: {
          id: mentors.id,
          userId: mentors.userId,
          profilePictureUrl: mentors.profilePictureUrl,
          professionalTitle: mentors.professionalTitle,
          timezone: mentors.timezone,
        },
        mentorUser: {
          id: sql`mentor_users.id`,
          firstName: sql`mentor_users.first_name`,
          lastName: sql`mentor_users.last_name`,
          email: sql`mentor_users.email`,
        },
      })
      .from(bookingSessions)
      .leftJoin(learners, eq(bookingSessions.learnerId, learners.id))
      .leftJoin(sql`users as learner_users`, sql`learners.user_id = learner_users.id`)
      .leftJoin(mentors, eq(bookingSessions.mentorId, mentors.id))
      .leftJoin(sql`users as mentor_users`, sql`mentors.user_id = mentor_users.id`)
      .where(eq(bookingSessions.id, sessionId))
      .limit(1)

    if (sessionQuery.length === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const sessionData = sessionQuery[0]
    const mentorData = { mentor: sessionData.mentor, mentorUser: sessionData.mentorUser }

    // Check if user is authorized (either learner or mentor)
    const userId = session.id
    const isLearner = sessionData.learner?.userId === userId
    const isMentor = mentorData?.mentor?.userId === userId
    
    if (!isLearner && !isMentor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Calculate session timing information
    const now = new Date()
    const sessionStart = new Date(sessionData.startTime)
    const sessionEnd = new Date(sessionData.endTime)
    const joinWindowStart = new Date(sessionStart.getTime() - 30 * 60 * 1000)
    const graceWindowEnd = new Date(sessionStart.getTime() + 15 * 60 * 1000)
    
    const timeUntilStart = Math.max(0, Math.floor((sessionStart.getTime() - now.getTime()) / 1000))
    const timeUntilEnd = Math.max(0, Math.floor((sessionEnd.getTime() - now.getTime()) / 1000))
    const sessionElapsed = Math.max(0, Math.floor((now.getTime() - sessionStart.getTime()) / 1000))

    // Determine user role and other participant
    const userRole = isLearner ? 'learner' : 'mentor'
    const otherParticipant = isLearner 
      ? {
          firstName: mentorData?.mentorUser?.firstName || '',
          lastName: mentorData?.mentorUser?.lastName || '',
          profilePictureUrl: mentorData?.mentor?.profilePictureUrl,
          title: mentorData?.mentor?.professionalTitle || 'Mentor',
        }
      : {
          firstName: sessionData.learnerUser?.firstName || '',
          lastName: sessionData.learnerUser?.lastName || '',
          profilePictureUrl: sessionData.learner?.profilePictureUrl,
          title: 'Learner',
        }

    // Calculate connection information
    const userJoinedAt = isLearner ? sessionData.learnerJoinedAt : sessionData.mentorJoinedAt
    const userLeftAt = isLearner ? sessionData.learnerLeftAt : sessionData.mentorLeftAt
    const otherUserJoinedAt = isLearner ? sessionData.mentorJoinedAt : sessionData.learnerJoinedAt
    const otherUserLeftAt = isLearner ? sessionData.mentorLeftAt : sessionData.learnerLeftAt

    // Determine connection states
    const userCurrentlyInSession = userJoinedAt && !userLeftAt
    const otherUserCurrentlyInSession = otherUserJoinedAt && !otherUserLeftAt
    const bothUsersCurrentlyActive = userCurrentlyInSession && otherUserCurrentlyInSession

    // Check for reconnection scenarios
    const isUserReconnection = userJoinedAt && userLeftAt
    const hasUserEverJoined = !!userJoinedAt

    // Calculate connection durations
    let userConnectionDuration = 0
    if (userJoinedAt) {
      const endTime = userLeftAt || now
      userConnectionDuration = Math.floor((endTime.getTime() - userJoinedAt.getTime()) / 1000)
    }

    let otherUserConnectionDuration = 0
    if (otherUserJoinedAt) {
      const endTime = otherUserLeftAt || now
      otherUserConnectionDuration = Math.floor((endTime.getTime() - otherUserJoinedAt.getTime()) / 1000)
    }

    // Session health checks
    const canJoinSession = now >= joinWindowStart && now <= sessionEnd && 
      ['pending', 'confirmed', 'upcoming', 'ongoing'].includes(sessionData.status || '')
    const canStartSession = now >= joinWindowStart && now <= graceWindowEnd &&
      ['confirmed', 'upcoming'].includes(sessionData.status || '')
    const withinGracePeriod = now <= graceWindowEnd
    const sessionHasStarted = now >= sessionStart
    const sessionHasEnded = now > sessionEnd
    const isSessionOngoing = sessionData.status === 'ongoing'

    const response = {
      session: {
        id: sessionData.id,
        scheduledDate: sessionData.scheduledDate,
        startTime: sessionData.startTime,
        endTime: sessionData.endTime,
        durationMinutes: sessionData.durationMinutes,
        status: sessionData.status,
        agoraChannelName: sessionData.agoraChannelName,
        agoraCallStartedAt: sessionData.agoraCallStartedAt,
        agoraCallEndedAt: sessionData.agoraCallEndedAt,
        expiresAt: sessionData.expiresAt,
        totalCostCredits: sessionData.totalCostCredits,
        escrowCredits: sessionData.escrowCredits,
      },
      
      // User information
      userRole,
      otherParticipant,
      
      // Connection state
      userJoinedAt: userJoinedAt?.toISOString() || null,
      userLeftAt: userLeftAt?.toISOString() || null,
      userCurrentlyInSession,
      userConnectionDurationSeconds: userConnectionDuration,
      hasUserEverJoined,
      isUserReconnection,
      
      // Other participant state
      otherUserJoinedAt: otherUserJoinedAt?.toISOString() || null,
      otherUserLeftAt: otherUserLeftAt?.toISOString() || null,
      otherUserCurrentlyInSession,
      otherUserConnectionDurationSeconds: otherUserConnectionDuration,
      bothUsersCurrentlyActive,
      
      // Session timing
      timeUntilStartSeconds: timeUntilStart,
      timeUntilEndSeconds: timeUntilEnd,
      sessionElapsedSeconds: sessionElapsed,
      
      // Session capabilities
      canJoinSession,
      canStartSession,
      sessionHasStarted,
      sessionHasEnded,
      withinGracePeriod,
      isSessionOngoing,
      
      // Additional context
      joinWindowStartsAt: joinWindowStart.toISOString(),
      graceWindowEndsAt: graceWindowEnd.toISOString(),
      
      // Legacy fields for backward compatibility
      isReconnection: isUserReconnection,
      previouslyJoinedAt: userJoinedAt,
      previouslyLeftAt: userLeftAt,
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error fetching session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}