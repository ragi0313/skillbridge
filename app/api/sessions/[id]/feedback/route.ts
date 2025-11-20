import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { db } from '@/db'
import { bookingSessions, sessionFeedback, learners, mentors } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

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

    const body = await request.json()
    const {
      userRole,
      overall_rating,
      communication_rating,
      knowledge_rating,
      helpfulness_rating,
      punctuality_rating,
      feedback_text,
      session_highlights,
      improvement_suggestions,
      would_recommend,
      session_pace,
      most_valuable_aspect,
    } = body

    // Validate required fields
    if (!userRole || !overall_rating || !feedback_text?.trim()) {
      return NextResponse.json({
        error: 'Missing required fields: userRole, overall_rating, and feedback_text are required'
      }, { status: 400 })
    }

    if (overall_rating < 1 || overall_rating > 5) {
      return NextResponse.json({
        error: 'Rating must be between 1 and 5'
      }, { status: 400 })
    }

    if (feedback_text.length > 500) {
      return NextResponse.json({
        error: 'Feedback text must be 500 characters or less'
      }, { status: 400 })
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
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Verify user role matches
    if ((userRole === 'learner' && !isLearner) || (userRole === 'mentor' && !isMentor)) {
      return NextResponse.json({
        error: 'User role mismatch'
      }, { status: 400 })
    }

    // Check if session is completed
    if (sessionData.status !== 'completed') {
      return NextResponse.json({
        error: 'Feedback can only be submitted for completed sessions'
      }, { status: 400 })
    }

    // Check if feedback already exists
    const existingFeedback = await db
      .select()
      .from(sessionFeedback)
      .where(
        and(
          eq(sessionFeedback.sessionId, sessionId),
          eq(sessionFeedback.reviewerRole, userRole)
        )
      )
      .limit(1)

    if (existingFeedback.length > 0) {
      return NextResponse.json({
        error: 'Feedback has already been submitted for this session'
      }, { status: 400 })
    }

    // Create feedback record
    const feedbackData = {
      sessionId,
      reviewerUserId: userId,
      reviewerRole: userRole,
      overallRating: overall_rating,
      communicationRating: communication_rating || null,
      knowledgeRating: knowledge_rating || null,
      helpfulnessRating: helpfulness_rating || null,
      punctualityRating: punctuality_rating || null,
      feedbackText: feedback_text.trim(),
      sessionHighlights: session_highlights ? JSON.stringify(session_highlights) : null,
      improvementSuggestions: improvement_suggestions?.trim() || null,
      wouldRecommend: would_recommend,
      sessionPace: session_pace || null,
      mostValuableAspect: most_valuable_aspect?.trim() || null,
      createdAt: new Date(),
    }

    await db.insert(sessionFeedback).values(feedbackData)

    // Update session with feedback flag
    const updateData: any = {}
    if (userRole === 'learner') {
      updateData.learnerFeedbackSubmitted = true
    } else {
      updateData.mentorFeedbackSubmitted = true
    }

    await db
      .update(bookingSessions)
      .set(updateData)
      .where(eq(bookingSessions.id, sessionId))

    return NextResponse.json({
      success: true,
      message: 'Feedback submitted successfully'
    })

  } catch (error) {
    console.error('Error submitting session feedback:', error)
    return NextResponse.json({
      error: 'Failed to submit feedback. Please try again.'
    }, { status: 500 })
  }
}

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
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Get all feedback for this session
    const feedback = await db
      .select()
      .from(sessionFeedback)
      .where(eq(sessionFeedback.sessionId, sessionId))

    return NextResponse.json({
      feedback,
      canSubmitFeedback: sessionData.status === 'completed',
      learnerFeedbackSubmitted: sessionData.learnerFeedbackSubmitted || false,
      mentorFeedbackSubmitted: sessionData.mentorFeedbackSubmitted || false,
    })

  } catch (error) {
    console.error('Error fetching session feedback:', error)
    return NextResponse.json({
      error: 'Failed to fetch feedback'
    }, { status: 500 })
  }
}