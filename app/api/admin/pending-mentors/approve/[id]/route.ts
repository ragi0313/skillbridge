import { db } from "@/db"
import {
  users,
  mentors,
  mentorSkills,
  pendingMentors,
  pendingMentorSkills,
  pendingMentorAvailability,
  mentorAvailability,
} from "@/db/schema"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

// Helper to convert "09:00 AM" to "09:00" (24-hour format)
function to24Hour(time: string): string {
  if (!time) return ""
  const [timePart, period] = time.split(" ")
  let [hours, minutes] = timePart.split(":").map(Number)
  if (period === "PM" && hours !== 12) hours += 12
  if (period === "AM" && hours === 12) hours = 0
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
}

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: idString } = await params
  const id = Number(idString)

  // Get pending mentor
  const [pending] = await db
    .select()
    .from(pendingMentors)
    .where(eq(pendingMentors.id, id))

  if (!pending) {
    return NextResponse.json({ error: "Pending mentor not found" }, { status: 404 })
  }

  // Create user
  const [user] = await db.insert(users).values({
    firstName: pending.firstName,
    lastName: pending.lastName,
    email: pending.email,
    hashedPassword: pending.hashedPassword,
    role: "mentor",
  }).returning()

  // Create mentor
  const [mentor] = await db.insert(mentors).values({
    userId: user.id,
    profileUrl: pending.profileUrl,
    profilePictureUrl: pending.profilePictureUrl,
    country: pending.country,
    timezone: pending.timezone,
    gender: pending.gender,
    languagesSpoken: pending.languagesSpoken,
    professionalTitle: pending.professionalTitle ?? "",
    bio: pending.bio,
    yearsOfExperience: pending.yearsOfExperience,
    linkedInUrl: pending.linkedInUrl,
    socialLinks: pending.socialLinks,
    creditsBalance: 0,
  }).returning()

  // Transfer skills
  const pendingSkills = await db
    .select()
    .from(pendingMentorSkills)
    .where(eq(pendingMentorSkills.mentorId, id))

  if (pendingSkills.length > 0) {
    await db.insert(mentorSkills).values(
      pendingSkills.map((s) => ({
        mentorId: mentor.id,
        skillName: s.skillName,
        ratePerHour: s.ratePerHour,
      }))
    )
  }

  // Transfer availability slots (convert to 24-hour format)
  const pendingSlots = await db
    .select()
    .from(pendingMentorAvailability)
    .where(eq(pendingMentorAvailability.mentorId, id))

  if (pendingSlots.length > 0) {
    await db.insert(mentorAvailability).values(
      pendingSlots.map((slot) => ({
        mentorId: mentor.id,
        day: slot.day,
        startTime: to24Hour(slot.startTime),
        endTime: to24Hour(slot.endTime),
      }))
    )
  }

  // Cleanup
  await db.delete(pendingMentorSkills).where(eq(pendingMentorSkills.mentorId, id))
  await db.delete(pendingMentorAvailability).where(eq(pendingMentorAvailability.mentorId, id))
  await db.delete(pendingMentors).where(eq(pendingMentors.id, id))

  return NextResponse.json({ success: true })
}