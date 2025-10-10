import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth/getSession"
import { db } from "@/db"
import {
  users,
  mentors,
  learners,
  bookingSessions,
  userReports,
  pendingMentors,
  sessionFeedback
} from "@/db/schema"
import { sql, eq, and, gte, count } from "drizzle-orm"

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get current month start for monthly calculations
    const currentMonth = new Date()
    currentMonth.setDate(1)
    currentMonth.setHours(0, 0, 0, 0)

    // Fetch all stats in parallel
    const [
      totalUsersResult,
      totalMentorsResult,
      totalLearnersResult,
      pendingMentorsResult,
      activeSessionsResult,
      completedSessionsResult,
      monthlyRevenueResult,
      totalRevenueResult,
      averageRatingResult,
      totalReportsResult,
      pendingReportsResult,
    ] = await Promise.all([
      // Total users count
      db.select({ count: count() }).from(users),

      // Total active mentors
      db.select({ count: count() }).from(mentors),

      // Total learners
      db.select({ count: count() }).from(learners),

      // Pending mentor applications
      db.select({ count: count() }).from(pendingMentors),

      // Active sessions (ongoing)
      db
        .select({ count: count() })
        .from(bookingSessions)
        .where(eq(bookingSessions.status, "ongoing")),

      // Completed sessions
      db
        .select({ count: count() })
        .from(bookingSessions)
        .where(eq(bookingSessions.status, "completed")),

      // Monthly revenue (this month)
      db
        .select({
          revenue: sql<number>`COALESCE(SUM(${bookingSessions.totalCostCredits}), 0)`,
        })
        .from(bookingSessions)
        .where(
          and(
            eq(bookingSessions.status, "completed"),
            gte(bookingSessions.createdAt, currentMonth)
          )
        ),

      // Total revenue (all time)
      db
        .select({
          revenue: sql<number>`COALESCE(SUM(${bookingSessions.totalCostCredits}), 0)`,
        })
        .from(bookingSessions)
        .where(eq(bookingSessions.status, "completed")),

      // Average rating
      db
        .select({
          avgRating: sql<number>`COALESCE(AVG(${sessionFeedback.overallRating}), 0)`,
        })
        .from(sessionFeedback),

      // Total reports
      db.select({ count: count() }).from(userReports),

      // Pending reports
      db
        .select({ count: count() })
        .from(userReports)
        .where(eq(userReports.status, "pending")),
    ])

    // Simple system health check (can be enhanced)
    const systemHealth = getSystemHealth({
      activeSessionsCount: activeSessionsResult[0]?.count || 0,
      pendingReportsCount: pendingReportsResult[0]?.count || 0,
      pendingMentorsCount: pendingMentorsResult[0]?.count || 0,
    })

    // Convert credits to PHP (assuming 1 credit = 0.2 PHP)
    const creditToPHP = 0.2
    const monthlyRevenue = (monthlyRevenueResult[0]?.revenue || 0) * creditToPHP
    const totalRevenue = (totalRevenueResult[0]?.revenue || 0) * creditToPHP

    return NextResponse.json({
      totalUsers: totalUsersResult[0]?.count || 0,
      totalMentors: totalMentorsResult[0]?.count || 0,
      totalLearners: totalLearnersResult[0]?.count || 0,
      pendingMentors: pendingMentorsResult[0]?.count || 0,
      activeSessions: activeSessionsResult[0]?.count || 0,
      completedSessions: completedSessionsResult[0]?.count || 0,
      monthlyRevenue: Math.round(monthlyRevenue),
      totalRevenue: Math.round(totalRevenue),
      averageRating: Math.round((averageRatingResult[0]?.avgRating || 0) * 10) / 10,
      totalReports: totalReportsResult[0]?.count || 0,
      pendingReports: pendingReportsResult[0]?.count || 0,
      systemHealth,
    })
  } catch (error) {
    console.error("Error fetching dashboard stats:", error)
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    )
  }
}

function getSystemHealth(metrics: {
  activeSessionsCount: number
  pendingReportsCount: number
  pendingMentorsCount: number
}): "excellent" | "good" | "warning" | "critical" {
  // Simple health scoring system
  let score = 100

  // Deduct points for issues
  if (metrics.pendingReportsCount > 10) score -= 30
  else if (metrics.pendingReportsCount > 5) score -= 15

  if (metrics.pendingMentorsCount > 20) score -= 20
  else if (metrics.pendingMentorsCount > 10) score -= 10

  // System load (sessions)
  if (metrics.activeSessionsCount > 100) score -= 10

  if (score >= 90) return "excellent"
  if (score >= 75) return "good"
  if (score >= 50) return "warning"
  return "critical"
}