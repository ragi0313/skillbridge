import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { db } from '@/db'
import { bookingSessions, learners, mentors } from '@/db/schema'
import { eq, desc, and } from 'drizzle-orm'
import { sessionLogService } from '@/lib/services/SessionLogService'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('[ENTER_VIDEO] API called')
    const session = await getSession()

    if (!session?.id) {
      console.log('[ENTER_VIDEO] Unauthorized - no session')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const sessionId = parseInt(id)
    if (isNaN(sessionId)) {
      console.log('[ENTER_VIDEO] Invalid session ID:', id)
      return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 })
    }

    console.log('[ENTER_VIDEO] Processing for session:', sessionId, 'user:', session.id)

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
      console.log('[ENTER_VIDEO] Starting transaction for session:', sessionId)

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
      console.log('[ENTER_VIDEO] Session record:', {
        id: sessionRecord.id,
        status: sessionRecord.status,
        learnerJoinedAt: sessionRecord.learnerJoinedAt,
        mentorJoinedAt: sessionRecord.mentorJoinedAt,
        learnerLeftAt: sessionRecord.learnerLeftAt,
        mentorLeftAt: sessionRecord.mentorLeftAt
      })

      // Determine current user's video call join state
      const userJoinedAt = isLearner ? sessionRecord.learnerJoinedAt : sessionRecord.mentorJoinedAt
      const userLeftAt = isLearner ? sessionRecord.learnerLeftAt : sessionRecord.mentorLeftAt
      const otherUserJoinedAt = isLearner ? sessionRecord.mentorJoinedAt : sessionRecord.learnerJoinedAt
      const otherUserLeftAt = isLearner ? sessionRecord.mentorLeftAt : sessionRecord.learnerLeftAt

      console.log('[ENTER_VIDEO] User state:', {
        userRole: isLearner ? 'learner' : 'mentor',
        userJoinedAt,
        userLeftAt,
        otherUserJoinedAt,
        otherUserLeftAt
      })

      const hasAlreadyJoinedVideo = userJoinedAt !== null
      const isRejoinningVideo = hasAlreadyJoinedVideo && userLeftAt !== null
      const otherUserCurrentlyInVideo = otherUserJoinedAt !== null && otherUserLeftAt === null

      console.log('[ENTER_VIDEO] Computed state:', {
        hasAlreadyJoinedVideo,
        isRejoinningVideo,
        otherUserCurrentlyInVideo
      })

      if (hasAlreadyJoinedVideo && !userLeftAt) {
        // User is already in video call and hasn't left - no action needed
        console.log('[ENTER_VIDEO] User already in video, skipping update')
        entryResult.wasAlreadyInVideo = true
        return
      }

      entryResult.isRejoining = isRejoinningVideo

      // Prepare update data
      const updateData: any = {}

      if (!hasAlreadyJoinedVideo) {
        // First time entering video call - set joined timestamp
        const joinedAtField = isLearner ? 'learnerJoinedAt' : 'mentorJoinedAt'
        updateData[joinedAtField] = now
        console.log('[ENTER_VIDEO] Setting', joinedAtField, 'to', now)
      } else if (isRejoinningVideo) {
        // Re-entering video call after leaving - clear left timestamp
        const leftAtField = isLearner ? 'learnerLeftAt' : 'mentorLeftAt'
        updateData[leftAtField] = null
        console.log('[ENTER_VIDEO] Clearing', leftAtField)
      }

      // Update last active timestamp for session monitoring
      if (!hasAlreadyJoinedVideo || isRejoinningVideo) {
        const lastActiveField = isLearner ? 'learnerLastActiveAt' : 'mentorLastActiveAt'
        updateData[lastActiveField] = now
        console.log('[ENTER_VIDEO] Setting', lastActiveField, 'to', now)
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

      console.log('[ENTER_VIDEO] Both users will be in video:', bothUsersWillBeInVideo)
      console.log('[ENTER_VIDEO] Current time vs session start:', {
        now: now.toISOString(),
        sessionStart: sessionStart.toISOString(),
        isPastStart: now >= sessionStart
      })

      // Only change status if we're not already in a terminal state
      const terminalStatuses = ['completed', 'cancelled', 'both_no_show', 'mentor_no_show', 'learner_no_show']
      if (!terminalStatuses.includes(sessionRecord.status || '')) {
        if (bothUsersWillBeInVideo && now >= sessionStart && !sessionRecord.agoraCallStartedAt) {
          // Both users in video call and it's session time - mark as ongoing with call started
          updateData.status = 'ongoing'
          updateData.agoraCallStartedAt = now
          console.log('[ENTER_VIDEO] Setting status to ONGOING - both users joined and session time started')
        } else if (bothUsersWillBeInVideo && now < sessionStart) {
          // Both users entered video early - keep as upcoming until session time
          updateData.status = 'upcoming'
          console.log('[ENTER_VIDEO] Keeping status as UPCOMING - both users joined but session hasnt started')
        } else if (!bothUsersWillBeInVideo) {
          // First user entering video call or only one user currently in video
          updateData.status = 'upcoming'
          console.log('[ENTER_VIDEO] Setting status to UPCOMING - waiting for other user')
        }
      } else {
        console.log('[ENTER_VIDEO] Session in terminal status, not updating status:', sessionRecord.status)
      }

      console.log('[ENTER_VIDEO] Final updateData:', updateData)

      // Only update if we have changes
      if (Object.keys(updateData).length > 0) {
        console.log('[ENTER_VIDEO] Executing database update...')
        await tx
          .update(bookingSessions)
          .set(updateData)
          .where(eq(bookingSessions.id, sessionId))
        console.log('[ENTER_VIDEO] Database update completed successfully')
      } else {
        console.log('[ENTER_VIDEO] No changes to update')
      }

      // Log the connection event
      if (!entryResult.wasAlreadyInVideo) {
        await sessionLogService.logConnection({
          sessionId,
          userId,
          userRole: isLearner ? 'learner' : 'mentor',
          action: 'joined',
          metadata: {
            isRejoining: entryResult.isRejoining,
            timestamp: now.toISOString()
          }
        })

        // Also log as session event
        await sessionLogService.logEvent({
          sessionId,
          eventType: 'user_joined',
          actorType: isLearner ? 'learner' : 'mentor',
          actorId: userId,
          oldStatus: sessionRecord.status,
          newStatus: updateData.status || sessionRecord.status,
          description: `${isLearner ? 'Learner' : 'Mentor'} ${entryResult.isRejoining ? 're-entered' : 'entered'} video call`,
          metadata: { isRejoining: entryResult.isRejoining }
        })
      }
    })

    const responseMessage = entryResult.wasAlreadyInVideo
      ? 'Already in video call'
      : entryResult.isRejoining
      ? 'Successfully re-entered video call'
      : 'Successfully entered video call'

    // Fetch updated session status to return to client
    const updatedSession = await db
      .select({
        status: bookingSessions.status,
        learnerJoinedAt: bookingSessions.learnerJoinedAt,
        mentorJoinedAt: bookingSessions.mentorJoinedAt,
        agoraCallStartedAt: bookingSessions.agoraCallStartedAt
      })
      .from(bookingSessions)
      .where(eq(bookingSessions.id, sessionId))
      .limit(1)

    console.log('[ENTER_VIDEO] Updated session state from DB:', {
      status: updatedSession[0]?.status,
      learnerJoinedAt: updatedSession[0]?.learnerJoinedAt,
      mentorJoinedAt: updatedSession[0]?.mentorJoinedAt,
      agoraCallStartedAt: updatedSession[0]?.agoraCallStartedAt
    })

    const responseData = {
      success: true,
      message: responseMessage,
      isRejoining: entryResult.isRejoining,
      wasAlreadyInVideo: entryResult.wasAlreadyInVideo,
      sessionStatus: updatedSession[0]?.status,
      learnerJoined: updatedSession[0]?.learnerJoinedAt !== null,
      mentorJoined: updatedSession[0]?.mentorJoinedAt !== null,
      bothJoined: updatedSession[0]?.learnerJoinedAt !== null && updatedSession[0]?.mentorJoinedAt !== null,
      callStarted: updatedSession[0]?.agoraCallStartedAt !== null
    }

    console.log('[ENTER_VIDEO] Returning response:', responseData)
    return NextResponse.json(responseData)

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