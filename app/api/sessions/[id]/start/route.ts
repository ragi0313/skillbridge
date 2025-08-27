import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { db } from '@/db'
import { bookingSessions, learners, mentors } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { agoraService } from '@/lib/agora/AgoraService'

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
      // Get session and verify user authorization
      const sessionQuery = await tx
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
        throw new Error('Session not found')
      }

      const { session: sessionData, learner, mentor } = sessionQuery[0]
      const userId = session.id
      
      // Check if user is authorized
      const isAuthorized = learner?.userId === userId || mentor?.userId === userId
      
      if (!isAuthorized) {
        throw new Error('Unauthorized')
      }

      // Check if session can be started
      if (sessionData.status === 'ongoing') {
        return { 
          success: true, 
          message: 'Session already ongoing',
          agoraChannelName: sessionData.agoraChannelName,
          alreadyOngoing: true
        }
      }

      if (sessionData.status !== null && !['confirmed', 'upcoming'].includes(sessionData.status)) {
        throw new Error(`Session cannot be started (status: ${sessionData.status})`)
      }

      const now = new Date()
      const sessionStart = new Date(sessionData.startTime)
      
      // Only allow starting if we're within reasonable time of session start (30 min before to 15 min after)
      const earliestStart = new Date(sessionStart.getTime() - 30 * 60 * 1000)
      const latestStart = new Date(sessionStart.getTime() + 15 * 60 * 1000)
      
      if (now < earliestStart) {
        throw new Error('Session cannot be started yet. Please wait until 30 minutes before the scheduled time.')
      }
      
      if (now > latestStart) {
        throw new Error('Session start window has passed. The session may have been marked as a no-show.')
      }

      // Create Agora channel if not exists
      let agoraChannelName = sessionData.agoraChannelName
      let channelCreated = false
      
      if (!agoraChannelName) {
        const agoraRoom = await agoraService.createRoom(sessionId.toString(), new Date(sessionData.endTime))
        agoraChannelName = agoraRoom.channel
        channelCreated = true
      }

      // Update session to ongoing
      const updateData: any = {
        status: 'ongoing',
        agoraCallStartedAt: now,
        agoraChannelName: agoraChannelName,
      }
      
      if (channelCreated) {
        updateData.agoraChannelCreatedAt = now
      }

      await tx
        .update(bookingSessions)
        .set(updateData)
        .where(eq(bookingSessions.id, sessionId))

      return {
        success: true,
        agoraChannelName,
        message: 'Session started successfully',
        alreadyOngoing: false
      }
    })

    return NextResponse.json(result)

  } catch (error) {
    console.error('Error starting session:', error)
    

    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}