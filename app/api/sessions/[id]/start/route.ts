import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { db } from '@/db'
import { bookingSessions, learners, mentors } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { agoraService } from '@/lib/agora/AgoraService'
import { logUserAction, AUDIT_ACTIONS, ENTITY_TYPES } from '@/lib/admin/audit-log'

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

    const result = await db.transaction(async (tx) => {
      // Get session with row-level locking using Drizzle's proper syntax
      const sessionRecords = await tx
        .select({
          // Session fields
          id: bookingSessions.id,
          status: bookingSessions.status,
          startTime: bookingSessions.startTime,
          endTime: bookingSessions.endTime,
          learnerJoinedAt: bookingSessions.learnerJoinedAt,
          mentorJoinedAt: bookingSessions.mentorJoinedAt,
          learnerLeftAt: bookingSessions.learnerLeftAt,
          mentorLeftAt: bookingSessions.mentorLeftAt,
          agoraChannelName: bookingSessions.agoraChannelName,
          agoraCallStartedAt: bookingSessions.agoraCallStartedAt,
          // User IDs for authorization
          learnerUserId: learners.userId,
          mentorUserId: mentors.userId,
        })
        .from(bookingSessions)
        .leftJoin(learners, eq(bookingSessions.learnerId, learners.id))
        .leftJoin(mentors, eq(bookingSessions.mentorId, mentors.id))
        .where(eq(bookingSessions.id, sessionId))
        .for('update') // FOR UPDATE lock
        .limit(1)

      if (sessionRecords.length === 0) {
        throw new Error('Session not found')
      }

      const sessionRecord = sessionRecords[0]
      
      // Check if user is authorized
      const userId = session.id
      const isAuthorized = sessionRecord.learnerUserId === userId || sessionRecord.mentorUserId === userId
      
      if (!isAuthorized) {
        throw new Error('Unauthorized')
      }

      // Check if session is already ongoing
      if (sessionRecord.status === 'ongoing') {
        return { 
          success: true, 
          message: 'Session already ongoing',
          agoraChannelName: sessionRecord.agoraChannelName,
          alreadyOngoing: true
        }
      }

      // Check if session can be started - only allow confirmed/upcoming
      if (sessionRecord.status !== null && !['confirmed', 'upcoming'].includes(sessionRecord.status)) {
        throw new Error(`Session cannot be started (status: ${sessionRecord.status})`)
      }

      const now = new Date()
      const sessionStart = new Date(sessionRecord.startTime)
      
      // Only allow starting if we're within reasonable time of session start
      const earliestStart = new Date(sessionStart.getTime() - 30 * 60 * 1000) // 30 min before
      const latestStart = new Date(sessionStart.getTime() + 15 * 60 * 1000)   // 15 min after
      
      if (now < earliestStart) {
        throw new Error('Session cannot be started yet. Please wait until 30 minutes before the scheduled time.')
      }
      
      if (now > latestStart) {
        throw new Error('Session start window has passed. The session may have been marked as a no-show.')
      }

      // Create Agora channel if not exists
      let agoraChannelName = sessionRecord.agoraChannelName
      let channelCreated = false
      
      if (!agoraChannelName) {
        try {
          const agoraRoom = await agoraService.createRoom(sessionId.toString(), new Date(sessionRecord.endTime))
          agoraChannelName = agoraRoom.channel
          channelCreated = true
        } catch (error) {
          console.error('[SESSION_START] Error creating Agora room:', error)
          throw new Error('Failed to create video room. Please try again.')
        }
      }

      // Check current join status properly - both users must be joined AND not left
      const learnerCurrentlyInSession = sessionRecord.learnerJoinedAt !== null && sessionRecord.learnerLeftAt === null
      const mentorCurrentlyInSession = sessionRecord.mentorJoinedAt !== null && sessionRecord.mentorLeftAt === null
      const bothUsersJoined = learnerCurrentlyInSession && mentorCurrentlyInSession
      
      // Prepare update data
      const updateData: any = {
        agoraChannelName: agoraChannelName,
      }
      
      if (channelCreated) {
        updateData.agoraChannelCreatedAt = now
      }

      // Only set to ongoing if both users are actually in session AND it's session time
      if (bothUsersJoined && now >= sessionStart && !sessionRecord.agoraCallStartedAt) {
        // Both users have joined and are still in session - start the call
        updateData.status = 'ongoing'
        updateData.agoraCallStartedAt = now
        } else {
        // Either not both users or not time yet - keep as upcoming but create channel
        updateData.status = 'upcoming'
        }

      await tx
        .update(bookingSessions)
        .set(updateData)
        .where(eq(bookingSessions.id, sessionId))

      const sessionStarted = bothUsersJoined && now >= sessionStart && !sessionRecord.agoraCallStartedAt

      return {
        success: true,
        agoraChannelName,
        message: sessionStarted 
          ? 'Session started successfully' 
          : 'Session prepared and ready to start when both users join',
        alreadyOngoing: false,
        bothUsersJoined,
        sessionStarted,
        waitingForUsers: !bothUsersJoined,
        timeReady: now >= sessionStart,
        details: {
          learnerInSession: learnerCurrentlyInSession,
          mentorInSession: mentorCurrentlyInSession,
          sessionTime: sessionStart.toISOString(),
          currentTime: now.toISOString()
        }
      }
    })

    // Log session start
    const { ipAddress, userAgent } = extractRequestInfo(request)
    await logUserAction({
      userId: session.id,
      action: AUDIT_ACTIONS.SESSION_START,
      entityType: ENTITY_TYPES.SESSION,
      entityId: sessionId,
      description: `Session ${sessionId} started by user ${session.id}`,
      metadata: {
        sessionId,
        userId: session.id,
        agoraChannelName: result.agoraChannelName,
      },
      ipAddress,
      userAgent,
      severity: "info",
    })

    return NextResponse.json(result)

  } catch (error) {
    console.error('[SESSION_START] Error starting session:', error)
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message === 'Session not found') {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 })
      }
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Not authorized to start this session' }, { status: 403 })
      }
      if (error.message.includes('cannot be started yet')) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      if (error.message.includes('start window has passed')) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      if (error.message.includes('cannot be started')) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      if (error.message.includes('Failed to create video room')) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }
    
    return NextResponse.json({ 
      error: 'Failed to start session. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error?.toString() : undefined 
    }, { status: 500 })
  }
}