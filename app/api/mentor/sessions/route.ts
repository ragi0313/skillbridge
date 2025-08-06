import { db } from "@/db"
import { bookingSessions, learners, mentors, mentorSkills, users } from "@/db/schema"
import { eq, desc } from "drizzle-orm"
import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth/getSession"

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== "mentor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const mentorUser = session


    const mentor = await db.query.mentors.findFirst({
      where: eq(mentors.userId, mentorUser.id),
    })

    if (!mentor) {
      return NextResponse.json({ error: "Mentor profile not found" }, { status: 404 })
    }

    const mentorId = mentor.id

    const sessions = await db
      .select({
        id: bookingSessions.id,
        scheduledDate: bookingSessions.scheduledDate,
        durationMinutes: bookingSessions.durationMinutes,
        totalCostCredits: bookingSessions.totalCostCredits,
        escrowCredits: bookingSessions.escrowCredits,
        sessionNotes: bookingSessions.sessionNotes,
        status: bookingSessions.status,
        learnerFirstName: users.firstName, 
        learnerLastName: users.lastName,
        learnerProfilePicture: learners.profilePictureUrl,
        skillName: mentorSkills.skillName,
      })
      .from(bookingSessions)
      .innerJoin(learners, eq(bookingSessions.learnerId, learners.id))
      .innerJoin(users, eq(learners.userId, users.id))
      .innerJoin(mentorSkills, eq(bookingSessions.mentorSkillId, mentorSkills.id))
      .where(eq(bookingSessions.mentorId, mentorId))
      .orderBy(desc(bookingSessions.scheduledDate)) // Order by date, newest first

    // Calculate earned credits (totalCostCredits - platformFeeCredits, assuming 20% fee)
    const formattedSessions = sessions.map((s) => ({
      ...s,
      earnedCredits: Math.floor(s.totalCostCredits * 0.8),
      learnerFirstName: s.learnerFirstName, 
      learnerLastName: s.learnerLastName, 
      learnerProfilePicture: s.learnerProfilePicture || "/default-avatar.png",
    }))

    return NextResponse.json({ sessions: formattedSessions }, { status: 200 })
  } catch (error) {
    console.error("Error fetching mentor sessions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
