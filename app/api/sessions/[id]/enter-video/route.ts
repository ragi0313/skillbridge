import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { db } from '@/db'
import { bookingSessions, learners, mentors } from '@/db/schema'
import { eq, desc, and } from 'drizzle-orm'

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

    // Check if session can be entered for video call
    const now = new Date()
    const sessionStart = new Date(sessionData.startTime)
    const sessionEnd = new Date(sessionData.endTime)

    if (now > sessionEnd) {
      return NextResponse.json({ error: 'Session has already ended' }, { status: 400 })
    }

    // Check if session is in a state where video call can be started
    if (sessionData.status !== null && !['confirmed', 'upcoming', 'ongoing'].includes(sessionData.status)) {
      return NextResponse.json({ 
        error: `Session is not available for video call (status: ${sessionData.status})` 
      }, { status: 400 })
    }

    let entryResult = { isRejoining: false, wasAlreadyInVideo: false }

    // Update join tracking with atomic transaction
    await db.transaction(async (tx) => {
      // Re-fetch session data within transaction with FOR UPDATE lock
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

      // Determine current user's video call join state
      const userJoinedAt = isLearner ? sessionRecord.learnerJoinedAt : sessionRecord.mentorJoinedAt
      const userLeftAt = isLearner ? sessionRecord.learnerLeftAt : sessionRecord.mentorLeftAt
      const otherUserJoinedAt = isLearner ? sessionRecord.mentorJoinedAt : sessionRecord.learnerJoinedAt
      const otherUserLeftAt = isLearner ? sessionRecord.mentorLeftAt : sessionRecord.learnerLeftAt

      const hasAlreadyJoinedVideo = userJoinedAt !== null
      const isRejoinningVideo = hasAlreadyJoinedVideo && userLeftAt !== null
      const otherUserCurrentlyInVideo = otherUserJoinedAt !== null && otherUserLeftAt === null

      if (hasAlreadyJoinedVideo && !userLeftAt) {
        // User is already in video call and hasn't left - no action needed
        entryResult.wasAlreadyInVideo = true
        return
      }

      entryResult.isRejoining = isRejoinningVideo

      // Prepare update data
      const updateData: any = {}

      if (!hasAlreadyJoinedVideo) {
        // First time entering video call - set joined timestamp
        updateData[isLearner ? 'learnerJoinedAt' : 'mentorJoinedAt'] = now
        console.log(`[VIDEO_ENTRY] User ${userId} entering video call for session ${sessionId} for first time`)
      } else if (isRejoinningVideo) {
        // Re-entering video call after leaving - clear left timestamp
        updateData[isLearner ? 'learnerLeftAt' : 'mentorLeftAt'] = null
        console.log(`[VIDEO_ENTRY] User ${userId} re-entering video call for session ${sessionId}`)
      }

      // Update last active timestamp for session monitoring
      if (!hasAlreadyJoinedVideo) {
        // First time entering video call - set last active timestamp
        updateData[isLearner ? 'learnerLastActiveAt' : 'mentorLastActiveAt'] = now
        console.log(`[VIDEO_ENTRY] Set last active timestamp for user ${userId} session ${sessionId}`)
      } else if (isRejoinningVideo) {
        // Re-entering video call after leaving - update last active timestamp
        updateData[isLearner ? 'learnerLastActiveAt' : 'mentorLastActiveAt'] = now
        console.log(`[VIDEO_ENTRY] Updated last active timestamp for re-entering user ${userId} session ${sessionId}`)
      }

      // Determine if both users will be in video call after this update
      let bothUsersWillBeInVideo = false
      
      if (!hasAlreadyJoinedVideo) {
        // Current user is joining for first time - check if other user is already in video
        bothUsersWillBeInVideo = otherUserJoinedAt !== null && otherUserLeftAt === null
      } else if (isRejoinningVideo) {
        // Current user is rejoining - check if other user is still in video
        bothUsersWillBeInVideo = otherUserJoinedAt !== null && otherUserLeftAt === null
      } else {
        // Current user was already in video - check if other user is also in video
        bothUsersWillBeInVideo = otherUserJoinedAt !== null && otherUserLeftAt === null
      }
      
      // Only change status if we're not already in a terminal state
      const terminalStatuses = ['completed', 'cancelled', 'both_no_show', 'mentor_no_show', 'learner_no_show']
      if (!terminalStatuses.includes(sessionRecord.status || '')) {
        if (bothUsersWillBeInVideo && now >= sessionStart && !sessionRecord.agoraCallStartedAt) {
          // Both users in video call and it's session time - mark as ongoing with call started
          updateData.status = 'ongoing'
          updateData.agoraCallStartedAt = now
          console.log(`[VIDEO_ENTRY] Both users in video call at session time, setting to 'ongoing' for session ${sessionId}`)
        } else if (bothUsersWillBeInVideo && now < sessionStart) {
          // Both users entered video early - keep as upcoming until session time
          updateData.status = 'upcoming'
          console.log(`[VIDEO_ENTRY] Both users in video call early, keeping 'upcoming' for session ${sessionId}`)
        } else if (!bothUsersWillBeInVideo) {
          // First user entering video call or only one user currently in video
          updateData.status = 'upcoming'
          console.log(`[VIDEO_ENTRY] First user or single user entering video call for session ${sessionId}`)
        }
      } else {
        console.log(`[VIDEO_ENTRY] Session ${sessionId} in terminal state: ${sessionRecord.status}, no status change`)
      }

      // Only update if we have changes
      if (Object.keys(updateData).length > 0) {
        await tx
          .update(bookingSessions)
          .set(updateData)
          .where(eq(bookingSessions.id, sessionId))
        
        console.log(`[VIDEO_ENTRY] Updated session ${sessionId} with:`, updateData)
      } else {
        console.log(`[VIDEO_ENTRY] No updates needed for session ${sessionId}`)
      }
    })

    const responseMessage = entryResult.wasAlreadyInVideo 
      ? 'Already in video call'
      : entryResult.isRejoining
      ? 'Successfully re-entered video call'
      : 'Successfully entered video call'

    console.log(`[VIDEO_ENTRY] ${responseMessage} for user ${userId} in session ${sessionId}`)

    return NextResponse.json({ 
      success: true,
      message: responseMessage,
      isRejoining: entryResult.isRejoining,
      wasAlreadyInVideo: entryResult.wasAlreadyInVideo
    })

  } catch (error) {
    console.error('Error entering video call:', error)
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message === 'Session not found in transaction') {
        return NextResponse.json({ error: 'Session was deleted or is no longer available' }, { status: 404 })
      }
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Not authorized to enter this video call' }, { status: 403 })
      }
    }
    
    return NextResponse.json({ 
      error: 'Failed to enter video call. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error?.toString() : undefined 
    }, { status: 500 })
  }
}