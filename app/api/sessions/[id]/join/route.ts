import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { db } from '@/db'
import { bookingSessions, learners, mentors } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(
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

    // Get session and verify user authorization
    const sessionQuery = await db
      .select({
        session: bookingSessions,
        learner: learners,
        mentor: mentors,
      })
      .from(bookingSessions)
      .leftJoin(learners, eq(bookingSessions.learnerId, learners.id))
      .leftJoin(mentors, eq(bookingSessions.mentorId, mentors.id))
      .where(eq(bookingSessions.id, sessionId))
      .limit(1)

    if (sessionQuery.length === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const { session: sessionData, learner, mentor } = sessionQuery[0]
    const userId = session.id
    
    // Check if user is authorized
    const isLearner = learner?.userId === userId
    const isMentor = mentor?.userId === userId
    
    if (!isLearner && !isMentor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Check if session can be joined
    const now = new Date()
    const sessionStart = new Date(sessionData.startTime)
    const sessionEnd = new Date(sessionData.endTime)
    const joinWindowStart = new Date(sessionStart.getTime() - 30 * 60 * 1000) // 30 minutes before

    if (now < joinWindowStart) {
      return NextResponse.json({ 
        error: 'Session join window not open yet. You can join 30 minutes before the session start time.',
        canJoinAt: joinWindowStart.toISOString()
      }, { status: 400 })
    }

    if (now > sessionEnd) {
      return NextResponse.json({ error: 'Session has already ended' }, { status: 400 })
    }

    if (sessionData.status !== null && !['pending', 'confirmed', 'upcoming', 'ongoing'].includes(sessionData.status)) {
      return NextResponse.json({ 
        error: `Session is not available for joining (status: ${sessionData.status})` 
      }, { status: 400 })
    }

    // Prevent duplicate join tracking with atomic transaction
    await db.transaction(async (tx) => {
      // Re-fetch session data within transaction to ensure consistency
      const [currentSession] = await tx
        .select({
          id: bookingSessions.id,
          status: bookingSessions.status,
          learnerJoinedAt: bookingSessions.learnerJoinedAt,
          mentorJoinedAt: bookingSessions.mentorJoinedAt,
        })
        .from(bookingSessions)
        .where(eq(bookingSessions.id, sessionId))
        .limit(1)

      if (!currentSession) {
        throw new Error('Session not found in transaction')
      }

      // Check if user has already joined
      const hasAlreadyJoined = isLearner 
        ? currentSession.learnerJoinedAt !== null
        : currentSession.mentorJoinedAt !== null

      if (hasAlreadyJoined) {
        // Allow re-joining without updating timestamp
        return
      }

      // Update join timestamp
      const updateData: any = isLearner 
        ? { learnerJoinedAt: now }
        : { mentorJoinedAt: now }

      // Check if both users have now joined and determine new status
      const otherUserJoinedAt = isLearner 
        ? currentSession.mentorJoinedAt 
        : currentSession.learnerJoinedAt
      
      const bothUsersJoined = otherUserJoinedAt !== null

      if (bothUsersJoined && now >= sessionStart) {
        // Both users joined and it's session time - start the session
        updateData.status = 'ongoing'
        updateData.agoraCallStartedAt = now
      } else if (now >= sessionStart && currentSession.status !== 'ongoing') {
        // It's session time but not both users - mark as upcoming
        updateData.status = 'upcoming'
      } else if (currentSession.status === 'pending' || currentSession.status === 'confirmed') {
        // Before session time - mark as confirmed/upcoming as appropriate
        updateData.status = now >= new Date(sessionStart.getTime() - 30 * 60 * 1000) ? 'upcoming' : 'confirmed'
      }

      await tx
        .update(bookingSessions)
        .set(updateData)
        .where(eq(bookingSessions.id, sessionId))
    })

    return NextResponse.json({ 
      success: true,
      message: 'Successfully joined session',
      canStartVideo: now >= sessionStart
    })

  } catch (error) {
    console.error('Error joining session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}