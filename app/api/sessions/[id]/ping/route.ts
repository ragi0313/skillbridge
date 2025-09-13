import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth/getSession"
import { db } from "@/db"
import { bookingSessions, learners, mentors } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> } 
) {
  let sessionId: number | undefined
  let session: any
  
  try {
    session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { id } = await context.params 
    sessionId = parseInt(id)
    if (isNaN(sessionId)) {
      console.error(`[PING] Invalid session ID: ${id}`)
      return NextResponse.json({ error: "Invalid session ID" }, { status: 400 })
    }

    console.log(`[PING] Processing ping for session ${sessionId} from user ${session.id}`)

    const sessionQuery = await db
      .select({
        id: bookingSessions.id,
        status: bookingSessions.status,
        learnerUserId: learners.userId,
        mentorUserId: mentors.userId,
        learnerJoinedAt: bookingSessions.learnerJoinedAt,
        mentorJoinedAt: bookingSessions.mentorJoinedAt,
        learnerLeftAt: bookingSessions.learnerLeftAt,
        mentorLeftAt: bookingSessions.mentorLeftAt,
      })
      .from(bookingSessions)
      .leftJoin(learners, eq(bookingSessions.learnerId, learners.id))
      .leftJoin(mentors, eq(bookingSessions.mentorId, mentors.id))
      .where(eq(bookingSessions.id, sessionId))
      .limit(1)

    if (sessionQuery.length === 0) {
      console.error(`[PING] Session ${sessionId} not found in database`)
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    const sessionData = sessionQuery[0]
    const userId = session.id
    const isLearner = sessionData.learnerUserId === userId
    const isMentor = sessionData.mentorUserId === userId

    if (!isLearner && !isMentor) {
      // SECURITY: Return 404 to hide session existence from unauthorized users
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    const userJoinedAt = isLearner ? sessionData.learnerJoinedAt : sessionData.mentorJoinedAt
    const userLeftAt = isLearner ? sessionData.learnerLeftAt : sessionData.mentorLeftAt
    const isUserCurrentlyInSession = userJoinedAt && !userLeftAt

    // Check if session is in a terminal state (can't ping completed sessions)
    const terminalStatuses = ['completed', 'cancelled', 'both_no_show', 'mentor_no_show', 'learner_no_show', 'technical_issues']
    if (terminalStatuses.includes(sessionData.status || '')) {
      console.error(`[PING] Session ${sessionId} is in terminal state: ${sessionData.status}`)
      return NextResponse.json({
        error: "Session has ended",
        sessionStatus: sessionData.status,
        userInSession: isUserCurrentlyInSession,
      }, { status: 400 })
    }

    // Allow ping for any non-terminal session, even if user hasn't technically "joined" yet
    // This handles cases where user is in waiting room or about to join
    console.log(`[PING] Session ${sessionId} ping from ${isLearner ? 'learner' : 'mentor'}, status: ${sessionData.status}, userInSession: ${isUserCurrentlyInSession}`)

    // Update lastActiveAt timestamp to show user is actively in the session
    const now = new Date()
    const updateData: any = {}
    updateData[isLearner ? 'learnerLastActiveAt' : 'mentorLastActiveAt'] = now
    
    await db
      .update(bookingSessions)
      .set(updateData)
      .where(eq(bookingSessions.id, sessionId))

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      sessionId,
      userId: session.id,
      sessionStatus: sessionData.status,
      userRole: isLearner ? "learner" : "mentor",
    })
  } catch (error) {
    console.error(`[PING] Session ${sessionId} error:`, error)
    console.error("[PING] Error details:", {
      sessionId,
      userId: session?.id,
      error: error instanceof Error ? error.message : error
    })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
