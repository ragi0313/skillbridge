import { NextResponse } from "next/server"
import { db } from "@/db"
import { users, learners, pendingLearners } from "@/db/schema"
import { eq, and } from "drizzle-orm"

export async function POST(
  _req: Request,
  contextPromise: Promise<{ params: { id: string; token: string } }>
) {
  const { params } = await contextPromise
  const id = parseInt(params.id)
  const token = params.token

  try {
    const [pending] = await db
      .select()
      .from(pendingLearners)
      .where(and(eq(pendingLearners.id, id), eq(pendingLearners.verificationToken, token)))

    if (!pending) {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 400 })
    }

    const now = new Date()
    const expiresAt = new Date(pending.createdAt)
    expiresAt.setHours(expiresAt.getHours() + 24)

    if (now > expiresAt) {
      await db.delete(pendingLearners).where(eq(pendingLearners.id, pending.id))
      return NextResponse.json({ success: false, error: "Token expired" }, { status: 400 })
    }

    const [newUser] = await db
      .insert(users)
      .values({
        firstName: pending.firstName,
        lastName: pending.lastName,
        email: pending.email,
        hashedPassword: pending.hashedPassword,
        role: pending.role,
      })
      .returning({ id: users.id })

    await db.insert(learners).values({
      userId: newUser.id,
      firstName: pending.firstName,
      lastName: pending.lastName,
      experienceLevel: pending.experienceLevel,
      learningGoals: pending.learningGoals,
      country: pending.country,
    })

    await db.delete(pendingLearners).where(eq(pendingLearners.id, pending.id))

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Verification error:", err)
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 })
  }
}
