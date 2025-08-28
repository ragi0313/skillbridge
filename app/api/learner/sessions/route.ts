import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth/getSession"
import { db } from "@/db"
import { bookingSessions, mentors, users, mentorSkills } from "@/db/schema"
import { eq, desc } from "drizzle-orm"

export async function GET() {
  try {
    const session = await getSession()
    
    if (!session?.id || session.role !== 'learner') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get learner record
    const learner = await db.query.learners.findFirst({
      where: (learners, { eq }) => eq(learners.userId, session.id)
    })

    if (!learner) {
      return NextResponse.json({ error: "Learner not found" }, { status: 404 })
    }

    // Get all sessions for this learner
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
        learnerLeftAt: bookingSessions.learnerLeftAt,
        mentorLeftAt: bookingSessions.mentorLeftAt,
        refundAmount: bookingSessions.refundAmount,
        rejectionReason: bookingSessions.rejectionReason,
        cancellationReason: bookingSessions.cancellationReason,
        expiresAt: bookingSessions.expiresAt,
        createdAt: bookingSessions.createdAt,
        mentorFirstName: users.firstName,
        mentorLastName: users.lastName,
        mentorProfilePictureUrl: mentors.profilePictureUrl,
        mentorProfessionalTitle: mentors.professionalTitle,
        skillName: mentorSkills.skillName,
        skillRatePerHour: mentorSkills.ratePerHour,
      })
      .from(bookingSessions)
      .leftJoin(mentors, eq(bookingSessions.mentorId, mentors.id))
      .leftJoin(users, eq(mentors.userId, users.id))
      .leftJoin(mentorSkills, eq(bookingSessions.mentorSkillId, mentorSkills.id))
      .where(eq(bookingSessions.learnerId, learner.id))
      .orderBy(desc(bookingSessions.createdAt))

    return NextResponse.json({ sessions })

  } catch (error) {
    console.error("Error fetching learner sessions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}