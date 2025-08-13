import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth/getSession"
import { db } from "@/db"
import { mentors, bookingSessions, mentorSkills, users, mentorReviews } from "@/db/schema"
import { eq, count, sum, avg, desc, gte, and } from "drizzle-orm"

export async function GET() {
  try {
    const session = await getSession()
    if (!session || session.role !== "mentor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const mentor = await db.query.mentors.findFirst({
      where: eq(mentors.userId, session.id),
    })

    if (!mentor) {
      return NextResponse.json({ error: "Mentor profile not found" }, { status: 404 })
    }
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.id)
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get current date for time-based queries
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Get total sessions (completed only)
    const totalSessionsResult = await db
      .select({ count: count() })
      .from(bookingSessions)
      .where(
        and(
          eq(bookingSessions.mentorId, mentor.id),
          eq(bookingSessions.status, "completed")
        )
      )

    const totalSessions = totalSessionsResult[0]?.count || 0

    // Get sessions this month
    const monthlySessionsResult = await db
      .select({ count: count() })
      .from(bookingSessions)
      .where(
        and(
          eq(bookingSessions.mentorId, mentor.id),
          gte(bookingSessions.createdAt, thirtyDaysAgo),
          eq(bookingSessions.status, "completed")
        )
      )

    const monthlySessions = monthlySessionsResult[0]?.count || 0

    // Get total earnings (completed sessions only)
    const earningsResult = await db
      .select({
        totalEarnings: sum(bookingSessions.totalCostCredits),
      })
      .from(bookingSessions)
      .where(
        and(
          eq(bookingSessions.mentorId, mentor.id),
          eq(bookingSessions.status, "completed")
        )
      )

    const totalEarnings = Math.floor((Number(earningsResult[0]?.totalEarnings) || 0) * 0.8) // 80% after platform fee

    // Get average rating from mentor reviews
    const ratingResult = await db
      .select({
        avgRating: avg(mentorReviews.rating),
      })
      .from(mentorReviews)
      .where(eq(mentorReviews.mentorId, mentor.id))

    const averageRating = Number(ratingResult[0]?.avgRating) || 0

    // Get upcoming sessions (confirmed, pending, or accepted - adjust status names as needed)
    const upcomingSessionsResult = await db
      .select({ count: count() })
      .from(bookingSessions)
      .where(
        and(
          eq(bookingSessions.mentorId, mentor.id),
          gte(bookingSessions.scheduledDate, now)
          // Add status filter if needed: in(['confirmed', 'accepted'])
        )
      )

    const upcomingCount = upcomingSessionsResult[0]?.count || 0

    // Get recent sessions for activity (all statuses for recent activity)
    const recentSessions = await db
      .select({
        id: bookingSessions.id,
        scheduledDate: bookingSessions.scheduledDate,
        status: bookingSessions.status,
        totalCostCredits: bookingSessions.totalCostCredits,
        createdAt: bookingSessions.createdAt,
      })
      .from(bookingSessions)
      .where(eq(bookingSessions.mentorId, mentor.id))
      .orderBy(desc(bookingSessions.createdAt))
      .limit(5)

    // Get mentor skills for pricing recommendations
    const skills = await db
      .select({
        skillName: mentorSkills.skillName,
        ratePerHour: mentorSkills.ratePerHour,
      })
      .from(mentorSkills)
      .where(
        and(
          eq(mentorSkills.mentorId, mentor.id),
          eq(mentorSkills.isActive, true)
        )
      )

    // Calculate completion rate (based on all sessions, not just recent ones)
    const allSessionsResult = await db
      .select({ 
        status: bookingSessions.status 
      })
      .from(bookingSessions)
      .where(eq(bookingSessions.mentorId, mentor.id))

    const allSessions = allSessionsResult.length
    const completedSessionsCount = allSessionsResult.filter((s) => s.status === "completed").length
    const completionRate = allSessions > 0 ? Math.round((completedSessionsCount / allSessions) * 100) : 0

    // Check profile completeness
    const profileCompleteness = calculateProfileCompleteness(mentor)

    return NextResponse.json({
      totalSessions,
      monthlySessions,
      totalEarnings,
      averageRating: Math.round(averageRating * 10) / 10,
      upcomingCount,
      completionRate,
      profileCompleteness,
      recentSessions: recentSessions.map((session) => ({
        ...session,
        earnedCredits: Math.floor(Number(session.totalCostCredits) * 0.8),
      })),
      skills,
      mentor: {
        name: `${user.firstName} ${user.lastName}`,
        profilePicture: mentor.profilePictureUrl,
        bio: mentor.bio,
      },
    })
  } catch (error) {
    console.error("Error fetching mentor dashboard stats:", error)
    return NextResponse.json({ error: "Failed to fetch dashboard stats" }, { status: 500 })
  }
}

function calculateProfileCompleteness(mentor: any): number {
  let completeness = 0
  const fields = [
    mentor.profilePictureUrl,
    mentor.bio,
    mentor.professionalTitle,
    mentor.yearsOfExperience,
    mentor.languagesSpoken,
    mentor.linkedInUrl,
  ]

  fields.forEach((field) => {
    if (field && field.toString().trim()) {
      completeness += 100 / fields.length
    }
  })

  return Math.round(completeness)
}