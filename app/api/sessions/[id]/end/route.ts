import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { db } from '@/db'
import { bookingSessions, learners, mentors, creditTransactions, mentorPayouts } from '@/db/schema'
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

    const { reason = 'completed' } = await request.json()

    // Get session and verify user authorization in a transaction to ensure consistency
    const result = await db.transaction(async (tx) => {
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

      // Check if session can be ended or is already ended
      if (sessionData.status !== null && ['completed', 'cancelled', 'both_no_show', 'mentor_no_show', 'learner_no_show'].includes(sessionData.status)) {
        return { 
          success: true, 
          message: 'Session already ended',
          status: sessionData.status,
          alreadyEnded: true
        }
      }

      const now = new Date()
      
      // Calculate final connection durations
      const learnerDuration = sessionData.learnerJoinedAt && sessionData.learnerLeftAt
        ? sessionData.learnerLeftAt.getTime() - sessionData.learnerJoinedAt.getTime()
        : sessionData.learnerJoinedAt
        ? now.getTime() - sessionData.learnerJoinedAt.getTime()
        : 0

      const mentorDuration = sessionData.mentorJoinedAt && sessionData.mentorLeftAt
        ? sessionData.mentorLeftAt.getTime() - sessionData.mentorJoinedAt.getTime()
        : sessionData.mentorJoinedAt
        ? now.getTime() - sessionData.mentorJoinedAt.getTime()
        : 0

      // Determine final status based on reason
      let finalStatus = 'completed'
      if (reason === 'cancelled') {
        finalStatus = 'cancelled'
      } else if (reason === 'technical_issues') {
        finalStatus = 'technical_issues'
      }

      // Update session status
      const updateData: any = {
        status: finalStatus,
        agoraCallEndedAt: now,
        learnerConnectionDurationMs: Math.max(learnerDuration, sessionData.learnerConnectionDurationMs || 0),
        mentorConnectionDurationMs: Math.max(mentorDuration, sessionData.mentorConnectionDurationMs || 0),
      }

      // Mark user as left if they haven't already
      const isLearner = learner?.userId === userId
      if (isLearner && sessionData.learnerJoinedAt && !sessionData.learnerLeftAt) {
        updateData.learnerLeftAt = now
      } else if (!isLearner && sessionData.mentorJoinedAt && !sessionData.mentorLeftAt) {
        updateData.mentorLeftAt = now
      }

      await tx
        .update(bookingSessions)
        .set(updateData)
        .where(eq(bookingSessions.id, sessionId))

      // Process payment if session completed successfully
      if (finalStatus === 'completed' && mentor && sessionData.totalCostCredits > 0) {
        const mentorEarnings = Math.floor(sessionData.totalCostCredits * 0.8)
        const platformFee = sessionData.totalCostCredits - mentorEarnings

        // Add credits to mentor balance
        await tx
          .update(mentors)
          .set({
            creditsBalance: mentor.creditsBalance + mentorEarnings
          })
          .where(eq(mentors.id, sessionData.mentorId))

        // Record mentor payout
        await tx.insert(mentorPayouts).values({
          mentorId: sessionData.mentorId,
          sessionId: sessionId,
          earnedCredits: mentorEarnings,
          platformFeeCredits: platformFee,
          feePercentage: 20,
          status: 'released',
          releasedAt: now,
        })

        // Record credit transaction
        await tx.insert(creditTransactions).values({
          userId: mentor.userId,
          type: 'session_payment',
          direction: 'credit',
          amount: mentorEarnings,
          balanceBefore: mentor.creditsBalance,
          balanceAfter: mentor.creditsBalance + mentorEarnings,
          relatedSessionId: sessionId,
          description: `Payment for completed session ${sessionId}`,
          metadata: { 
            platformFee, 
            originalAmount: sessionData.totalCostCredits,
            completedBy: 'user'
          },
        })
      }

      return {
        success: true,
        status: finalStatus,
        message: 'Session ended successfully',
        sessionData,
        alreadyEnded: false
      }
    })

    // End Agora call if exists (outside transaction to avoid blocking)
    if (!result.alreadyEnded && result.sessionData?.agoraChannelName) {
      try {
        await agoraService.endRoom(result.sessionData.agoraChannelName, reason)
      } catch (error) {
        console.error('Error ending Agora room:', error)
        // Continue - session ending succeeded even if Agora fails
      }
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Error ending session:', error)
    
 
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}