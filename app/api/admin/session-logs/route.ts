import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth/getSession"
import { db } from "@/db"
import {
  bookingSessions,
  mentors,
  learners,
  users as usersTable,
  mentorSkills,
  sessionFeedback,
  refundRequests
} from "@/db/schema"
import { desc, like, and, gte, sql, eq, or, inArray } from "drizzle-orm"

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }


    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = 20
    const offset = (page - 1) * limit

    const search = searchParams.get("search") || ""
    const status = searchParams.get("status") || "all"
    const days = parseInt(searchParams.get("days") || "7")
    const isExport = searchParams.get("export") === "true"

    // Build filters
    const filters = []

    // Search filter - will work now that we have proper joins
    if (search) {
      filters.push(
        or(
          like(sql`concat(mentor_users.first_name, ' ', mentor_users.last_name)`, `%${search}%`),
          like(sql`concat(learner_users.first_name, ' ', learner_users.last_name)`, `%${search}%`),
          like(mentorSkills.skillName, `%${search}%`)
        )
      )
    }

    // Status filter - CRITICAL: Handle no-shows correctly
    if (status !== "all") {
      // Handle "no shows" filter - should include all no-show statuses
      if (status === "both_no_show") {
        filters.push(
          or(
            eq(bookingSessions.status, "both_no_show"),
            eq(bookingSessions.status, "learner_no_show"),
            eq(bookingSessions.status, "mentor_no_show")
          )
        )
      } else {
        filters.push(eq(bookingSessions.status, status))
      }
    }

    // Date filter
    const dateFilter = gte(
      bookingSessions.createdAt,
      new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    )
    filters.push(dateFilter)

    const whereClause = filters.length > 0 ? and(...filters) : undefined

    // Get sessions with basic data first
    // We need to join mentor and learner users for search to work
    const mentorUsers = usersTable
    const learnerUsers = usersTable

    const sessions = await db
      .select({
        id: bookingSessions.id,
        mentorId: bookingSessions.mentorId,
        learnerId: bookingSessions.learnerId,
        skillName: mentorSkills.skillName,
        status: bookingSessions.status,
        scheduledDate: bookingSessions.scheduledDate,
        startTime: bookingSessions.startTime,
        endTime: bookingSessions.endTime,
        durationMinutes: bookingSessions.durationMinutes,
        totalCostCredits: bookingSessions.totalCostCredits,
        sessionNotes: bookingSessions.sessionNotes,
        agoraChannelName: bookingSessions.agoraChannelName,
        learnerJoinedAt: bookingSessions.learnerJoinedAt,
        mentorJoinedAt: bookingSessions.mentorJoinedAt,
        learnerLeftAt: bookingSessions.learnerLeftAt,
        mentorLeftAt: bookingSessions.mentorLeftAt,
        learnerConnectionDurationMs: bookingSessions.learnerConnectionDurationMs,
        mentorConnectionDurationMs: bookingSessions.mentorConnectionDurationMs,
        createdAt: bookingSessions.createdAt,
        overallRating: sessionFeedback.overallRating,
        communicationRating: sessionFeedback.communicationRating,
        refundRequestId: refundRequests.id,
        refundStatus: refundRequests.status,
        refundReason: refundRequests.requestReason,
        refundAmount: refundRequests.refundedAmount,
        refundRequestedAt: refundRequests.createdAt,
        mentorFirstName: sql<string>`mentor_users.first_name`,
        mentorLastName: sql<string>`mentor_users.last_name`,
        learnerFirstName: sql<string>`learner_users.first_name`,
        learnerLastName: sql<string>`learner_users.last_name`,
      })
      .from(bookingSessions)
      .leftJoin(mentors, eq(bookingSessions.mentorId, mentors.id))
      .leftJoin(learners, eq(bookingSessions.learnerId, learners.id))
      .leftJoin(sql`${usersTable} as mentor_users`, sql`${mentors.userId} = mentor_users.id`)
      .leftJoin(sql`${usersTable} as learner_users`, sql`${learners.userId} = learner_users.id`)
      .leftJoin(mentorSkills, eq(bookingSessions.mentorSkillId, mentorSkills.id))
      .leftJoin(sessionFeedback, eq(sessionFeedback.sessionId, bookingSessions.id))
      .leftJoin(refundRequests, eq(refundRequests.sessionId, bookingSessions.id))
      .where(whereClause)
      .orderBy(desc(bookingSessions.createdAt))
      .limit(isExport ? 1000 : limit)
      .offset(isExport ? 0 : offset)

    // Names are now directly in the query, just format them
    const sessionsWithNames = sessions.map(session => ({
      ...session,
      mentorName: session.mentorFirstName && session.mentorLastName
        ? `${session.mentorFirstName} ${session.mentorLastName}`
        : 'Unknown',
      learnerName: session.learnerFirstName && session.learnerLastName
        ? `${session.learnerFirstName} ${session.learnerLastName}`
        : 'Unknown'
    }))

    if (isExport) {
      // Export CSV - use the sessions we already have
      const allSessions = sessionsWithNames

      // Convert to CSV
      const csvHeaders = [
        "ID", "Mentor", "Learner", "Skill", "Status", "Scheduled Date",
        "Duration (min)", "Cost (credits)",
        "Learner Joined At", "Learner Left At", "Learner Duration (min)",
        "Mentor Joined At", "Mentor Left At", "Mentor Duration (min)",
        "Overall Rating", "Communication Rating",
        "Session Notes", "Created At"
      ]

      const csvRows = allSessions.map(session => [
        session.id,
        session.mentorName || "Unknown",
        session.learnerName || "Unknown",
        session.skillName || "Unknown",
        session.status,
        session.scheduledDate ? new Date(session.scheduledDate).toISOString() : "",
        session.durationMinutes || 0,
        session.totalCostCredits || 0,
        session.learnerJoinedAt ? new Date(session.learnerJoinedAt).toISOString() : "",
        session.learnerLeftAt ? new Date(session.learnerLeftAt).toISOString() : "",
        session.learnerConnectionDurationMs ? Math.round(session.learnerConnectionDurationMs / 60000) : "",
        session.mentorJoinedAt ? new Date(session.mentorJoinedAt).toISOString() : "",
        session.mentorLeftAt ? new Date(session.mentorLeftAt).toISOString() : "",
        session.mentorConnectionDurationMs ? Math.round(session.mentorConnectionDurationMs / 60000) : "",
        session.overallRating || "",
        session.communicationRating || "",
        `"${(session.sessionNotes || "").replace(/"/g, '""')}"`, // Escape quotes
        new Date(session.createdAt).toISOString(),
      ])

      const csvContent = [csvHeaders, ...csvRows].map(row => row.join(",")).join("\n")

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="session-logs-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      })
    }

    // Get total count for pagination - must have same joins as main query for filters to work
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(bookingSessions)
      .leftJoin(mentors, eq(bookingSessions.mentorId, mentors.id))
      .leftJoin(learners, eq(bookingSessions.learnerId, learners.id))
      .leftJoin(sql`${usersTable} as mentor_users`, sql`${mentors.userId} = mentor_users.id`)
      .leftJoin(sql`${usersTable} as learner_users`, sql`${learners.userId} = learner_users.id`)
      .leftJoin(mentorSkills, eq(bookingSessions.mentorSkillId, mentorSkills.id))
      .leftJoin(sessionFeedback, eq(sessionFeedback.sessionId, bookingSessions.id))
      .where(whereClause)

    const totalCount = countResult[0]?.count || 0
    const totalPages = Math.ceil(totalCount / limit)

    // Note: IP logging removed for session log viewing as it's not a security-critical action
    // IP addresses are still logged for actual user actions (login, suspend, blacklist, etc.)

    return NextResponse.json({
      sessions: sessionsWithNames,
      currentPage: page,
      totalPages,
      totalCount,
    })
  } catch (error) {
    console.error("Error fetching session logs:", error)
    return NextResponse.json(
      { error: "Failed to fetch session logs" },
      { status: 500 }
    )
  }
}