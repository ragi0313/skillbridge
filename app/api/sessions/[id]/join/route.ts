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

    // Check if session is in a joinable state
    if (sessionData.status !== null && !['pending', 'confirmed', 'upcoming', 'ongoing'].includes(sessionData.status)) {
      return NextResponse.json({ 
        error: `Session is not available for joining (status: ${sessionData.status})` 
      }, { status: 400 })
    }

    let joinResult = { isRejoining: false, wasAlreadyJoined: false }

    // Prevent duplicate join tracking with atomic transaction
    await db.transaction(async (tx) => {
      // Re-fetch session data within transaction with FOR UPDATE lock using Drizzle's .for() method
      const sessionRecords = await tx
        .select({
          id: bookingSessions.id,
          status: bookingSessions.status,
          learnerJoinedAt: bookingSessions.learnerJoinedAt,
          mentorJoinedAt: bookingSessions.mentorJoinedAt,
          learnerLeftAt: bookingSessions.learnerLeftAt,
          mentorLeftAt: bookingSessions.mentorLeftAt,
          agoraCallStartedAt: bookingSessions.agoraCallStartedAt,
          startTime: bookingSessions.startTime
        })
        .from(bookingSessions)
        .where(eq(bookingSessions.id, sessionId))
        .for('update') // FOR UPDATE lock
        .limit(1)

      if (sessionRecords.length === 0) {
        throw new Error('Session not found in transaction')
      }

      const sessionRecord = sessionRecords[0]

      // Determine current user's join/leave state
      const userJoinedAt = isLearner ? sessionRecord.learnerJoinedAt : sessionRecord.mentorJoinedAt
      const userLeftAt = isLearner ? sessionRecord.learnerLeftAt : sessionRecord.mentorLeftAt
      const otherUserJoinedAt = isLearner ? sessionRecord.mentorJoinedAt : sessionRecord.learnerJoinedAt
      const otherUserLeftAt = isLearner ? sessionRecord.mentorLeftAt : sessionRecord.learnerLeftAt

      const hasAlreadyJoined = userJoinedAt !== null
      const isRejoining = hasAlreadyJoined && userLeftAt !== null
      const otherUserCurrentlyInSession = otherUserJoinedAt !== null && otherUserLeftAt === null

      if (hasAlreadyJoined && !userLeftAt) {
        // User is already in session and hasn't left - no action needed
        joinResult.wasAlreadyJoined = true
        return
      }

      joinResult.isRejoining = isRejoining

      // Prepare update data
      const updateData: any = {}

      if (!hasAlreadyJoined) {
        // First time joining
        updateData[isLearner ? 'learnerJoinedAt' : 'mentorJoinedAt'] = now
        console.log(`[SESSION_JOIN] User ${userId} joining session ${sessionId} for first time`)
      } else if (isRejoining) {
        // Rejoining after leaving - clear left timestamp
        updateData[isLearner ? 'learnerLeftAt' : 'mentorLeftAt'] = null
        console.log(`[SESSION_JOIN] User ${userId} rejoining session ${sessionId}, cleared left timestamp`)
      }

      // Fixed status determination logic
      const bothUsersWillBeInSession = otherUserCurrentlyInSession || 
        (!hasAlreadyJoined && otherUserJoinedAt !== null && otherUserLeftAt === null)
      
      // Only change status if we're not already in a terminal or ongoing state
      const terminalStatuses = ['completed', 'cancelled', 'ongoing', 'both_no_show', 'mentor_no_show', 'learner_no_show']
      if (!terminalStatuses.includes(sessionRecord.status || '')) {
        if (bothUsersWillBeInSession && now >= sessionStart && !sessionRecord.agoraCallStartedAt) {
          // Both users will be in session and it's session time - mark as ready to start
          updateData.status = 'upcoming'
          console.log(`[SESSION_JOIN] Both users joined at session time, setting to 'upcoming' for session ${sessionId}`)
        } else if (bothUsersWillBeInSession && now < sessionStart) {
          // Both users joined early - confirmed until session time
          updateData.status = 'confirmed'
          console.log(`[SESSION_JOIN] Both users joined early, status 'confirmed' for session ${sessionId}`)
        } else if (sessionRecord.status === 'pending') {
          // First user joining a pending session
          updateData.status = now >= joinWindowStart ? 'upcoming' : 'confirmed'
          console.log(`[SESSION_JOIN] First user joining pending session, status: ${updateData.status}`)
        }
      } else {
        console.log(`[SESSION_JOIN] Session ${sessionId} in terminal/ongoing state: ${sessionRecord.status}, no status change`)
      }

      // Only update if we have changes
      if (Object.keys(updateData).length > 0) {
        await tx
          .update(bookingSessions)
          .set(updateData)
          .where(eq(bookingSessions.id, sessionId))
        
        console.log(`[SESSION_JOIN] Updated session ${sessionId} with:`, updateData)
      } else {
        console.log(`[SESSION_JOIN] No updates needed for session ${sessionId}`)
      }
    })

    const responseMessage = joinResult.wasAlreadyJoined 
      ? 'Already in session'
      : joinResult.isRejoining
      ? 'Successfully rejoined session'
      : 'Successfully joined session'

    console.log(`[SESSION_JOIN] ${responseMessage} for user ${userId} in session ${sessionId}`)

    return NextResponse.json({ 
      success: true,
      message: responseMessage,
      canStartVideo: now >= sessionStart,
      isRejoining: joinResult.isRejoining,
      wasAlreadyJoined: joinResult.wasAlreadyJoined
    })

  } catch (error) {
    console.error('Error joining session:', error)
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message === 'Session not found in transaction') {
        return NextResponse.json({ error: 'Session was deleted or is no longer available' }, { status: 404 })
      }
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Not authorized to join this session' }, { status: 403 })
      }
    }
    
    return NextResponse.json({ 
      error: 'Failed to join session. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error?.toString() : undefined 
    }, { status: 500 })
  }
}