import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth/getSession"
import { db } from "@/db"
import { bookingSessions, learners, users, mentors, mentorSkills, mentorReviews } from "@/db/schema"
import { eq, desc, and, gte, sql } from "drizzle-orm"

export async function GET() {
  try {
    const session = await getSession()

    if (!session?.id || session.role !== 'learner') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get learner record
    const learner = await db.query.learners.findFirst({
      where: (learners, { eq }) => eq(learners.userId, session.id),
      with: {
        user: true
      }
    })

    if (!learner) {
      return NextResponse.json({ error: "Learner not found" }, { status: 404 })
    }

    // Get all sessions with duration fields
    const allSessions = await db
      .select({
        id: bookingSessions.id,
        status: bookingSessions.status,
        scheduledDate: bookingSessions.scheduledDate,
        totalCostCredits: bookingSessions.totalCostCredits,
        durationMinutes: bookingSessions.durationMinutes,
        learnerConnectionDurationMs: bookingSessions.learnerConnectionDurationMs,
        createdAt: bookingSessions.createdAt,
      })
      .from(bookingSessions)
      .where(eq(bookingSessions.learnerId, learner.id))
      .orderBy(desc(bookingSessions.createdAt))

    // Calculate stats
    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const completedSessions = allSessions.filter(s => s.status === 'completed')
    const pendingSessions = allSessions.filter(s => s.status === 'pending')
    const confirmedSessions = allSessions.filter(s => ['confirmed', 'upcoming'].includes(s.status))

    const totalSessions = completedSessions.length
    const monthlySessions = completedSessions.filter(
      s => new Date(s.scheduledDate) >= firstDayOfMonth
    ).length

    // Credits invested should count ALL booked sessions, not just completed
    // This includes pending, confirmed, completed - any session where credits were allocated
    const totalCreditsSpent = allSessions
      .filter(s => !['cancelled', 'rejected', 'mentor_no_response'].includes(s.status)) // Exclude cancelled/rejected (refunded)
      .reduce((sum, s) => sum + (s.totalCostCredits || 0), 0)

    // Use actual connection duration if available, otherwise use scheduled duration
    const totalHours = completedSessions.reduce((sum, s) => {
      // Prefer actual connection duration
      if (s.learnerConnectionDurationMs && s.learnerConnectionDurationMs > 0) {
        return sum + (s.learnerConnectionDurationMs / (1000 * 60 * 60))
      }
      // Fallback to scheduled duration
      if (s.durationMinutes && s.durationMinutes > 0) {
        return sum + (s.durationMinutes / 60)
      }
      return sum
    }, 0)

    // Get upcoming sessions
    const upcomingSessions = await db
      .select({
        id: bookingSessions.id,
        scheduledDate: bookingSessions.scheduledDate,
        startTime: bookingSessions.startTime,
        endTime: bookingSessions.endTime,
        durationMinutes: bookingSessions.durationMinutes,
        totalCostCredits: bookingSessions.totalCostCredits,
        status: bookingSessions.status,
        mentorFirstName: users.firstName,
        mentorLastName: users.lastName,
        mentorProfilePictureUrl: mentors.profilePictureUrl,
        skillName: mentorSkills.skillName,
      })
      .from(bookingSessions)
      .leftJoin(mentors, eq(bookingSessions.mentorId, mentors.id))
      .leftJoin(users, eq(mentors.userId, users.id))
      .leftJoin(mentorSkills, eq(bookingSessions.mentorSkillId, mentorSkills.id))
      .where(
        and(
          eq(bookingSessions.learnerId, learner.id),
          eq(bookingSessions.status, 'confirmed'),
          gte(bookingSessions.scheduledDate, sql`CURRENT_DATE`)
        )
      )
      .orderBy(bookingSessions.scheduledDate)
      .limit(5)

    // Get recent completed sessions with mentor review info
    const recentSessions = await db
      .select({
        id: bookingSessions.id,
        scheduledDate: bookingSessions.scheduledDate,
        startTime: bookingSessions.startTime,
        durationMinutes: bookingSessions.durationMinutes,
        totalCostCredits: bookingSessions.totalCostCredits,
        status: bookingSessions.status,
        mentorFirstName: users.firstName,
        mentorLastName: users.lastName,
        mentorProfilePictureUrl: mentors.profilePictureUrl,
        mentorProfessionalTitle: mentors.professionalTitle,
        skillName: mentorSkills.skillName,
        ratePerHour: mentorSkills.ratePerHour,
        // Mentor review info
        reviewId: mentorReviews.id,
        reviewRating: mentorReviews.rating,
        reviewText: mentorReviews.reviewText,
        reviewCreatedAt: mentorReviews.createdAt,
      })
      .from(bookingSessions)
      .leftJoin(mentors, eq(bookingSessions.mentorId, mentors.id))
      .leftJoin(users, eq(mentors.userId, users.id))
      .leftJoin(mentorSkills, eq(bookingSessions.mentorSkillId, mentorSkills.id))
      .leftJoin(mentorReviews, eq(bookingSessions.id, mentorReviews.sessionId))
      .where(
        and(
          eq(bookingSessions.learnerId, learner.id),
          eq(bookingSessions.status, 'completed')
        )
      )
      .orderBy(desc(bookingSessions.scheduledDate))
      .limit(6)

    return NextResponse.json({
      learner: {
        name: `${learner.user.firstName} ${learner.user.lastName}`,
        firstName: learner.user.firstName,
        profilePicture: learner.profilePictureUrl,
        creditsBalance: learner.creditsBalance || 0,
        learningGoals: learner.learningGoals,
        experienceLevel: learner.experienceLevel,
      },
      stats: {
        totalSessions,
        monthlySessions,
        totalCreditsSpent,
        totalHours: Math.round(totalHours * 10) / 10, // Round to 1 decimal
        creditsBalance: learner.creditsBalance || 0,
        upcomingCount: upcomingSessions.length,
        pendingCount: pendingSessions.length,
        confirmedCount: confirmedSessions.length,
        totalBookedSessions: allSessions.length, // Total sessions regardless of status
      },
      upcomingSessions,
      recentSessions,
    })

  } catch (error) {
    console.error("Error fetching learner dashboard stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
