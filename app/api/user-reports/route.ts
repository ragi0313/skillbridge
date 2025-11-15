import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth/getSession"
import { db } from "@/db"
import { userReports, users } from "@/db/schema"
import { eq } from "drizzle-orm"
import { withRateLimit } from "@/lib/middleware/rate-limit"

async function handleCreateUserReport(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session || !session.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { reportedUserId, category, description, sessionId, evidence } = body

    // Validation
    if (!reportedUserId || !category || !description) {
      return NextResponse.json(
        { error: "Missing required fields: reportedUserId, category, description" },
        { status: 400 }
      )
    }

    // Validate category
    const validCategories = ["harassment", "inappropriate_content", "fraud", "spam", "other"]
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: "Invalid category. Must be one of: " + validCategories.join(", ") },
        { status: 400 }
      )
    }

    // Prevent self-reporting
    if (session.id === reportedUserId) {
      return NextResponse.json(
        { error: "You cannot report yourself" },
        { status: 400 }
      )
    }

    // Verify reported user exists
    const [reportedUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, reportedUserId))

    if (!reportedUser) {
      return NextResponse.json(
        { error: "Reported user not found" },
        { status: 404 }
      )
    }

    // Create the report
    const [report] = await db.insert(userReports).values({
      reporterId: session.id,
      reportedUserId,
      sessionId: sessionId || null,
      category,
      description,
      evidence: evidence || null,
      status: "pending",
    }).returning()

    return NextResponse.json({
      success: true,
      message: "Report submitted successfully. Our team will review it shortly.",
      reportId: report.id
    }, { status: 201 })

  } catch (error) {
    console.error("Error creating user report:", error)
    return NextResponse.json(
      { error: "Failed to submit report. Please try again later." },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit({
  maxRequests: 5, // Max 5 reports per hour to prevent spam
  windowMs: 60 * 60 * 1000, // 1 hour
}, handleCreateUserReport)
