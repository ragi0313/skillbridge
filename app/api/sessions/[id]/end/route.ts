import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { db } from '@/db'
import { bookingSessions, learners, mentors } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { agoraService } from '@/lib/agora/AgoraService'
import { sessionCompletionService } from '@/lib/services/SessionCompletionService'

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

    const { reason = 'completed' } = await request.json()

    // Verify user authorization first
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

    const { learner, mentor } = sessionQuery[0]
    const userId = session.id
    
    // Check if user is authorized
    const isLearner = learner?.userId === userId
    const isMentor = mentor?.userId === userId
    
    if (!isLearner && !isMentor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Use unified completion service
    const result = await sessionCompletionService.completeSession({
      sessionId,
      reason: reason as 'completed' | 'cancelled' | 'technical_issues',
      completedBy: 'user',
      userId
    })

    // End Agora call if exists and session was actually completed (not already completed)
    if (!result.alreadyCompleted) {
      try {
        // Get channel name from session data
        const [sessionData] = await db
          .select({ agoraChannelName: bookingSessions.agoraChannelName })
          .from(bookingSessions)
          .where(eq(bookingSessions.id, sessionId))
          .limit(1)
        
        if (sessionData?.agoraChannelName) {
          await agoraService.endRoom(sessionData.agoraChannelName, reason)
        }
      } catch (error) {
        console.error('Error ending Agora room:', error)
      }
    }

    // Check feedback status if session was successfully completed
    let feedbackInfo = {}
    if (result.success && result.status === 'completed' && !result.alreadyCompleted) {
      try {
        const feedbackQuery = await db
          .select({
            learnerFeedbackSubmitted: bookingSessions.learnerFeedbackSubmitted,
            mentorFeedbackSubmitted: bookingSessions.mentorFeedbackSubmitted
          })
          .from(bookingSessions)
          .where(eq(bookingSessions.id, sessionId))
          .limit(1)

        if (feedbackQuery.length > 0) {
          feedbackInfo = {
            learnerFeedbackSubmitted: feedbackQuery[0].learnerFeedbackSubmitted || false,
            mentorFeedbackSubmitted: feedbackQuery[0].mentorFeedbackSubmitted || false,
            shouldShowFeedback: result.status === 'completed' && result.paymentProcessed
          }
        }
      } catch (error) {
        console.error('Error checking feedback status:', error)
        // Continue without feedback info
      }
    }

    return NextResponse.json({
      success: result.success,
      status: result.status,
      message: result.message,
      sessionData: {
        paymentProcessed: result.paymentProcessed,
        refundProcessed: result.refundProcessed,
        mentorEarnings: result.mentorEarnings
      },
      feedbackInfo,
      alreadyEnded: result.alreadyCompleted
    })

  } catch (error) {
    console.error('Error ending session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}