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

    // Find mentor profile
    const mentor = await db.query.mentors.findFirst({
      where: eq(mentors.userId, session.id),
    })

    if (!mentor) {
      return NextResponse.json({ error: "Mentor profile not found" }, { status: 404 })
    }
    
    // Find user details (only select needed fields)
    const user = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName
      })
      .from(users)
      .where(eq(users.id, session.id))
      .then(rows => rows[0])

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Initialize default values
    const stats = {
      totalSessions: 0,
      monthlySessions: 0,
      totalEarnings: 0,
      averageRating: 0,
      upcomingCount: 0,
      completionRate: 0,
      profileCompleteness: 0,
      recentSessions: [],
      skills: [],
      mentor: {
        name: `${user.firstName} ${user.lastName}`,
        profilePicture: mentor.profilePictureUrl,
        bio: mentor.bio,
      }
    }

    try {
      // Get current date for time-based queries
      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      // Get all sessions for this mentor (simple query first)
      const allSessions = await db
        .select({
          id: bookingSessions.id,
          status: bookingSessions.status,
          scheduledDate: bookingSessions.scheduledDate,
          totalCostCredits: bookingSessions.totalCostCredits,
          createdAt: bookingSessions.createdAt,
        })
        .from(bookingSessions)
        .where(eq(bookingSessions.mentorId, mentor.id))
        .orderBy(desc(bookingSessions.createdAt))

      // Calculate stats from the retrieved sessions
      const completedSessions = allSessions.filter(s => s.status === "completed")
      const recentSessions = allSessions.filter(s => {
        const sessionDate = new Date(s.createdAt || s.scheduledDate)
        return sessionDate >= thirtyDaysAgo
      }).filter(s => s.status === "completed")

      const upcomingSessions = allSessions.filter(s => {
        const sessionDate = new Date(s.scheduledDate)
        return sessionDate >= now && s.status !== "completed" && s.status !== "cancelled"
      })

      stats.totalSessions = completedSessions.length
      stats.monthlySessions = recentSessions.length
      stats.upcomingCount = upcomingSessions.length
      stats.totalEarnings = Math.floor(
        completedSessions.reduce((sum, session) => {
          return sum + (Number(session.totalCostCredits) || 0)
        }, 0) * 0.8 // 80% after platform fee
      )

      // Calculate completion rate
      stats.completionRate = allSessions.length > 0 
        ? Math.round((completedSessions.length / allSessions.length) * 100) 
        : 0

      // Get recent sessions for display (limit to 5)
      stats.recentSessions = allSessions.slice(0, 5).map((session) => ({
        ...session,
        earnedCredits: Math.floor(Number(session.totalCostCredits || 0) * 0.8),
      }))

      } catch (sessionError) {
      console.error("Dashboard stats: Error fetching session data:", sessionError)
      // Continue with default values for sessions
    }

    try {
      // Get mentor skills
      const skillsData = await db
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

      stats.skills = skillsData
      } catch (skillsError) {
      console.error("Dashboard stats: Error fetching skills:", skillsError)
      // Continue with empty skills array
    }

    try {
      // Get average rating
      const ratingResult = await db
        .select({
          avgRating: avg(mentorReviews.rating),
        })
        .from(mentorReviews)
        .where(eq(mentorReviews.mentorId, mentor.id))

      stats.averageRating = Math.round((Number(ratingResult[0]?.avgRating) || 0) * 10) / 10
      } catch (ratingError) {
      console.error("Dashboard stats: Error fetching ratings:", ratingError)
      // Continue with default rating
    }

    // Calculate profile completeness
    stats.profileCompleteness = calculateProfileCompleteness(mentor)

    return NextResponse.json(stats)

  } catch (error) {
    console.error("Dashboard stats: Critical error:", error)
    return NextResponse.json({ 
      error: "Failed to fetch dashboard stats", 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 })
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