import { db } from "@/db";
import { users, mentors, mentorSkills, pendingMentors, pendingMentorSkills } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { sendMentorApprovedEmail } from "@/lib/email/approvedMail";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const id = parseInt(params.id)

  const pending = await db.query.pendingMentors.findFirst({
    where: eq(pendingMentors.id, id)
  })

  if (!pending) {
    return NextResponse.json({ error: "Pending mentor not found" }, { status: 404 })
  }

  const [user] = await db.insert(users).values({
    firstName: pending.firstName,
    lastName: pending.lastName,
    email: pending.email,
    hashedPassword: pending.hashedPassword,
    role: "mentor",
  }).returning()

  const [mentor] = await db.insert(mentors).values({
    userId: user.id,
    profileUrl: pending.profileUrl,
    profilePictureUrl: pending.profilePictureUrl,
    country: pending.country,
    timezone: pending.timezone,
    professionalTitle: pending.professionalTitle,
    bio: pending.bio,
    yearsOfExperience: pending.yearsOfExperience,
    linkedInUrl: pending.linkedInUrl,
    socialLinks: pending.socialLinks,
    availability: pending.availability,
    creditsBalance: 0,
  }).returning()

  const pendingSkills = await db.query.pendingMentorSkills.findMany({
    where: eq(pendingMentorSkills.mentorId, id)
  })

  if (pendingSkills.length > 0) {
    await db.insert(mentorSkills).values(
      pendingSkills.map(skill => ({
        mentorId: mentor.id,
        skillName: skill.skillName,
        ratePerHour: skill.ratePerHour,
      }))
    )
  }

  await db.delete(pendingMentorSkills).where(eq(pendingMentorSkills.mentorId, id))
  await db.delete(pendingMentors).where(eq(pendingMentors.id, id))
  await sendMentorApprovedEmail(user.email, `${user.firstName} ${user.lastName}`)

  return NextResponse.json({ success: true, message: "Mentor approved and migrated." })
}
