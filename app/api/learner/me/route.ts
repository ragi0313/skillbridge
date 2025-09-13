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

  return NextResponse.json(result)
}

export async function PATCH(req: Request) {
  const session = await getSession()

  if (!session || session.role !== "learner") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { country, experienceLevel, learningGoals, profilePictureUrl, timezone } = body

  if (!country || !experienceLevel || !learningGoals || !timezone) {
    return NextResponse.json({ error: "Missing or invalid required fields" }, { status: 400 })
  }

  try {
    await db
      .update(learners)
      .set({ country, experienceLevel, learningGoals, profilePictureUrl, timezone })
      .where(eq(learners.userId, session.id))

    return NextResponse.json({ message: "Learner profile updated successfully" })
  } catch (error) {
    console.error("Error updating learner profile:", error)
    return NextResponse.json({ error: "Failed to update learner profile" }, { status: 500 })
  }
}
