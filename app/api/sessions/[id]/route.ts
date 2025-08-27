import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { db } from '@/db'
import { bookingSessions, learners, mentors, users } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

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

    // Query session data with proper joins
    const sessionQuery = await db
      .select({
        id: bookingSessions.id,
        learnerId: bookingSessions.learnerId,
        mentorId: bookingSessions.mentorId,
        scheduledDate: bookingSessions.scheduledDate,
        startTime: bookingSessions.startTime,
        endTime: bookingSessions.endTime,
        durationMinutes: bookingSessions.durationMinutes,
        totalCostCredits: bookingSessions.totalCostCredits,
        sessionNotes: bookingSessions.sessionNotes,
        status: bookingSessions.status,
        agoraChannelName: bookingSessions.agoraChannelName,
        learnerJoinedAt: bookingSessions.learnerJoinedAt,
        mentorJoinedAt: bookingSessions.mentorJoinedAt,
        learnerLeftAt: bookingSessions.learnerLeftAt,
        mentorLeftAt: bookingSessions.mentorLeftAt,
        expiresAt: bookingSessions.expiresAt,
        // Learner data
        learner: {
          id: learners.id,
          userId: learners.userId,
          profilePictureUrl: learners.profilePictureUrl,
          timezone: learners.timezone,
        },
        learnerUser: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
        // Mentor data will be selected separately due to JOIN limitations
      })
      .from(bookingSessions)
      .leftJoin(learners, eq(bookingSessions.learnerId, learners.id))
      .leftJoin(users, eq(learners.userId, users.id))
      .where(eq(bookingSessions.id, sessionId))
      .limit(1)

    if (sessionQuery.length === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const sessionData = sessionQuery[0]

    // Get mentor data separately
    const mentorQuery = await db
      .select({
        mentor: {
          id: mentors.id,
          userId: mentors.userId,
          profilePictureUrl: mentors.profilePictureUrl,
          professionalTitle: mentors.professionalTitle,
          timezone: mentors.timezone,
        },
        mentorUser: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
      })
      .from(mentors)
      .leftJoin(users, eq(mentors.userId, users.id))
      .where(eq(mentors.id, sessionData.mentorId))
      .limit(1)

    const mentorData = mentorQuery[0]

    // Check if user is authorized (either learner or mentor)
    const userId = session.id
    const isLearner = sessionData.learner?.userId === userId
    const isMentor = mentorData?.mentor?.userId === userId
    
    if (!isLearner && !isMentor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

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

    // Check for reconnection scenario
    const userJoinedAt = isLearner ? sessionData.learnerJoinedAt : sessionData.mentorJoinedAt
    const userLeftAt = isLearner ? sessionData.learnerLeftAt : sessionData.mentorLeftAt
    const isReconnection = userJoinedAt && userLeftAt

    const response = {
      session: {
        id: sessionData.id,
        scheduledDate: sessionData.scheduledDate,
        startTime: sessionData.startTime,
        endTime: sessionData.endTime,
        durationMinutes: sessionData.durationMinutes,
        status: sessionData.status,
        agoraChannelName: sessionData.agoraChannelName,
        expiresAt: sessionData.expiresAt,
      },
      userRole,
      otherParticipant,
      isReconnection,
      previouslyJoinedAt: userJoinedAt,
      previouslyLeftAt: userLeftAt,
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error fetching session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}