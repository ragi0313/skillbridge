import { type NextRequest, NextResponse } from "next/server"
import { withRateLimit } from "@/lib/middleware/rate-limit"
import { db } from "@/db"
import { bookingSessions, users, learners, mentors } from "@/db/schema"
import { eq } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { getSession } from "@/lib/auth/getSession"
import { SessionManagementService } from "@/lib/sessions/session-management"

async function handleSessionLeave(request: NextRequest, context?: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Extract session ID from URL if context is not provided (due to middleware)
    let sessionId: number
    if (context?.params) {
      const { id } = await context.params
      sessionId = parseInt(id)
    } else {
      sessionId = parseInt(request.url.split('/').slice(-2)[0]) // Extract from URL path
    }

    if (!sessionId || isNaN(sessionId)) {
      return NextResponse.json({ error: "Invalid session ID" }, { status: 400 })
    }

    // Create aliases for the users table since we need to join it twice
    const learnerUsers = alias(users, "learner_users")
    const mentorUsers = alias(users, "mentor_users")

    // Get session details with participant info
    const [bookingSession] = await db
      .select({
        id: bookingSessions.id,
        learnerId: bookingSessions.learnerId,
        mentorId: bookingSessions.mentorId,
        status: bookingSessions.status,
        scheduledDate: bookingSessions.scheduledDate,
        learnerJoinedAt: bookingSessions.learnerJoinedAt,
        mentorJoinedAt: bookingSessions.mentorJoinedAt,
        learnerUser: {
          id: learnerUsers.id,
          firstName: learnerUsers.firstName,
          lastName: learnerUsers.lastName,
        },
        mentorUser: {
          id: mentorUsers.id,
          firstName: mentorUsers.firstName,
          lastName: mentorUsers.lastName,
        }
      })
      .from(bookingSessions)
      .leftJoin(learners, eq(bookingSessions.learnerId, learners.id))
      .leftJoin(mentors, eq(bookingSessions.mentorId, mentors.id))
      .leftJoin(learnerUsers, eq(learners.userId, learnerUsers.id))
      .leftJoin(mentorUsers, eq(mentors.userId, mentorUsers.id))
      .where(eq(bookingSessions.id, sessionId))

    if (!bookingSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // Check if user has access to this session
    const isLearner = bookingSession.learnerUser?.id === session.id
    const isMentor = bookingSession.mentorUser?.id === session.id
    
    if (!isLearner && !isMentor) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Check session status
    if (!["confirmed", "ongoing"].includes(bookingSession.status)) {
      return NextResponse.json({ 
        error: `Cannot leave session with status: ${bookingSession.status}` 
      }, { status: 400 })
    }

    // Track user leaving
    const sessionManagement = SessionManagementService.getInstance()
    const userRole = isLearner ? 'learner' : 'mentor'
    const result = await sessionManagement.recordUserLeft(sessionId, session.id, userRole)

    if (!result.success) {
      return NextResponse.json({ 
        error: result.error || "Failed to record user leaving" 
      }, { status: 500 })
    }

    return NextResponse.json({
      message: "Successfully recorded user leaving session",
      userRole,
      leftAt: new Date().toISOString()
    })

  } catch (error) {
    console.error("Error recording session leave:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Wrapper to maintain Next.js API route signature with rate limiting
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const rateLimitedHandler = withRateLimit('api', (req: NextRequest) => handleSessionLeave(req, context))
  return rateLimitedHandler(request)
}