import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { bookingSessions, learners, mentors } from "@/db/schema"

// This is a test endpoint - only enable in development
export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: "Test endpoints disabled in production" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { action } = body

    if (action === 'create_test_session') {
      // Create a test session that should trigger no-show detection
      const now = new Date()
      
      // Create with a scheduled date in the past to trigger immediate processing
      const scheduledDate = new Date(now.getTime() - 20 * 60 * 1000) // 20 minutes ago
      
      const testSession = await db.insert(bookingSessions).values({
        learnerId: 1, // Assume these exist - adjust as needed
        mentorId: 1,
        mentorSkillId: 1,
        scheduledDate,
        durationMinutes: 60,
        totalCostCredits: 100,
        escrowCredits: 100,
        sessionNotes: 'Test session for monitoring',
        status: 'confirmed',
        archived: false,
        expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000), // Expires in 24 hours
        learnerRequestCount: 1,
        createdAt: now,
        updatedAt: now,
        // Leave join fields null to simulate no-show
        learnerJoinedAt: null,
        mentorJoinedAt: null,
      }).returning({ id: bookingSessions.id })

      console.log(`✅ Created test session ${testSession[0].id} for monitoring test`)
      
      return NextResponse.json({
        success: true,
        message: "Test session created successfully",
        session: {
          id: testSession[0].id,
          scheduledDate: scheduledDate.toISOString(),
          status: 'confirmed',
          note: 'This session should trigger no-show detection within 1-2 minutes'
        }
      })
    }

    if (action === 'create_upcoming_session') {
      // Create a session that should transition to upcoming
      const now = new Date()
      const scheduledDate = new Date(now.getTime() + 25 * 60 * 1000) // 25 minutes from now (within 30 min window)
      
      const testSession = await db.insert(bookingSessions).values({
        learnerId: 1,
        mentorId: 1,
        mentorSkillId: 1,
        scheduledDate,
        durationMinutes: 60,
        totalCostCredits: 100,
        escrowCredits: 100,
        sessionNotes: 'Test upcoming session',
        status: 'confirmed',
        archived: false,
        expiresAt: new Date(scheduledDate.getTime() + 24 * 60 * 60 * 1000),
        learnerRequestCount: 1,
        createdAt: now,
        updatedAt: now,
      }).returning({ id: bookingSessions.id })

      console.log(`✅ Created test session ${testSession[0].id} for upcoming transition test`)
      
      return NextResponse.json({
        success: true,
        message: "Test upcoming session created successfully",
        session: {
          id: testSession[0].id,
          scheduledDate: scheduledDate.toISOString(),
          status: 'confirmed',
          note: 'This session should transition to upcoming status'
        }
      })
    }

    return NextResponse.json({
      error: "Invalid action. Use 'create_test_session' or 'create_upcoming_session'"
    }, { status: 400 })

  } catch (error) {
    console.error("Error creating test session:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to create test session",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: "Test endpoints disabled in production" }, { status: 403 })
  }

  return NextResponse.json({
    message: "Test session creation endpoint",
    actions: [
      "POST with action: 'create_test_session' - Creates a session that should trigger no-show",
      "POST with action: 'create_upcoming_session' - Creates a session that should transition to upcoming"
    ]
  })
}