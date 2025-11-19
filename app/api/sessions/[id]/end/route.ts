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

    const { reason = 'completed', cancellationReason } = await request.json()

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
      userId,
      cancellationReason: cancellationReason
    })

    // Parallelize Agora room closure and feedback status check
    // These are independent operations that don't need to block each other
    const [agoraResult, feedbackInfo] = await Promise.all([
      // End Agora call if exists and session was actually completed
      !result.alreadyCompleted && result.agoraChannelName
        ? agoraService.endRoom(result.agoraChannelName, reason).catch(error => {
            console.error('Error ending Agora room:', error)
            return null // Non-blocking error
          })
        : Promise.resolve(null),
      
      // Check feedback status in parallel
      result.success && result.status === 'completed' && !result.alreadyCompleted
        ? db
            .select({
              learnerFeedbackSubmitted: bookingSessions.learnerFeedbackSubmitted,
              mentorFeedbackSubmitted: bookingSessions.mentorFeedbackSubmitted
            })
            .from(bookingSessions)
            .where(eq(bookingSessions.id, sessionId))
            .limit(1)
            .catch(error => {
              console.error('Error checking feedback status:', error)
              return [] // Non-blocking error
            })
        : Promise.resolve([])
    ])

    // Format feedback info from parallel result
    let feedbackInfo_data = {}
    if (agoraResult !== undefined && feedbackInfo && feedbackInfo.length > 0) {
      feedbackInfo_data = {
        learnerFeedbackSubmitted: feedbackInfo[0].learnerFeedbackSubmitted || false,
        mentorFeedbackSubmitted: feedbackInfo[0].mentorFeedbackSubmitted || false,
        shouldShowFeedback: result.status === 'completed' && result.paymentProcessed
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
      feedbackInfo: feedbackInfo_data,
      alreadyEnded: result.alreadyCompleted
    })

  } catch (error) {
    console.error('Error ending session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}