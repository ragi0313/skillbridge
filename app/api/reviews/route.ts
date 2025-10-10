import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { mentorReviews, bookingSessions, users, learners, mentors } from "@/db/schema"
import { eq, and, sql } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { getSession } from "@/lib/auth/getSession"

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.id || session.role !== "learner") {
      return NextResponse.json({ error: "Unauthorized - learners only can review mentors" }, { status: 401 })
    }

    const body = await request.json()
    const { sessionId, rating, reviewText } = body
    
    // Validate required fields
    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
    }
    
    if (!rating) {
      return NextResponse.json({ error: "Rating is required" }, { status: 400 })
    }

    // Parse and validate sessionId
    const sessionIdInt = parseInt(sessionId.toString())
    if (isNaN(sessionIdInt)) {
      return NextResponse.json({ error: "Invalid session ID" }, { status: 400 })
    }

    // Validate rating
    const ratingInt = parseInt(rating.toString())
    if (isNaN(ratingInt) || ratingInt < 1 || ratingInt > 5) {
      return NextResponse.json({ error: "Rating must be a number between 1 and 5" }, { status: 400 })
    }

    // Validate review text (optional, but if provided must be reasonable length)
    let reviewTextClean = ""
    if (reviewText && typeof reviewText === 'string') {
      reviewTextClean = reviewText.trim()
      if (reviewTextClean.length > 0 && reviewTextClean.length < 3) {
        return NextResponse.json({ error: "Review text must be at least 3 characters long when provided" }, { status: 400 })
      }
      if (reviewTextClean.length > 1000) {
        return NextResponse.json({ error: "Review text cannot exceed 1000 characters" }, { status: 400 })
      }
    }

    // Get session details efficiently with single query
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
      .where(eq(bookingSessions.id, sessionIdInt))
      .limit(1)

    if (!bookingSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // Verify user is the learner for this session
    if (bookingSession.learnerUserId !== session.id) {
      return NextResponse.json({ error: "You can only review sessions you participated in" }, { status: 403 })
    }

    // Allow reviews for ongoing and completed sessions
    if (!["ongoing", "completed"].includes(bookingSession.status)) {
      return NextResponse.json(
        { error: `Cannot review sessions with status: ${bookingSession.status}. Only ongoing or completed sessions can be reviewed.` },
        { status: 400 }
      )
    }

    // Check if review already exists (prevent duplicates)
    const [existingReview] = await db
      .select({ id: mentorReviews.id })
      .from(mentorReviews)
      .where(
        and(
          eq(mentorReviews.sessionId, sessionIdInt),
          eq(mentorReviews.learnerId, bookingSession.learnerId)
        )
      )
      .limit(1)

    if (existingReview) {
      return NextResponse.json(
        { error: "You have already reviewed this session" },
        { status: 409 }
      )
    }

    // Create the mentor review
    const [review] = await db
      .insert(mentorReviews)
      .values({
        mentorId: bookingSession.mentorId,
        learnerId: bookingSession.learnerId,
        sessionId: sessionIdInt,
        reviewText: reviewTextClean,
        rating: ratingInt,
      })
      .returning({ id: mentorReviews.id })

    return NextResponse.json(
      { 
        success: true,
        message: "Mentor review submitted successfully",
        reviewId: review.id
      },
      { status: 201 }
    )

  } catch (error) {
    console.error("[ERROR] Creating mentor review:", error)
    
    // Return detailed error info for debugging
    return NextResponse.json(
      { 
        error: "Internal server error", 
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const mentorId = url.searchParams.get("mentorId")
    const sessionId = url.searchParams.get("sessionId")
    const limit = parseInt(url.searchParams.get("limit") || "20")
    const offset = parseInt(url.searchParams.get("offset") || "0")

    if (!mentorId && !sessionId) {
      return NextResponse.json(
        { error: "Either mentorId or sessionId is required" },
        { status: 400 }
      )
    }

    let query = db
      .select({
        id: mentorReviews.id,
        sessionId: mentorReviews.sessionId,
        reviewText: mentorReviews.reviewText,
        rating: mentorReviews.rating,
        createdAt: mentorReviews.createdAt,
        learnerName: users.firstName + " " + users.lastName,
        learnerProfilePicture: learners.profilePictureUrl,
      })
      .from(mentorReviews)
      .leftJoin(learners, eq(mentorReviews.learnerId, learners.id))
      .leftJoin(users, eq(learners.userId, users.id))
      .limit(limit)
      .offset(offset)

    if (mentorId) {
      query = query.where(eq(mentorReviews.mentorId, parseInt(mentorId)))
    } else if (sessionId) {
      query = query.where(eq(mentorReviews.sessionId, parseInt(sessionId)))
    }

    const reviews = await query

    // If getting reviews for a mentor, also calculate average rating
    let averageRating = null
    let totalReviews = 0

    if (mentorId) {
      const stats = await db
        .select({
          avgRating: sql`AVG(${mentorReviews.rating})::float`,
          count: sql`COUNT(*)::int`,
        })
        .from(mentorReviews)
        .where(eq(mentorReviews.mentorId, parseInt(mentorId)))

      if (stats.length > 0 && stats[0].count > 0) {
        averageRating = Math.round(stats[0].avgRating * 10) / 10 // Round to 1 decimal place
        totalReviews = stats[0].count
      }
    }

    return NextResponse.json({ 
      reviews,
      averageRating,
      totalReviews
    })

  } catch (error) {
    console.error("Error fetching reviews:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}