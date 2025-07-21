import { NextResponse } from "next/server"
import { db } from "@/db"
import { users, pendingLearners, pendingMentors } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function POST(req: Request) {
  const { email } = await req.json()

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 })
  }

  try {
    const [existingUsers, existingPendingLearners, existingPendingMentors] = await Promise.all([
      db.select().from(users).where(eq(users.email, email)),
      db.select().from(pendingLearners).where(eq(pendingLearners.email, email)),
      db.select().from(pendingMentors).where(eq(pendingMentors.email, email)),
    ])

   const exists = existingUsers.length > 0 || existingPendingLearners.length > 0 || existingPendingMentors.length > 0

    return NextResponse.json({ exists })
  } catch (error) {
    console.error("DB error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
