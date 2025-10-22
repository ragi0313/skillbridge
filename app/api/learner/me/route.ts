import { db } from "@/db"
import { learners, users } from "@/db/schema"
import { eq } from "drizzle-orm"
import { getSession } from "@/lib/auth/getSession"
import { NextResponse } from "next/server"
import { deleteFromCloudinary, extractPublicIdFromUrl } from "@/lib/cloudinary"

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
    // Get current profile picture URL to delete old one if changed
    const [currentLearner] = await db
      .select({ profilePictureUrl: learners.profilePictureUrl })
      .from(learners)
      .where(eq(learners.userId, session.id))

    // Delete old profile picture from Cloudinary if it's being replaced
    if (currentLearner?.profilePictureUrl &&
        profilePictureUrl &&
        currentLearner.profilePictureUrl !== profilePictureUrl) {
      try {
        const extracted = extractPublicIdFromUrl(currentLearner.profilePictureUrl)
        if (extracted) {
          await deleteFromCloudinary(extracted.publicId, extracted.resourceType)
          console.log('Deleted old profile picture from Cloudinary:', extracted.publicId)
        }
      } catch (error) {
        console.error('Failed to delete old profile picture from Cloudinary:', error)
        // Continue with update even if deletion fails
      }
    }

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
