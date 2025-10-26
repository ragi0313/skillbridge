import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { db } from '@/db'
import { refundRequests, bookingSessions, learners, creditTransactions, notifications } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { sessionLogService } from '@/lib/services/SessionLogService'

// POST - Approve or reject refund request
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()

    if (!session?.id || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const requestId = parseInt(id)
    if (isNaN(requestId)) {
      return NextResponse.json({ error: 'Invalid request ID' }, { status: 400 })
    }

    const body = await request.json()
    const { action, responseMessage, refundAmount, adminNotes } = body

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Must be approve or reject' }, { status: 400 })
    }

    // Get refund request
    const requestQuery = await db
      .select({
        request: refundRequests,
        session: bookingSessions,
        learner: learners,
      })
      .from(refundRequests)
      .leftJoin(bookingSessions, eq(refundRequests.sessionId, bookingSessions.id))
      .leftJoin(learners, eq(bookingSessions.learnerId, learners.id))
      .where(eq(refundRequests.id, requestId))
      .limit(1)

    if (requestQuery.length === 0) {
      return NextResponse.json({ error: 'Refund request not found' }, { status: 404 })
    }

    const { request: refundRequest, session: sessionData, learner } = requestQuery[0]

    if (!sessionData || !learner) {
      return NextResponse.json({ error: 'Session or learner not found' }, { status: 404 })
    }

    // SECURITY: Validate refund amount if provided
    if (refundAmount !== undefined && refundAmount !== null) {
      if (typeof refundAmount !== 'number' || refundAmount < 0) {
        return NextResponse.json({ error: 'Invalid refund amount' }, { status: 400 })
      }
      if (refundAmount > refundRequest.requestedAmount) {
        return NextResponse.json({
          error: `Refund amount cannot exceed requested amount (${refundRequest.requestedAmount} credits)`
        }, { status: 400 })
      }
      // Log when admin overrides the refund amount
      if (refundAmount !== refundRequest.requestedAmount) {
        console.log(`[ADMIN] Refund amount override: requested=${refundRequest.requestedAmount}, approved=${refundAmount}, admin=${session.id}`)
      }
    }

    const now = new Date()

    if (action === 'approve') {
      const actualRefundAmount = refundAmount || refundRequest.requestedAmount

      // SECURITY: Use transaction with row-level locking to prevent race conditions
      await db.transaction(async (tx) => {
        // Re-fetch with FOR UPDATE lock to prevent concurrent modifications
        const [lockedRequest] = await tx
          .select()
          .from(refundRequests)
          .where(eq(refundRequests.id, requestId))
          .for('update')
          .limit(1)

        // Check status INSIDE transaction after acquiring lock
        if (!lockedRequest || lockedRequest.status !== 'pending') {
          throw new Error(`Request has already been ${lockedRequest?.status || 'processed'}`)
        }
        // Update refund request
        await tx
          .update(refundRequests)
          .set({
            status: 'approved',
            reviewedBy: session.id,
            reviewedAt: now,
            adminNotes,
            responseMessage,
            refundedAmount: actualRefundAmount,
            refundProcessedAt: now,
          })
          .where(eq(refundRequests.id, requestId))

        // Refund credits to learner
        await tx
          .update(learners)
          .set({
            creditsBalance: learner.creditsBalance + actualRefundAmount
          })
          .where(eq(learners.id, learner.id))

        // Update session
        await tx
          .update(bookingSessions)
          .set({
            refundAmount: actualRefundAmount,
            refundProcessedAt: now,
          })
          .where(eq(bookingSessions.id, sessionData.id))

        // Record transaction
        await tx.insert(creditTransactions).values({
          userId: learner.userId,
          type: 'session_refund',
          direction: 'credit',
          amount: actualRefundAmount,
          balanceBefore: learner.creditsBalance,
          balanceAfter: learner.creditsBalance + actualRefundAmount,
          relatedSessionId: sessionData.id,
          description: `Admin-approved refund for session #${sessionData.id}: ${refundRequest.requestReason}`,
          metadata: {
            refundRequestId: requestId,
            approvedBy: session.id,
            originalRequestAmount: refundRequest.requestedAmount
          },
        })

        // Notify learner
        await tx.insert(notifications).values({
          userId: learner.userId,
          type: 'refund_approved',
          title: 'Refund Request Approved',
          message: responseMessage || `Your refund request has been approved. ${actualRefundAmount} credits have been added to your account.`,
          relatedEntityType: 'session',
          relatedEntityId: sessionData.id,
        })

        // Log the refund
        await sessionLogService.logEvent({
          sessionId: sessionData.id,
          eventType: 'refund_processed',
          actorType: 'admin',
          actorId: session.id,
          description: `Admin approved refund request: ${actualRefundAmount} credits refunded`,
          metadata: {
            refundRequestId: requestId,
            requestReason: refundRequest.requestReason,
            refundedAmount: actualRefundAmount
          }
        })
      })

      return NextResponse.json({
        success: true,
        message: 'Refund approved and processed',
        refundedAmount: actualRefundAmount
      })

    } else {
      // Reject refund with row-level locking
      await db.transaction(async (tx) => {
        // Re-fetch with FOR UPDATE lock
        const [lockedRequest] = await tx
          .select()
          .from(refundRequests)
          .where(eq(refundRequests.id, requestId))
          .for('update')
          .limit(1)

        // Check status INSIDE transaction after acquiring lock
        if (!lockedRequest || lockedRequest.status !== 'pending') {
          throw new Error(`Request has already been ${lockedRequest?.status || 'processed'}`)
        }

        await tx
          .update(refundRequests)
          .set({
            status: 'rejected',
            reviewedBy: session.id,
            reviewedAt: now,
            adminNotes,
            responseMessage,
          })
          .where(eq(refundRequests.id, requestId))

        // Notify learner
        await tx.insert(notifications).values({
          userId: learner.userId,
          type: 'refund_rejected',
          title: 'Refund Request Rejected',
          message: responseMessage || 'Your refund request has been reviewed and rejected.',
          relatedEntityType: 'session',
          relatedEntityId: sessionData.id,
        })

        // Log the rejection
        await sessionLogService.logEvent({
          sessionId: sessionData.id,
          eventType: 'admin_action',
          actorType: 'admin',
          actorId: session.id,
          description: `Admin rejected refund request`,
          metadata: {
            refundRequestId: requestId,
            requestReason: refundRequest.requestReason
          }
        })
      })

      return NextResponse.json({
        success: true,
        message: 'Refund request rejected'
      })
    }

  } catch (error) {
    console.error('[ADMIN] Error reviewing refund request:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
