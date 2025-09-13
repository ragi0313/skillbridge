import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { db } from '@/db'
import { bookingSessions, learners, mentors } from '@/db/schema'
import { eq, and, isNull } from 'drizzle-orm'

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

    // Get the reason for leaving (to distinguish between genuine leave vs page refresh)
    const body = await request.json().catch(() => ({}))
    
    // SECURITY: Validate and sanitize input
    const validReasons = ['user_action', 'page_refresh', 'beforeunload', 'navigation', 'connection_lost', 'system']
    const reason = validReasons.includes(body.reason) ? body.reason : 'user_action'
    const isPageRefresh = Boolean(body.isPageRefresh)

    console.log(`[LEAVE_API] User ${session.id} leaving session ${sessionId}, reason: ${reason}, isPageRefresh: ${isPageRefresh}`)

    const leaveResult = { 
      wasInSession: false, 
      connectionDurationSeconds: 0, 
      wasAlreadyLeft: false,
      bothUsersNowLeft: false,
      skipLeaveForRefresh: false
    }

    const now = new Date()

    // Update leave timestamp and connection duration with atomic transaction
    await db.transaction(async (tx) => {
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
      const isLearner = learner?.userId === userId
      const isMentor = mentor?.userId === userId
      
      if (!isLearner && !isMentor) {
        throw new Error('Unauthorized')
      }

      // Always update lastActiveAt for any leave event (including beforeunload)
      // This helps SessionMonitorService detect genuine disconnections
      const lastActiveUpdate: any = {}
      lastActiveUpdate[isLearner ? 'learnerLastActiveAt' : 'mentorLastActiveAt'] = now
      
      // For page refresh/navigation events, only update lastActiveAt, don't set leave timestamp
      if (isPageRefresh || reason === 'page_refresh' || reason === 'navigation' || reason === 'beforeunload') {
        console.log(`[LEAVE_API] ${reason} detected for session ${sessionId} - updating lastActiveAt only`)
        
        await tx
          .update(bookingSessions)
          .set(lastActiveUpdate)
          .where(eq(bookingSessions.id, sessionId))

        leaveResult.skipLeaveForRefresh = true
        return
      }

      // Check if session is already in terminal state
      if (sessionData.status !== null && ['completed', 'cancelled', 'both_no_show', 'mentor_no_show', 'learner_no_show', 'technical_issues'].includes(sessionData.status)) {
        console.log(`[LEAVE_API] Session ${sessionId} is already in terminal state: ${sessionData.status}`)
        return
      }
      const updateData: any = {}

      // Get current join/leave timestamps
      const userJoinedAt = isLearner ? sessionData.learnerJoinedAt : sessionData.mentorJoinedAt
      const userLeftAt = isLearner ? sessionData.learnerLeftAt : sessionData.mentorLeftAt
      const otherUserJoinedAt = isLearner ? sessionData.mentorJoinedAt : sessionData.learnerJoinedAt
      const otherUserLeftAt = isLearner ? sessionData.mentorLeftAt : sessionData.learnerLeftAt
      const currentConnectionDuration = isLearner ? sessionData.learnerConnectionDurationMs : sessionData.mentorConnectionDurationMs

      // Check if user was never in session
      if (!userJoinedAt) {
        leaveResult.wasInSession = false
        console.log(`[LEAVE_API] User was never in session ${sessionId}`)
        return // No update needed
      }

      // Check if user already left
      if (userLeftAt) {
        leaveResult.wasAlreadyLeft = true
        leaveResult.wasInSession = true
        // Calculate previous connection duration for response
        leaveResult.connectionDurationSeconds = Math.floor((userLeftAt.getTime() - userJoinedAt.getTime()) / 1000)
        console.log(`[LEAVE_API] User had already left session ${sessionId}`)
        return // No update needed
      }

      // User is currently in session - calculate connection duration and mark as left
      const connectionDurationMs = now.getTime() - userJoinedAt.getTime()
      leaveResult.wasInSession = true
      leaveResult.connectionDurationSeconds = Math.floor(connectionDurationMs / 1000)

      // Update leave timestamp and connection duration
      if (isLearner) {
        updateData.learnerLeftAt = now
        updateData.learnerConnectionDurationMs = Math.max(
          connectionDurationMs, 
          currentConnectionDuration || 0
        )
      } else {
        updateData.mentorLeftAt = now
        updateData.mentorConnectionDurationMs = Math.max(
          connectionDurationMs, 
          currentConnectionDuration || 0
        )
      }

      // Check if both users have now left the ongoing session
      const otherUserStillInSession = otherUserJoinedAt && !otherUserLeftAt
      leaveResult.bothUsersNowLeft = !otherUserStillInSession && sessionData.status === 'ongoing'

      // Update last active timestamp for session monitoring
      if (isLearner) {
        updateData.learnerLastActiveAt = now
      } else {
        updateData.mentorLastActiveAt = now
      }

      // CRITICAL FIX: Don't auto-complete sessions when users leave
      // Let the SessionMonitorService handle completion based on more sophisticated logic
      // Only set left timestamp, don't change session status
      console.log(`[LEAVE_API] User ${userId} leaving session ${sessionId}, connection duration: ${leaveResult.connectionDurationSeconds}s, bothUsersLeft: ${leaveResult.bothUsersNowLeft}`)

      // Apply updates
      if (Object.keys(updateData).length > 0) {
        await tx
          .update(bookingSessions)
          .set(updateData)
          .where(eq(bookingSessions.id, sessionId))
      }
    })

    // Determine response message
    let message = 'Successfully left session'
    if (leaveResult.skipLeaveForRefresh) {
      message = 'Page refresh detected - session state preserved'
    } else if (!leaveResult.wasInSession) {
      message = 'User was not in session'
    } else if (leaveResult.wasAlreadyLeft) {
      message = 'User had already left session'
    } else if (leaveResult.bothUsersNowLeft) {
      message = 'Successfully left session - both users have now left'
    }

    return NextResponse.json({ 
      success: true,
      message,
      wasInSession: leaveResult.wasInSession,
      wasAlreadyLeft: leaveResult.wasAlreadyLeft,
      connectionDurationSeconds: leaveResult.connectionDurationSeconds,
      bothUsersNowLeft: leaveResult.bothUsersNowLeft,
      skipLeaveForRefresh: leaveResult.skipLeaveForRefresh
    })

  } catch (error) {
    console.error('Error leaving session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}