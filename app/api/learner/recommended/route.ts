import { db } from "@/db"
import {
  users,
  learners,
  mentors,
  mentorSkills,
  mentorReviews,
} from "@/db/schema"
import { and, eq, ilike, or, sql } from "drizzle-orm"
import { getSession } from "@/lib/auth/getSession"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await getSession()

  if (!session || session.role !== "learner") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // 1. Get learner's goals
  const [learner] = await db
    .select({
      id: learners.id,
      goals: learners.learningGoals,
    })
    .from(learners)
    .where(eq(learners.userId, session.id))

  if (!learner) {
    return NextResponse.json({ error: "Learner not found" }, { status: 404 })
  }

  const goals = learner.goals.toLowerCase()

  // 2. Fetch mentors with matching bio or skills
  const mentorsData = await db
    .select({
      mentorId: mentors.id,
      userId: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      title: mentors.professionalTitle,
      profilePicture: mentors.profilePictureUrl,
      bio: mentors.bio,
      location: mentors.country,
      responseTime: sql<string>`'Usually responds in 2-3 hours'`, // Static for now
      skills: sql<string[]>`array_agg(${mentorSkills.skillName})`,
      minRate: sql<number>`min(${mentorSkills.ratePerHour})`,
      reviewCount: sql<number>`count(${mentorReviews.id})`,
    })
    .from(mentors)
    .innerJoin(users, eq(users.id, mentors.userId))
    .innerJoin(mentorSkills, eq(mentorSkills.mentorId, mentors.id))
    .leftJoin(mentorReviews, eq(mentorReviews.mentorId, mentors.id))
    .where(
      or(
        ilike(mentorSkills.skillName, `%${goals}%`),
        ilike(mentors.bio, `%${goals}%`)
      )
    )
    .groupBy(mentors.id, users.id)

  return NextResponse.json({ mentors: mentorsData })
}
