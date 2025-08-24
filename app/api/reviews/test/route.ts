import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { mentorReviews } from "@/db/schema"
import { desc } from "drizzle-orm"

export async function GET() {
  try {
    // Get the latest 5 mentor reviews to verify table structure
    const reviews = await db
      .select({
        id: mentorReviews.id,
        mentorId: mentorReviews.mentorId,
        learnerId: mentorReviews.learnerId,
        sessionId: mentorReviews.sessionId,
        rating: mentorReviews.rating,
        reviewText: mentorReviews.reviewText,
        createdAt: mentorReviews.createdAt,
      })
      .from(mentorReviews)
      .orderBy(desc(mentorReviews.createdAt))
      .limit(5)

    return NextResponse.json({
      success: true,
      message: "Mentor reviews table test",
      totalReviews: reviews.length,
      recentReviews: reviews,
      tableStructure: {
        id: "serial primary key",
        mentorId: "integer references mentors(id)",
        learnerId: "integer references learners(id)",
        sessionId: "integer references booking_sessions(id)",
        rating: "integer (1-5)",
        reviewText: "text",
        createdAt: "timestamp",
        updatedAt: "timestamp"
      }
    })
  } catch (error) {
    console.error("[ERROR] Testing mentor reviews table:", error)
    return NextResponse.json(
      { 
        error: "Failed to test mentor reviews table",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}