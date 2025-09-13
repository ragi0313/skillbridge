import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { db } from '@/db'
import { bookingSessions, learners, mentors, creditTransactions, mentorPayouts, notifications } from '@/db/schema'
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
      // SECURITY: Return 404 to hide session existence from unauthorized users
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Check if session can be joined
    const now = new Date()
    const sessionStart = new Date(sessionData.startTime)
    const sessionEnd = new Date(sessionData.endTime)
    const joinWindowStart = new Date(sessionStart.getTime() - 30 * 60 * 1000) // 30 minutes before

    if (now < joinWindowStart) {
      return NextResponse.json({ 
        error: 'Session join window not open yet. You can join 30 minutes before the session start time.',
        canJoinAt: joinWindowStart.toISOString()
      }, { status: 400 })
    }

    if (now > sessionEnd) {
      return NextResponse.json({ error: 'Session has already ended' }, { status: 400 })
    }

    // Check if session is in a joinable state
    if (sessionData.status !== null && !['pending', 'confirmed', 'upcoming', 'ongoing'].includes(sessionData.status)) {
      return NextResponse.json({ 
        error: `Session is not available for joining (status: ${sessionData.status})` 
      }, { status: 400 })
    }

    let accessResult = { canAccess: true }

    // Validate session access and update status if needed
    await db.transaction(async (tx) => {
      // Re-fetch session data within transaction with FOR UPDATE lock
      const sessionRecords = await tx
        .select({
          id: bookingSessions.id,
          status: bookingSessions.status,
          startTime: bookingSessions.startTime,
          learnerId: bookingSessions.learnerId,
          mentorId: bookingSessions.mentorId,
          learnerJoinedAt: bookingSessions.learnerJoinedAt,
          mentorJoinedAt: bookingSessions.mentorJoinedAt,
          totalCostCredits: bookingSessions.totalCostCredits,
          escrowCredits: bookingSessions.escrowCredits,
          noShowCheckedAt: bookingSessions.noShowCheckedAt
        })
        .from(bookingSessions)
        .where(eq(bookingSessions.id, sessionId))
        .for('update') // FOR UPDATE lock
        .limit(1)

      if (sessionRecords.length === 0) {
        throw new Error('Session not found in transaction')
      }

      const sessionRecord = sessionRecords[0]

      // Prepare update data
      const updateData: any = {}

      console.log(`[SESSION_JOIN] User ${userId} accessing session ${sessionId} (going to waiting room)`)
      
      // Check for no-show scenarios: session is 15+ minutes past start time and still in confirmed/upcoming status
      const fifteenMinutesAfterStart = new Date(sessionStart.getTime() + 15 * 60 * 1000)
      const shouldCheckNoShow = now > fifteenMinutesAfterStart && 
                                 ['confirmed', 'upcoming'].includes(sessionRecord.status || '') &&
                                 !sessionRecord.noShowCheckedAt

      if (shouldCheckNoShow) {
        // Determine no-show type based on who has actually entered video call
        const learnerInVideo = sessionRecord.learnerJoinedAt !== null
        const mentorInVideo = sessionRecord.mentorJoinedAt !== null
        
        let noShowType: string | null = null
        
        if (!learnerInVideo && !mentorInVideo) {
          // Neither user entered video call - mark as both no-show
          noShowType = 'both_no_show'
        } else if (learnerInVideo && !mentorInVideo) {
          // Only learner entered - mentor no-show
          noShowType = 'mentor_no_show'
        } else if (!learnerInVideo && mentorInVideo) {
          // Only mentor entered - learner no-show
          noShowType = 'learner_no_show'
        }
        // If both are in video, no no-show (this shouldn't happen with confirmed/upcoming status)

        if (noShowType) {
          updateData.status = noShowType
          updateData.noShowCheckedAt = now
          updateData.agoraCallEndedAt = now
          
          console.log(`[SESSION_JOIN] Detected ${noShowType} for session ${sessionId} - 15+ minutes past start time`)
          
          // Handle refunds/payouts based on no-show type
          if (noShowType === 'both_no_show' || noShowType === 'mentor_no_show') {
            // Refund learner 100%
            if (sessionRecord.escrowCredits > 0 && learner) {
              await tx
                .update(learners)
                .set({ 
                  creditsBalance: learner.creditsBalance + sessionRecord.escrowCredits 
                })
                .where(eq(learners.id, sessionRecord.learnerId))

              updateData.refundAmount = sessionRecord.escrowCredits
              updateData.refundProcessedAt = now

              // Record refund transaction
              await tx.insert(creditTransactions).values({
                userId: learner.userId,
                type: 'session_refund',
                direction: 'credit',
                amount: sessionRecord.escrowCredits,
                balanceBefore: learner.creditsBalance,
                balanceAfter: learner.creditsBalance + sessionRecord.escrowCredits,
                relatedSessionId: sessionId,
                description: `Refund for session #${sessionId} due to ${noShowType}`,
                metadata: { noShowType, detectedAt: 'join_api' },
              })

              console.log(`[SESSION_JOIN] Refunded ${sessionRecord.escrowCredits} credits to learner for ${noShowType}`)
            }
          } else if (noShowType === 'learner_no_show') {
            // Pay mentor 100% as compensation
            if (sessionRecord.totalCostCredits > 0 && mentor) {
              await tx
                .update(mentors)
                .set({ 
                  creditsBalance: mentor.creditsBalance + sessionRecord.totalCostCredits 
                })
                .where(eq(mentors.id, sessionRecord.mentorId))

              // Record mentor payout
              await tx.insert(mentorPayouts).values({
                mentorId: sessionRecord.mentorId,
                sessionId: sessionId,
                earnedCredits: sessionRecord.totalCostCredits,
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
                amount: sessionRecord.totalCostCredits,
                balanceBefore: mentor.creditsBalance,
                balanceAfter: mentor.creditsBalance + sessionRecord.totalCostCredits,
                relatedSessionId: sessionId,
                description: `Compensation for session #${sessionId} (learner no-show)`,
                metadata: { noShowType, detectedAt: 'join_api' },
              })

              console.log(`[SESSION_JOIN] Compensated mentor ${sessionRecord.totalCostCredits} credits for learner no-show`)
            }
          }

          // Send notifications
          const notificationData = []
          
          if (noShowType === 'both_no_show' && learner && mentor) {
            notificationData.push(
              {
                userId: learner.userId,
                type: 'session_no_show',
                title: 'Session No-Show',
                message: `Your session was cancelled due to both parties not joining. You have been refunded ${sessionRecord.escrowCredits} credits.`,
                relatedEntityType: 'session' as const,
                relatedEntityId: sessionId,
              },
              {
                userId: mentor.userId,
                type: 'session_no_show',
                title: 'Session No-Show',
                message: 'The session was cancelled as neither party joined the video call.',
                relatedEntityType: 'session' as const,
                relatedEntityId: sessionId,
              }
            )
          } else if (noShowType === 'mentor_no_show' && learner && mentor) {
            notificationData.push(
              {
                userId: learner.userId,
                type: 'session_no_show',
                title: 'Mentor No-Show',
                message: `Your mentor did not join the video call. You have been fully refunded ${sessionRecord.escrowCredits} credits.`,
                relatedEntityType: 'session' as const,
                relatedEntityId: sessionId,
              },
              {
                userId: mentor.userId,
                type: 'session_no_show',
                title: 'Session Missed',
                message: 'You missed your scheduled session by not entering the video call. Please be punctual for future sessions.',
                relatedEntityType: 'session' as const,
                relatedEntityId: sessionId,
              }
            )
          } else if (noShowType === 'learner_no_show' && learner && mentor) {
            notificationData.push(
              {
                userId: learner.userId,
                type: 'session_no_show',
                title: 'Session Missed',
                message: 'You missed your scheduled session and have been charged. Please join video calls on time.',
                relatedEntityType: 'session' as const,
                relatedEntityId: sessionId,
              },
              {
                userId: mentor.userId,
                type: 'session_no_show',
                title: 'Session Compensation',
                message: `You have been compensated ${sessionRecord.totalCostCredits} credits for the learner's no-show.`,
                relatedEntityType: 'session' as const,
                relatedEntityId: sessionId,
              }
            )
          }

          if (notificationData.length > 0) {
            await tx.insert(notifications).values(notificationData)
          }
        }
      }
      
      // Only do regular status updates if not handling no-show
      const terminalStatuses = ['completed', 'cancelled', 'ongoing', 'both_no_show', 'mentor_no_show', 'learner_no_show']
      if (!shouldCheckNoShow && !terminalStatuses.includes(sessionRecord.status || '')) {
        if (now >= sessionStart) {
          // Session time has started - mark as upcoming (ready for video entry)
          updateData.status = 'upcoming'
          console.log(`[SESSION_JOIN] Session time reached, setting to 'upcoming' for session ${sessionId}`)
        } else if (sessionRecord.status === 'pending') {
          // First user accessing a pending session before start time
          updateData.status = 'confirmed'
          console.log(`[SESSION_JOIN] First user accessing pending session, status 'confirmed' for session ${sessionId}`)
        } else if (sessionRecord.status === null) {
          // Handle null status case
          updateData.status = now >= sessionStart ? 'upcoming' : 'confirmed'
          console.log(`[SESSION_JOIN] Null status session, setting to '${updateData.status}' for session ${sessionId}`)
        }
      } else if (!shouldCheckNoShow) {
        console.log(`[SESSION_JOIN] Session ${sessionId} in terminal/ongoing state: ${sessionRecord.status}, no status change`)
      }

      // Only update if we have changes
      if (Object.keys(updateData).length > 0) {
        await tx
          .update(bookingSessions)
          .set(updateData)
          .where(eq(bookingSessions.id, sessionId))
        
        console.log(`[SESSION_JOIN] Updated session ${sessionId} with:`, updateData)
      } else {
        console.log(`[SESSION_JOIN] No updates needed for session ${sessionId}`)
      }
    })

    // Check if session was marked as no-show during this API call
    const finalSessionQuery = await db
      .select({ status: bookingSessions.status })
      .from(bookingSessions)
      .where(eq(bookingSessions.id, sessionId))
      .limit(1)

    const currentStatus = finalSessionQuery[0]?.status

    if (['both_no_show', 'mentor_no_show', 'learner_no_show'].includes(currentStatus || '')) {
      const isUserNoShow = (currentStatus === 'learner_no_show' && isLearner) || 
                           (currentStatus === 'mentor_no_show' && isMentor) ||
                           (currentStatus === 'both_no_show')

      return NextResponse.json({ 
        success: false,
        message: isUserNoShow 
          ? 'This session has been marked as a no-show. You did not join the video call within the required time.'
          : 'This session has been cancelled due to the other participant not joining the video call.',
        sessionStatus: currentStatus,
        isNoShow: true
      }, { status: 400 })
    }

    const responseMessage = 'Successfully accessed session - ready to enter waiting room'

    console.log(`[SESSION_JOIN] ${responseMessage} for user ${userId} in session ${sessionId}`)

    return NextResponse.json({ 
      success: true,
      message: responseMessage,
      canStartVideo: now >= sessionStart,
      sessionStatus: currentStatus || sessionData.status
    })

  } catch (error) {
    console.error('Error joining session:', error)
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message === 'Session not found in transaction') {
        return NextResponse.json({ error: 'Session was deleted or is no longer available' }, { status: 404 })
      }
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Not authorized to join this session' }, { status: 403 })
      }
    }
    
    return NextResponse.json({ 
      error: 'Failed to join session. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error?.toString() : undefined 
    }, { status: 500 })
  }
}