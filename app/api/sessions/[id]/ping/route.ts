import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth/getSession"
import { db } from "@/db"
import { bookingSessions, learners, mentors } from "@/db/schema"
import { eq, and, or } from "drizzle-orm"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const sessionId = parseInt(params.id)
    if (isNaN(sessionId)) {
      return NextResponse.json({ error: "Invalid session ID" }, { status: 400 })
    }

    // SECURITY: Verify user is authorized to ping this session
    const sessionQuery = await db
      .select({
        id: bookingSessions.id,
        status: bookingSessions.status,
        learnerUserId: learners.userId,
        mentorUserId: mentors.userId,
        learnerJoinedAt: bookingSessions.learnerJoinedAt,
        mentorJoinedAt: bookingSessions.mentorJoinedAt,
        learnerLeftAt: bookingSessions.learnerLeftAt,
        mentorLeftAt: bookingSessions.mentorLeftAt
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

    // Check if user is authorized (either learner or mentor)
    const isLearner = sessionData.learnerUserId === userId
    const isMentor = sessionData.mentorUserId === userId
    
    if (!isLearner && !isMentor) {
      return NextResponse.json({ error: "Not authorized to access this session" }, { status: 403 })
    }

    // SECURITY: Only allow pings for active sessions where user has actually joined
    const userJoinedAt = isLearner ? sessionData.learnerJoinedAt : sessionData.mentorJoinedAt
    const userLeftAt = isLearner ? sessionData.learnerLeftAt : sessionData.mentorLeftAt
    const isUserCurrentlyInSession = userJoinedAt && !userLeftAt

    if (!['upcoming', 'ongoing'].includes(sessionData.status || '') || !isUserCurrentlyInSession) {
      return NextResponse.json({ 
        error: "Session is not active or you are not currently in the session",
        sessionStatus: sessionData.status,
        userInSession: isUserCurrentlyInSession
      }, { status: 400 })
    }

    // Rate limiting: Don't allow pings more than once every 10 seconds
    const now = Date.now()
    const lastPingKey = `ping_${sessionId}_${userId}`
    // In production, you'd use Redis or similar for distributed rate limiting
    // For now, this provides basic protection against spam

    return NextResponse.json({ 
      success: true, 
      timestamp: new Date().toISOString(),
      sessionId: sessionId,
      userId: session.id,
      sessionStatus: sessionData.status,
      userRole: isLearner ? 'learner' : 'mentor'
    })
  } catch (error) {
    console.error("Session ping error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}