import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth/getSession"
import { db } from "@/db"
import {
  users,
  mentors,
  learners,
  bookingSessions,
  userReports
} from "@/db/schema"
import { sql, gte, and, eq } from "drizzle-orm"
import { format, subDays, subMonths, startOfMonth, endOfMonth } from "date-fns"

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const days = parseInt(searchParams.get("days") || "30")

    // Calculate date range for charts
    const endDate = new Date()
    const startDate = subDays(endDate, days)

    // Get number of months to show based on days
    const monthsToShow = Math.max(3, Math.ceil(days / 30))

    // Generate month labels
    const monthLabels = []
    for (let i = monthsToShow - 1; i >= 0; i--) {
      const date = subMonths(new Date(), i)
      monthLabels.push({
        label: format(date, "MMM yyyy"),
        startDate: startOfMonth(date),
        endDate: endOfMonth(date),
      })
    }

    // User growth data
    const userGrowthData = await Promise.all(
      monthLabels.map(async ({ label, startDate, endDate }) => {
        const [totalUsers, totalMentors, totalLearners] = await Promise.all([
          db
            .select({ count: sql<number>`count(*)` })
            .from(users)
            .where(gte(users.createdAt, startDate)),

          db
            .select({ count: sql<number>`count(*)` })
            .from(mentors)
            .where(gte(mentors.createdAt, startDate)),

          db
            .select({ count: sql<number>`count(*)` })
            .from(learners)
            .where(gte(learners.createdAt, startDate)),
        ])

        return {
          month: label,
          users: totalUsers[0]?.count || 0,
          mentors: totalMentors[0]?.count || 0,
          learners: totalLearners[0]?.count || 0,
        }
      })
    )

    // Session and revenue data
    const sessionStatsData = await Promise.all(
      monthLabels.map(async ({ label, startDate, endDate }) => {
        const [sessionCount, revenue] = await Promise.all([
          db
            .select({ count: sql<number>`count(*)` })
            .from(bookingSessions)
            .where(
              and(
                gte(bookingSessions.createdAt, startDate),
                eq(bookingSessions.status, "completed")
              )
            ),

          db
            .select({
              total: sql<number>`COALESCE(SUM(${bookingSessions.totalCostCredits}), 0)`,
            })
            .from(bookingSessions)
            .where(
              and(
                gte(bookingSessions.createdAt, startDate),
                eq(bookingSessions.status, "completed")
              )
            ),
        ])

        // Convert credits to PHP (1 credit = 0.2 PHP)
        const revenueInPHP = (revenue[0]?.total || 0) * 0.2

        return {
          month: label,
          sessions: sessionCount[0]?.count || 0,
          revenue: Math.round(revenueInPHP),
        }
      })
    )

    // Reports distribution data
    const reportsData = await db
      .select({
        category: userReports.category,
        count: sql<number>`count(*)`,
      })
      .from(userReports)
      .where(gte(userReports.createdAt, startDate))
      .groupBy(userReports.category)

    // Add colors for each category
    const colors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"]
    const reportsWithColors = reportsData.map((item, index) => ({
      category: item.category || "Other",
      count: item.count,
      color: colors[index % colors.length],
    }))

    return NextResponse.json({
      userGrowth: userGrowthData,
      sessionStats: sessionStatsData,
      reportsData: reportsWithColors,
    })
  } catch (error) {
    console.error("Error fetching dashboard charts:", error)
    return NextResponse.json(
      { error: "Failed to fetch dashboard charts" },
      { status: 500 }
    )
  }
}