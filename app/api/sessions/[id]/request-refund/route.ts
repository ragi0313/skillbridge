import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { db } from '@/db'
import { bookingSessions, learners, refundRequests, notifications } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { sessionLogService } from '@/lib/services/SessionLogService'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()

    if (!session?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // SECURITY: Only learners can request refunds
    if (session.role !== 'learner') {
      return NextResponse.json({
        error: 'Only learners can request refunds'
      }, { status: 403 })
    }

    const { id } = await params
    const sessionId = parseInt(id)
    if (isNaN(sessionId)) {
      return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 })
    }

    const body = await request.json()
    const { requestReason, detailedReason, evidenceUrls } = body

    // Validate input
    const validReasons = ['technical_issues', 'mentor_no_show', 'quality_issues', 'other']
    if (!validReasons.includes(requestReason)) {
      return NextResponse.json({ error: 'Invalid refund reason' }, { status: 400 })
    }

    if (!detailedReason || detailedReason.trim().length < 10) {
      return NextResponse.json({
        error: 'Please provide a detailed explanation (at least 10 characters)'
      }, { status: 400 })
    }

    // Get session and verify user is the learner
    const sessionQuery = await db
      .select({
        session: bookingSessions,
        learner: learners,
      })
      .from(bookingSessions)
      .leftJoin(learners, eq(bookingSessions.learnerId, learners.id))
      .where(eq(bookingSessions.id, sessionId))
      .limit(1)

    if (sessionQuery.length === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const { session: sessionData, learner } = sessionQuery[0]

    if (!learner || learner.userId !== session.id) {
      return NextResponse.json({
        error: 'Only the learner can request a refund for this session'
      }, { status: 403 })
    }

    // Check if session is eligible for refund request
    const terminalStatuses = ['completed', 'cancelled', 'both_no_show', 'mentor_no_show', 'learner_no_show', 'technical_issues']
    if (!terminalStatuses.includes(sessionData.status || '')) {
      return NextResponse.json({
        error: 'Can only request refund for completed or cancelled sessions'
      }, { status: 400 })
    }

    // Check if already refunded
    if (sessionData.refundProcessedAt) {
      return NextResponse.json({
        error: 'This session has already been refunded'
      }, { status: 400 })
    }

    // Check if refund request already exists
    const existingRequest = await db
      .select()
      .from(refundRequests)
      .where(
        and(
          eq(refundRequests.sessionId, sessionId),
          eq(refundRequests.requestedBy, session.id)
        )
      )
      .limit(1)

    if (existingRequest.length > 0) {
      return NextResponse.json({
        error: 'A refund request has already been submitted for this session',
        existingRequest: existingRequest[0]
      }, { status: 400 })
    }

    // Create refund request
    const requestedAmount = sessionData.escrowCredits || sessionData.totalCostCredits

    const [newRequest] = await db
      .insert(refundRequests)
      .values({
        sessionId,
        requestedBy: session.id,
        requestReason,
        detailedReason: detailedReason.trim(),
        evidenceUrls: evidenceUrls || null,
        requestedAmount,
        status: 'pending',
      })
      .returning()

    // Log the refund request
    await sessionLogService.logEvent({
      sessionId,
      eventType: 'admin_action',
      actorType: 'learner',
      actorId: session.id,
      description: `Learner requested refund: ${requestReason}`,
      metadata: {
        requestReason,
        requestedAmount,
        refundRequestId: newRequest.id
      }
    })

    // Notify admins (you can add admin notification logic here)
    // For now, just return success

    return NextResponse.json({
      success: true,
      message: 'Refund request submitted successfully. An admin will review it shortly.',
      refundRequest: newRequest
    })

  } catch (error) {
    console.error('[REFUND_REQUEST] Error creating refund request:', error)
    return NextResponse.json({
      error: 'Failed to submit refund request'
    }, { status: 500 })
  }
}
