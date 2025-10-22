import { db } from "@/db"
import {
  mentors,
  mentorAvailability,
  mentorSkills,
  mentorBlockedDates,
  users,
  bookingSessions,
} from "@/db/schema"
import { eq, and, inArray } from "drizzle-orm"
import { getSession } from "@/lib/auth/getSession"
import { NextResponse } from "next/server"
import { deleteFromCloudinary, extractPublicIdFromUrl } from "@/lib/cloudinary"

export async function GET() {
  const session = await getSession()

  if (!session || session.role !== "mentor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Get mentor core data
  const [mentor] = await db
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
      languagesSpoken: mentors.languagesSpoken,
      gender: mentors.gender,
      professionalTitle: mentors.professionalTitle,
      yearsOfExperience: mentors.yearsOfExperience,
      createdAt: mentors.createdAt,
      updatedAt: mentors.updatedAt,
    })
    .from(mentors)
    .innerJoin(users, eq(users.id, mentors.userId))
    .where(eq(mentors.userId, session.id))

  if (!mentor) {
    return NextResponse.json({ error: "Mentor not found" }, { status: 404 })
  }

  const availability = await db
    .select()
    .from(mentorAvailability)
    .where(eq(mentorAvailability.mentorId, mentor.id))

  const skills = await db
    .select()
    .from(mentorSkills)
    .where(eq(mentorSkills.mentorId, mentor.id))

  const blockedDates = await db
    .select()
    .from(mentorBlockedDates)
    .where(eq(mentorBlockedDates.mentorId, mentor.id))

  return NextResponse.json({
    mentor,
    availability,
    skills,
    blockedDates,
  })
}

export async function PATCH(req: Request) {
  const session = await getSession()

  if (!session || session.role !== "mentor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const {
    profilePictureUrl,
    languagesSpoken,
    gender,
    country,
    timezone,
    professionalTitle,
    bio,
    yearsOfExperience,
    linkedInUrl,
    socialLinks,
    skills = [],
    availability = [],
    blockedDates = [],
    question1,
    question2,
    question3,
  } = await req.json()

  try {
    const [mentorRecord] = await db
      .select({ id: mentors.id })
      .from(mentors)
      .where(eq(mentors.userId, session.id))

    if (!mentorRecord) {
      return NextResponse.json({ error: "Mentor not found" }, { status: 404 })
    }

    const mentorId = mentorRecord.id

    // Get current profile picture URL to delete old one if changed
    const [currentMentor] = await db
      .select({ profilePictureUrl: mentors.profilePictureUrl })
      .from(mentors)
      .where(eq(mentors.id, mentorId))

    // Delete old profile picture from Cloudinary if it's being replaced
    if (currentMentor?.profilePictureUrl &&
        profilePictureUrl &&
        currentMentor.profilePictureUrl !== profilePictureUrl) {
      try {
        const extracted = extractPublicIdFromUrl(currentMentor.profilePictureUrl)
        if (extracted) {
          await deleteFromCloudinary(extracted.publicId, extracted.resourceType)
          console.log('Deleted old profile picture from Cloudinary:', extracted.publicId)
        }
      } catch (error) {
        console.error('Failed to delete old profile picture from Cloudinary:', error)
        // Continue with update even if deletion fails
      }
    }

    // === CORE FIELDS ===
    await db
      .update(mentors)
      .set({
        profilePictureUrl,
        languagesSpoken,
        gender,
        country,
        timezone,
        professionalTitle,
        bio,
        yearsOfExperience,
        linkedInUrl,
        socialLinks,
        updatedAt: new Date(),
      })
      .where(eq(mentors.userId, session.id))

    // === SKILLS ===
    const currentSkills = await db
      .select()
      .from(mentorSkills)
      .where(eq(mentorSkills.mentorId, mentorId))

    const currentSkillMap = new Map(
      currentSkills.map((s) => [s.skillName.toLowerCase(), s])
    )

    const incomingSkillNames = new Set(skills.map((s: any) => s.skillName.toLowerCase()))

    const toDeleteIds: number[] = []
    const toAdd: typeof skills = []
    const toUpdate: { id: number, data: any }[] = []

    for (const skill of currentSkills) {
      const name = skill.skillName.toLowerCase()
      if (!incomingSkillNames.has(name)) {
        toDeleteIds.push(skill.id)
      }
    }

    for (const incoming of skills) {
      const name = incoming.skillName.toLowerCase()
      const match = currentSkillMap.get(name)

      if (!match) {
        toAdd.push(incoming)
      } else if (
        match.ratePerHour !== incoming.ratePerHour ||
        match.isActive !== incoming.isActive
      ) {
        toUpdate.push({ id: match.id, data: incoming })
      }
    }

    // Check usage in bookingSessions
    const used = await db
      .select({ mentorSkillId: bookingSessions.mentorSkillId })
      .from(bookingSessions)
      .where(eq(bookingSessions.mentorId, mentorId))

    const usedSkillIds = new Set(used.map((b) => b.mentorSkillId))
    const safeToDeleteIds = toDeleteIds.filter((id) => !usedSkillIds.has(id))

    if (safeToDeleteIds.length > 0) {
      await db
        .delete(mentorSkills)
        .where(inArray(mentorSkills.id, safeToDeleteIds))
    }

    if (toAdd.length > 0) {
      await db.insert(mentorSkills).values(
        toAdd.map((s: any) => ({
          mentorId,
          skillName: s.skillName,
          ratePerHour: s.ratePerHour,
          isActive: s.isActive ?? true,
        }))
      )
    }

    for (const { id, data } of toUpdate) {
      await db.update(mentorSkills)
        .set({
          ratePerHour: data.ratePerHour,
          isActive: data.isActive ?? true,
        })
        .where(eq(mentorSkills.id, id))
    }

   await db.delete(mentorAvailability).where(eq(mentorAvailability.mentorId, mentorId))
    if (availability.length > 0) {
      await db.insert(mentorAvailability).values(
        availability.map((slot: any) => ({
          mentorId,
          day: slot.day,
          startTime: slot.startTime,
          endTime: slot.endTime,
        })),
      )
    }
    // === BLOCKED DATES ===
    await db.delete(mentorBlockedDates).where(eq(mentorBlockedDates.mentorId, mentorId))

    if (blockedDates.length > 0) {
      await db.insert(mentorBlockedDates).values(
        blockedDates.map((entry: string) => ({
          mentorId,
          blockedDate: new Date(entry),
          reason: "",
        }))
      )
    }

    return NextResponse.json({ message: "Mentor profile updated successfully" })
  } catch (error) {
    console.error("Error updating mentor profile:", error)
    return NextResponse.json({ error: "Failed to update mentor profile" }, { status: 500 })
  }
}

