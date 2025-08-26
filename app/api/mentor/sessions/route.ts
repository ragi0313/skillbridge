import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth/getSession"
import { db } from "@/db"
import { bookingSessions, learners, users, mentorSkills } from "@/db/schema"
import { eq, desc } from "drizzle-orm"

export async function GET() {
  try {
    const session = await getSession()
    
    if (!session?.id || session.role !== 'mentor') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get mentor record
    const mentor = await db.query.mentors.findFirst({
      where: (mentors, { eq }) => eq(mentors.userId, session.id)
    })

    if (!mentor) {
      return NextResponse.json({ error: "Mentor not found" }, { status: 404 })
    }

    // Get all sessions for this mentor
    const sessions = await db
      .select({
        id: bookingSessions.id,
        status: bookingSessions.status,
        scheduledDate: bookingSessions.scheduledDate,
        startTime: bookingSessions.startTime,
        endTime: bookingSessions.endTime,
        durationMinutes: bookingSessions.durationMinutes,
        totalCostCredits: bookingSessions.totalCostCredits,
        sessionNotes: bookingSessions.sessionNotes,
        agoraCallStartedAt: bookingSessions.agoraCallStartedAt,
        agoraCallEndedAt: bookingSessions.agoraCallEndedAt,
        learnerJoinedAt: bookingSessions.learnerJoinedAt,
        mentorJoinedAt: bookingSessions.mentorJoinedAt,
        refundAmount: bookingSessions.refundAmount,
        rejectionReason: bookingSessions.rejectionReason,
        cancellationReason: bookingSessions.cancellationReason,
        mentorResponseMessage: bookingSessions.mentorResponseMessage,
        expiresAt: bookingSessions.expiresAt,
        createdAt: bookingSessions.createdAt,
        learnerFirstName: users.firstName,
        learnerLastName: users.lastName,
        learnerProfilePictureUrl: learners.profilePictureUrl,
        learnerExperienceLevel: learners.experienceLevel,
        skillName: mentorSkills.skillName,
        skillRatePerHour: mentorSkills.ratePerHour,
      })
      .from(bookingSessions)
      .leftJoin(learners, eq(bookingSessions.learnerId, learners.id))
      .leftJoin(users, eq(learners.userId, users.id))
      .leftJoin(mentorSkills, eq(bookingSessions.mentorSkillId, mentorSkills.id))
      .where(eq(bookingSessions.mentorId, mentor.id))
      .orderBy(desc(bookingSessions.createdAt))

    return NextResponse.json({ sessions })

  } catch (error) {
    console.error("Error fetching mentor sessions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}