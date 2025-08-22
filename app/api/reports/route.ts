import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { sessionReports, bookingSessions, users, learners, mentors } from "@/db/schema"
import { eq } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { getSession } from "@/lib/auth/getSession"

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { sessionId, reportType, reason, description } = await request.json()

    if (!sessionId || !reportType || !reason) {
      return NextResponse.json(
        { error: "Missing required fields: sessionId, reportType, reason" },
        { status: 400 }
      )
    }

    // Validate report type
    const validReportTypes = ["abuse", "harassment", "technical_misconduct", "other"]
    if (!validReportTypes.includes(reportType)) {
      return NextResponse.json(
        { error: "Invalid report type" },
        { status: 400 }
      )
    }

    // Get session details and verify user access
    const learnerUsers = alias(users, "learner_users")
    const mentorUsers = alias(users, "mentor_users")

    const [bookingSession] = await db
      .select({
        id: bookingSessions.id,
        status: bookingSessions.status,
        learnerId: bookingSessions.learnerId,
        mentorId: bookingSessions.mentorId,
        learnerUser: {
          id: learnerUsers.id,
        },
        mentorUser: {
          id: mentorUsers.id,
        },
      })
      .from(bookingSessions)
      .leftJoin(learners, eq(bookingSessions.learnerId, learners.id))
      .leftJoin(mentors, eq(bookingSessions.mentorId, mentors.id))
      .leftJoin(learnerUsers, eq(learners.userId, learnerUsers.id))
      .leftJoin(mentorUsers, eq(mentors.userId, mentorUsers.id))
      .where(eq(bookingSessions.id, parseInt(sessionId)))

    if (!bookingSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // Verify user has access to this session
    const isLearner = bookingSession.learnerUser?.id === session.id
    const isMentor = bookingSession.mentorUser?.id === session.id

    if (!isLearner && !isMentor) {
      return NextResponse.json({ error: "Unauthorized access to session" }, { status: 403 })
    }

    // Check if session is in a reportable state
    const reportableStatuses = ["completed", "cancelled", "no_show_learner", "no_show_mentor", "technical_issues"]
    if (!reportableStatuses.includes(bookingSession.status || "")) {
      return NextResponse.json(
        { error: "Session is not in a reportable state" },
        { status: 400 }
      )
    }

    // Determine the reported user (the other party)
    const reportedUserId = isLearner ? bookingSession.mentorUser?.id : bookingSession.learnerUser?.id

    if (!reportedUserId) {
      return NextResponse.json({ error: "Unable to determine reported user" }, { status: 400 })
    }

    // Create the report
    const [report] = await db
      .insert(sessionReports)
      .values({
        sessionId: parseInt(sessionId),
        reportedBy: session.id,
        reportedUser: reportedUserId,
        reportType,
        reason,
        description: description || null,
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()

    return NextResponse.json(
      { 
        message: "Report submitted successfully",
        reportId: report.id
      },
      { status: 201 }
    )

  } catch (error) {
    console.error("Error creating report:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only allow admins to view reports
    if (session.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const url = new URL(request.url)
    const status = url.searchParams.get("status")
    const limit = parseInt(url.searchParams.get("limit") || "50")
    const offset = parseInt(url.searchParams.get("offset") || "0")

    let query = db
      .select({
        id: sessionReports.id,
        sessionId: sessionReports.sessionId,
        reportType: sessionReports.reportType,
        reason: sessionReports.reason,
        description: sessionReports.description,
        status: sessionReports.status,
        adminNotes: sessionReports.adminNotes,
        createdAt: sessionReports.createdAt,
        reportedBy: users.firstName + " " + users.lastName,
        reportedUser: "Unknown", // Will be populated with complex query if needed
      })
      .from(sessionReports)
      .leftJoin(users, eq(sessionReports.reportedBy, users.id))
      .limit(limit)
      .offset(offset)

    if (status) {
      query = query.where(eq(sessionReports.status, status))
    }

    const reports = await query

    return NextResponse.json({ reports })

  } catch (error) {
    console.error("Error fetching reports:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}