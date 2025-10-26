import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { db } from '@/db'
import { bookingSessions, learners, mentors, creditTransactions, mentorPayouts, notifications } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { sessionLogService } from '@/lib/services/SessionLogService'

// POST - Admin manually marks a session as no-show
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
    const sessionId = parseInt(id)
    if (isNaN(sessionId)) {
      return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 })
    }

    const body = await request.json()
    const { noShowType, reason } = body

    // Validate no-show type
    const validNoShowTypes = ['both_no_show', 'mentor_no_show', 'learner_no_show']
    if (!validNoShowTypes.includes(noShowType)) {
      return NextResponse.json({
        error: 'Invalid no-show type. Must be: both_no_show, mentor_no_show, or learner_no_show'
      }, { status: 400 })
    }

    // Get session data
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

    if (!learner || !mentor) {
      return NextResponse.json({ error: 'Learner or mentor not found' }, { status: 404 })
    }

    // Check if session is in a valid state for manual marking
    const terminalStatuses = ['completed', 'cancelled', 'both_no_show', 'mentor_no_show', 'learner_no_show', 'technical_issues']
    if (terminalStatuses.includes(sessionData.status || '')) {
      return NextResponse.json({
        error: `Session already has terminal status: ${sessionData.status}`
      }, { status: 400 })
    }

    const now = new Date()

    // Process the no-show
    await db.transaction(async (tx) => {
      // Update session status
      await tx
        .update(bookingSessions)
        .set({
          status: noShowType,
          noShowCheckedAt: now,
          agoraCallEndedAt: now,
        })
        .where(eq(bookingSessions.id, sessionId))

      // Handle financial processing based on no-show type
      if (noShowType === 'both_no_show' || noShowType === 'mentor_no_show') {
        // Refund learner 100%
        if (sessionData.escrowCredits > 0) {
          await tx
            .update(learners)
            .set({
              creditsBalance: learner.creditsBalance + sessionData.escrowCredits
            })
            .where(eq(learners.id, learner.id))

          await tx
            .update(bookingSessions)
            .set({
              refundAmount: sessionData.escrowCredits,
              refundProcessedAt: now,
            })
            .where(eq(bookingSessions.id, sessionId))

          // Record refund transaction
          await tx.insert(creditTransactions).values({
            userId: learner.userId,
            type: 'session_refund',
            direction: 'credit',
            amount: sessionData.escrowCredits,
            balanceBefore: learner.creditsBalance,
            balanceAfter: learner.creditsBalance + sessionData.escrowCredits,
            relatedSessionId: sessionId,
            description: `Admin marked session #${sessionId} as ${noShowType} - full refund`,
            metadata: { noShowType, markedBy: session.id, reason },
          })
        }

        // Notify learner
        await tx.insert(notifications).values({
          userId: learner.userId,
          type: 'session_no_show',
          title: noShowType === 'both_no_show' ? 'Session No-Show' : 'Mentor No-Show',
          message: `An admin has marked your session as ${noShowType.replace('_', ' ')}. You have been refunded ${sessionData.escrowCredits} credits.`,
          relatedEntityType: 'session',
          relatedEntityId: sessionId,
        })

      } else if (noShowType === 'learner_no_show') {
        // Pay mentor 100% as compensation
        if (sessionData.totalCostCredits > 0) {
          await tx
            .update(mentors)
            .set({
              creditsBalance: mentor.creditsBalance + sessionData.totalCostCredits
            })
            .where(eq(mentors.id, mentor.id))

          // Record mentor payout
          await tx.insert(mentorPayouts).values({
            mentorId: mentor.id,
            sessionId: sessionId,
            earnedCredits: sessionData.totalCostCredits,
            platformFeeCredits: 0,
            feePercentage: 0,
            status: 'released',
            releasedAt: now,
          })

          // Record credit transaction
          await tx.insert(creditTransactions).values({
            userId: mentor.userId,
            type: 'session_payment',
            direction: 'credit',
            amount: sessionData.totalCostCredits,
            balanceBefore: mentor.creditsBalance,
            balanceAfter: mentor.creditsBalance + sessionData.totalCostCredits,
            relatedSessionId: sessionId,
            description: `Admin marked session #${sessionId} as learner no-show - full compensation`,
            metadata: { noShowType, markedBy: session.id, reason },
          })
        }

        // Notify learner
        await tx.insert(notifications).values({
          userId: learner.userId,
          type: 'session_no_show',
          title: 'Session Missed',
          message: 'An admin has marked this session as a learner no-show. You have been charged for missing the session.',
          relatedEntityType: 'session',
          relatedEntityId: sessionId,
        })

        // Notify mentor
        await tx.insert(notifications).values({
          userId: mentor.userId,
          type: 'session_no_show',
          title: 'Session Compensation',
          message: `You have been compensated ${sessionData.totalCostCredits} credits for learner no-show (admin decision).`,
          relatedEntityType: 'session',
          relatedEntityId: sessionId,
        })
      }

      // Log the admin action
      await sessionLogService.logEvent({
        sessionId,
        eventType: 'manual_override',
        actorType: 'admin',
        actorId: session.id,
        oldStatus: sessionData.status,
        newStatus: noShowType,
        description: `Admin manually marked session as ${noShowType}: ${reason || 'No reason provided'}`,
        metadata: {
          noShowType,
          reason,
          adminId: session.id
        }
      })
    })

    return NextResponse.json({
      success: true,
      message: `Session marked as ${noShowType} and financial transactions processed`,
      noShowType
    })

  } catch (error) {
    console.error('[ADMIN] Error marking no-show:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
