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

    const now = new Date()

    // Update leave timestamp and connection duration with atomic transaction
    await db.transaction(async (tx) => {
      const [currentSession] = await tx
        .select({
          id: bookingSessions.id,
          learnerJoinedAt: bookingSessions.learnerJoinedAt,
          mentorJoinedAt: bookingSessions.mentorJoinedAt,
          learnerLeftAt: bookingSessions.learnerLeftAt,
          mentorLeftAt: bookingSessions.mentorLeftAt,
          learnerConnectionDurationMs: bookingSessions.learnerConnectionDurationMs,
          mentorConnectionDurationMs: bookingSessions.mentorConnectionDurationMs,
        })
        .from(bookingSessions)
        .where(eq(bookingSessions.id, sessionId))
        .limit(1)

      if (!currentSession) {
        throw new Error('Session not found in transaction')
      }

      const updateData: any = {}

      if (isLearner) {
        // Calculate learner connection duration
        const joinTime = currentSession.learnerJoinedAt
        if (joinTime && !currentSession.learnerLeftAt) {
          const connectionDurationMs = now.getTime() - joinTime.getTime()
          updateData.learnerLeftAt = now
          updateData.learnerConnectionDurationMs = Math.max(
            connectionDurationMs, 
            currentSession.learnerConnectionDurationMs || 0
          )
        }
      } else if (isMentor) {
        // Calculate mentor connection duration
        const joinTime = currentSession.mentorJoinedAt
        if (joinTime && !currentSession.mentorLeftAt) {
          const connectionDurationMs = now.getTime() - joinTime.getTime()
          updateData.mentorLeftAt = now
          updateData.mentorConnectionDurationMs = Math.max(
            connectionDurationMs, 
            currentSession.mentorConnectionDurationMs || 0
          )
        }
      }

      if (Object.keys(updateData).length > 0) {
        await tx
          .update(bookingSessions)
          .set(updateData)
          .where(eq(bookingSessions.id, sessionId))
      }
    })

    return NextResponse.json({ 
      success: true,
      message: 'Successfully left session'
    })

  } catch (error) {
    console.error('Error leaving session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}