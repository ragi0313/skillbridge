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
      return NextResponse.json({ error: "Unauthorized - learners only" }, { status: 401 })
    }

    const { sessionId, rating, reviewText } = await request.json()

    if (!sessionId || !rating || !reviewText) {
      return NextResponse.json(
        { error: "Missing required fields: sessionId, rating, reviewText" },
        { status: 400 }
      )
    }

    // Validate rating
    if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return NextResponse.json(
        { error: "Rating must be an integer between 1 and 5" },
        { status: 400 }
      )
    }

    // Validate review text
    if (reviewText.trim().length < 10) {
      return NextResponse.json(
        { error: "Review text must be at least 10 characters long" },
        { status: 400 }
      )
    }

    // Get session details and verify user access
    const learnerUsers = alias(users, "learner_users")

    const [bookingSession] = await db
      .select({
        id: bookingSessions.id,
        status: bookingSessions.status,
        learnerId: bookingSessions.learnerId,
        mentorId: bookingSessions.mentorId,
        learnerUser: {
          id: learnerUsers.id,
        },
      })
      .from(bookingSessions)
      .leftJoin(learners, eq(bookingSessions.learnerId, learners.id))
      .leftJoin(learnerUsers, eq(learners.userId, learnerUsers.id))
      .where(eq(bookingSessions.id, parseInt(sessionId)))

    if (!bookingSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // Verify user is the learner for this session
    if (bookingSession.learnerUser?.id !== session.id) {
      return NextResponse.json({ error: "Unauthorized access to session" }, { status: 403 })
    }

    // Check if session is completed
    if (bookingSession.status !== "completed") {
      return NextResponse.json(
        { error: "Can only review completed sessions" },
        { status: 400 }
      )
    }

    // Check if review already exists
    const existingReview = await db
      .select()
      .from(mentorReviews)
      .where(
        and(
          eq(mentorReviews.sessionId, parseInt(sessionId)),
          eq(mentorReviews.learnerId, bookingSession.learnerId)
        )
      )

    if (existingReview.length > 0) {
      return NextResponse.json(
        { error: "Review already exists for this session" },
        { status: 409 }
      )
    }

    // Create the review
    const [review] = await db
      .insert(mentorReviews)
      .values({
        mentorId: bookingSession.mentorId,
        learnerId: bookingSession.learnerId,
        sessionId: parseInt(sessionId),
        reviewText: reviewText.trim(),
        rating,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()

    return NextResponse.json(
      { 
        message: "Review submitted successfully",
        reviewId: review.id
      },
      { status: 201 }
    )

  } catch (error) {
    console.error("Error creating review:", error)
    return NextResponse.json(
      { error: "Internal server error" },
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