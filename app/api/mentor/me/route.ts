import { db } from "@/db"
import { mentors, users } from "@/db/schema"
import { eq } from "drizzle-orm"
import { getSession } from "@/lib/auth/getSession"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await getSession()

  if (!session || session.role !== "mentor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [result] = await db
    .select({
      id: mentors.id,
      userId: mentors.userId,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      role: users.role,
      profilePictureUrl: mentors.profilePictureUrl,
      profileUrl: mentors.profileUrl,
      country: mentors.country,
      timezone: mentors.timezone,
      bio: mentors.bio,
      creditsBalance: mentors.creditsBalance,
      linkedInUrl: mentors.linkedInUrl,
      socialLinks: mentors.socialLinks,
      availability: mentors.availability,
      createdAt: mentors.createdAt,
      updatedAt: mentors.updatedAt,
    })
    .from(mentors)
    .innerJoin(users, eq(users.id, mentors.userId))
    .where(eq(mentors.userId, session.id))

  if (!result) {
    return NextResponse.json({ error: "Mentor not found" }, { status: 404 })
  }

  return NextResponse.json({ mentor: result })
}
