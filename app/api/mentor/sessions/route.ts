import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth/getSession"
import { db } from "@/db"
import { bookingSessions, learners, mentors, mentorSkills, users } from "@/db/schema"
import { eq, desc } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.id || session.role !== "mentor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get mentor ID from user ID
    const [mentor] = await db
      .select({ id: mentors.id })
      .from(mentors)
      .where(eq(mentors.userId, session.id))

    if (!mentor) {
      return NextResponse.json({ error: "Mentor profile not found" }, { status: 404 })
    }

    // Fetch all sessions for this mentor with learner and skill details
    const sessions = await db
      .select({
        id: bookingSessions.id,
        scheduledDate: bookingSessions.scheduledDate,
        durationMinutes: bookingSessions.durationMinutes,
        totalCostCredits: bookingSessions.totalCostCredits,
        status: bookingSessions.status,
        sessionNotes: bookingSessions.sessionNotes,
        cancelledAt: bookingSessions.cancelledAt,
        cancelledBy: bookingSessions.cancelledBy,
        cancellationReason: bookingSessions.cancellationReason,
        refundAmount: bookingSessions.refundAmount,
        // Learner details
        learnerFirstName: users.firstName,
        learnerLastName: users.lastName,
        learnerProfilePicture: learners.profilePictureUrl,
        // Skill details
        skillName: mentorSkills.skillName,
        ratePerHour: mentorSkills.ratePerHour,
      })
      .from(bookingSessions)
      .innerJoin(learners, eq(bookingSessions.learnerId, learners.id))
      .innerJoin(users, eq(learners.userId, users.id))
      .innerJoin(mentorSkills, eq(bookingSessions.mentorSkillId, mentorSkills.id))
      .where(eq(bookingSessions.mentorId, mentor.id))
      .orderBy(desc(bookingSessions.createdAt))

    // Transform the data to match frontend expectations
    const transformedSessions = sessions.map(session => {
      // Calculate mentor earnings (80% of total cost)
      const platformFeePercentage = 20
      const earnedCredits = Math.floor(session.totalCostCredits * (100 - platformFeePercentage) / 100)

      return {
        id: session.id,
        learnerFirstName: session.learnerFirstName,
        learnerLastName: session.learnerLastName,
        learnerProfilePicture: session.learnerProfilePicture,
        skillName: session.skillName,
        ratePerHour: session.ratePerHour,
        scheduledDate: session.scheduledDate.toISOString(), // Convert to ISO string
        durationMinutes: session.durationMinutes,
        totalCostCredits: session.totalCostCredits,
        earnedCredits: earnedCredits,
        status: session.status,
        sessionNotes: session.sessionNotes || "",
        // Cancellation details
        cancelledAt: session.cancelledAt?.toISOString() || null,
        cancelledBy: session.cancelledBy,
        cancellationReason: session.cancellationReason,
        refundAmount: session.refundAmount,
      }
    })

    return NextResponse.json({
      success: true,
      sessions: transformedSessions,
    })

  } catch (error: any) {
    console.error("Error fetching mentor sessions:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch sessions" },
      { status: 500 }
    )
  }
}
