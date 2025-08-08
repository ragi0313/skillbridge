import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth/getSession"
import { db } from "@/db"
import { bookingSessions, learners, mentors, mentorSkills, users } from "@/db/schema"
import { eq, desc } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.id || session.role !== "learner") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get learner ID from user ID
    const [learner] = await db
      .select({ id: learners.id })
      .from(learners)
      .where(eq(learners.userId, session.id))

    if (!learner) {
      return NextResponse.json({ error: "Learner profile not found" }, { status: 404 })
    }

    // Fetch all sessions for this learner with mentor and skill details
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
        // Mentor details
        mentorFirstName: users.firstName,
        mentorLastName: users.lastName,
        mentorProfilePicture: mentors.profilePictureUrl,
        mentorProfessionalTitle: mentors.professionalTitle,
        // Skill details
        skillName: mentorSkills.skillName,
        ratePerHour: mentorSkills.ratePerHour,
      })
      .from(bookingSessions)
      .innerJoin(mentors, eq(bookingSessions.mentorId, mentors.id))
      .innerJoin(users, eq(mentors.userId, users.id))
      .innerJoin(mentorSkills, eq(bookingSessions.mentorSkillId, mentorSkills.id))
      .where(eq(bookingSessions.learnerId, learner.id))
      .orderBy(desc(bookingSessions.createdAt))

    // Transform the data to match frontend expectations
    const transformedSessions = sessions.map(session => ({
      id: session.id,
      mentorFirstName: session.mentorFirstName,
      mentorLastName: session.mentorLastName,
      mentorProfilePicture: session.mentorProfilePicture,
      mentorProfessionalTitle: session.mentorProfessionalTitle,
      skillName: session.skillName,
      ratePerHour: session.ratePerHour,
      scheduledDate: session.scheduledDate.toISOString(), // Convert to ISO string
      durationMinutes: session.durationMinutes,
      totalCostCredits: session.totalCostCredits,
      status: session.status,
      sessionNotes: session.sessionNotes || "",
      // Cancellation details
      cancelledAt: session.cancelledAt?.toISOString() || null,
      cancelledBy: session.cancelledBy,
      cancellationReason: session.cancellationReason,
      refundAmount: session.refundAmount,
    }))

    return NextResponse.json({
      success: true,
      sessions: transformedSessions,
    })

  } catch (error: any) {
    console.error("Error fetching learner sessions:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch sessions" },
      { status: 500 }
    )
  }
}
