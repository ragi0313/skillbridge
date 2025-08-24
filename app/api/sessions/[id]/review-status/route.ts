import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { mentorReviews, bookingSessions, learners, users } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { getSession } from "@/lib/auth/getSession"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session?.id || session.role !== "learner") {
      return NextResponse.json({ error: "Unauthorized - learners only" }, { status: 401 })
    }

    const { id } = await context.params
    const sessionId = parseInt(id)

    if (isNaN(sessionId)) {
      return NextResponse.json({ error: "Invalid session ID" }, { status: 400 })
    }

    // Get session details to verify access and status
    const [bookingSession] = await db
      .select({
        id: bookingSessions.id,
        status: bookingSessions.status,
        learnerId: bookingSessions.learnerId,
        mentorId: bookingSessions.mentorId,
        learnerUserId: users.id,
      })
      .from(bookingSessions)
      .innerJoin(learners, eq(bookingSessions.learnerId, learners.id))
      .innerJoin(users, eq(learners.userId, users.id))
      .where(eq(bookingSessions.id, sessionId))
      .limit(1)

    if (!bookingSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // Verify user is the learner for this session
    if (bookingSession.learnerUserId !== session.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Check if review already exists
    const [existingReview] = await db
      .select({
        id: mentorReviews.id,
        rating: mentorReviews.rating,
        reviewText: mentorReviews.reviewText,
        createdAt: mentorReviews.createdAt,
      })
      .from(mentorReviews)
      .where(
        and(
          eq(mentorReviews.sessionId, sessionId),
          eq(mentorReviews.learnerId, bookingSession.learnerId)
        )
      )
      .limit(1)

    const canReview = bookingSession.status === "completed" && !existingReview
    const hasReviewed = !!existingReview

    return NextResponse.json({
      sessionId,
      sessionStatus: bookingSession.status,
      canReview,
      hasReviewed,
      reviewData: existingReview || null,
      message: hasReviewed 
        ? "Review already submitted for this session" 
        : canReview 
          ? "Review can be submitted" 
          : "Session must be completed to review"
    })

  } catch (error) {
    console.error("[ERROR] Checking review status:", error)
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}