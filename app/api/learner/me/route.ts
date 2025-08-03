import { db } from "@/db"
import { learners, users } from "@/db/schema"
import { eq } from "drizzle-orm"
import { getSession } from "@/lib/auth/getSession"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await getSession()

  if (!session || session.role !== "learner") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [result] = await db
    .select({
      id: learners.id,
      userId: learners.userId,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      role: users.role,
      profilePictureUrl: learners.profilePictureUrl,
      profileUrl: learners.profileUrl,
      country: learners.country,
      experienceLevel: learners.experienceLevel,
      learningGoals: learners.learningGoals,
      creditsBalance: learners.creditsBalance,
      timezone: learners.timezone,
      createdAt: learners.createdAt,
      updatedAt: learners.updatedAt,
    })
    .from(learners)
    .innerJoin(users, eq(users.id, learners.userId))
    .where(eq(learners.userId, session.id))

  if (!result) {
    return NextResponse.json({ error: "Learner not found" }, { status: 404 })
  }

  return NextResponse.json({ learner: result })
}
