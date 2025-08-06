import { NextResponse } from "next/server"
import { db } from "@/db"
import { bookingSessions, mentors, users, mentorSkills, learners } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { getSession } from "@/lib/auth/getSession"

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const userId = session.id; 

    const learnerRecord = await db.query.learners.findFirst({
        where: eq(learners.userId, userId),
    });

    if (!learnerRecord) {
        return new NextResponse("Learner profile not found", { status: 404 });
    }

   const learnerId = learnerRecord.id;


    const sessions = await db
      .select({
        id: bookingSessions.id,
        mentorId: bookingSessions.mentorId,
        learnerId: bookingSessions.learnerId,
        scheduledDate: bookingSessions.scheduledDate,
        durationMinutes: bookingSessions.durationMinutes,
        totalCostCredits: bookingSessions.totalCostCredits,
        status: bookingSessions.status,
        bookingDate: bookingSessions.createdAt,
        mentorFirstName: users.firstName,
        mentorLastName: users.lastName,
        mentorProfilePicture: mentors.profilePictureUrl,
        mentorProfessionalTitle: mentors.professionalTitle,
        skillName: mentorSkills.skillName,
      })
      .from(bookingSessions)
      .leftJoin(mentors, eq(bookingSessions.mentorId, mentors.id))
      .leftJoin(users, eq(mentors.userId, users.id))
      .leftJoin(mentorSkills, eq(bookingSessions.mentorSkillId, mentorSkills.id))
      .where(eq(bookingSessions.learnerId, learnerId))
      .orderBy(bookingSessions.scheduledDate)

      
    return NextResponse.json({ sessions }, { status: 200 })
  } catch (error) {
    console.error("Error fetching learner sessions:", error)
    return NextResponse.json(
      { error: "Failed to fetch learner sessions", details: (error as Error).message },
      { status: 500 },
    )
  }
}
