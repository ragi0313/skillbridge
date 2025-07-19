import { NextResponse } from "next/server"
import { db } from "@/db"
import { pendingMentors, pendingMentorSkills } from "@/db/schema"
import { hash } from "bcryptjs"
import { nanoid } from "nanoid"

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const {
      firstName,
      lastName,
      email,
      password,
      professionalTitle,
      bio,
      yearsOfExperience,
      country,
      profileUrl,
      profilePictureUrl,
      linkedInUrl,
      socialLinks,
      timezone,
      availability,
      skills,
      question1,
      question2,
      question3,
    } = body

    const hashedPassword = await hash(password, 10)
    const verificationToken = nanoid(32)

    const insertedMentors = await db
      .insert(pendingMentors)
      .values({
        firstName,
        lastName,
        email,
        hashedPassword,
        professionalTitle,
        bio,
        yearsOfExperience,
        country,
        profileUrl,
        profilePictureUrl,
        linkedInUrl,
        socialLinks,
        timezone,
        availability: JSON.stringify(availability),
        question1,
        question2,
        question3,
        verificationToken,
        createdAt: new Date(),
      })
      .returning({ id: pendingMentors.id })

    const pendingMentorId = insertedMentors[0]?.id

    if (!pendingMentorId) {
      return NextResponse.json(
        { success: false, error: "Failed to get mentor ID." },
        { status: 500 }
      )
    }

    if (Array.isArray(skills) && skills.length > 0) {
      await db.insert(pendingMentorSkills).values(
        skills.map(skill => ({
          mentorId: pendingMentorId,
          skillName: skill.name,
          ratePerHour: skill.rate,
        }))
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to register pending mentor:", error)
    return NextResponse.json(
      { success: false, error: "Failed to register pending mentor" },
      { status: 500 }
    )
  }
}
