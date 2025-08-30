import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth/getSession"
import { db } from "@/db"
import { bookingSessions, learners, mentors } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> } 
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { id } = await context.params 
    const sessionId = parseInt(id)
    if (isNaN(sessionId)) {
      return NextResponse.json({ error: "Invalid session ID" }, { status: 400 })
    }

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
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    const sessionData = sessionQuery[0]
    const userId = session.id
    const isLearner = sessionData.learnerUserId === userId
    const isMentor = sessionData.mentorUserId === userId

    if (!isLearner && !isMentor) {
      return NextResponse.json({ error: "Not authorized to access this session" }, { status: 403 })
    }

    const userJoinedAt = isLearner ? sessionData.learnerJoinedAt : sessionData.mentorJoinedAt
    const userLeftAt = isLearner ? sessionData.learnerLeftAt : sessionData.mentorLeftAt
    const isUserCurrentlyInSession = userJoinedAt && !userLeftAt

    if (!['upcoming', 'ongoing'].includes(sessionData.status || '') || !isUserCurrentlyInSession) {
      return NextResponse.json({
        error: "Session is not active or you are not currently in the session",
        sessionStatus: sessionData.status,
        userInSession: isUserCurrentlyInSession,
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      sessionId,
      userId: session.id,
      sessionStatus: sessionData.status,
      userRole: isLearner ? "learner" : "mentor",
    })
  } catch (error) {
    console.error("Session ping error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
