import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth/getSession"
import { db } from "@/db"
import { userReports, users } from "@/db/schema"
import { eq, desc, sql, and } from "drizzle-orm"

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status") || "pending"

    // Create aliases for reporter and reported user
    const reporter = sql`reporter`
    const reportedUser = sql`reported_user`

    // Build the query
    let query = db
      .select({
        id: userReports.id,
        reporterName: sql<string>`concat(reporter.first_name, ' ', reporter.last_name)`,
        reportedUserName: sql<string>`concat(reported_user.first_name, ' ', reported_user.last_name)`,
        reportedUserRole: sql<string>`reported_user.role`,
        category: userReports.category,
        description: userReports.description,
        status: userReports.status,
        sessionId: userReports.sessionId,
        evidence: userReports.evidence,
        adminNotes: userReports.adminNotes,
        reviewedBy: sql<string>`concat(reviewer.first_name, ' ', reviewer.last_name)`,
        reviewedAt: userReports.reviewedAt,
        resolution: userReports.resolution,
        createdAt: userReports.createdAt,
      })
      .from(userReports)
      .leftJoin(
        sql`users as reporter`,
        sql`reporter.id = ${userReports.reporterId}`
      )
      .leftJoin(
        sql`users as reported_user`,
        sql`reported_user.id = ${userReports.reportedUserId}`
      )
      .leftJoin(
        sql`users as reviewer`,
        sql`reviewer.id = ${userReports.reviewedBy}`
      )
      .orderBy(desc(userReports.createdAt))
      .$dynamic()

    // Filter by status
    if (status !== "all") {
      query = query.where(eq(userReports.status, status))
    }

    const reports = await query

    return NextResponse.json({ reports })
  } catch (error) {
    console.error("Error fetching user reports:", error)
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 }
    )
  }
}
