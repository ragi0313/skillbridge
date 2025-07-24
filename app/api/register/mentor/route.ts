import { db } from "@/db"
import { pendingMentors, pendingMentorSkills } from "@/db/schema"
import { hash } from "bcryptjs"
import { randomUUID } from "crypto"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const {
      firstName,
      lastName,
      email,
      password,
      profilePicture,
      gender,
      languages,
      country,
      timezone,
      professionalTitle,
      bio,
      yearsOfExperience,
      linkedinUrl,
      linkAttachments,
      skills,
      availability,
      whyFreelancer,
      whyMentor,
      greatestAchievement,
    } = body

    // Hash the password
    const hashedPassword = await hash(password, 10)

    // Generate a token for future email verification (optional)
    const verificationToken = randomUUID()

    // Insert into pendingMentors
    const [mentor] = await db
      .insert(pendingMentors)
      .values({
        firstName,
        lastName,
        email,
        hashedPassword,
        profilePictureUrl: profilePicture!,
        gender,
        languagesSpoken: languages,
        country,
        timezone,
        professionalTitle,
        bio,
        yearsOfExperience: parseInt(yearsOfExperience || "0", 10),
        linkedInUrl: linkedinUrl,
        socialLinks: Array.isArray(linkAttachments) ? linkAttachments : null,
        availability: JSON.stringify(availability),
        question1: whyFreelancer,
        question2: whyMentor,
        question3: greatestAchievement,
        verificationToken,
      })
      .returning()

    // Insert skills
    if (skills && skills.length > 0) {
      await db.insert(pendingMentorSkills).values(
        skills.map((s: any) => ({
          mentorId: mentor.id,
          skillName: s.name,
          ratePerHour: s.rate,
        }))
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Mentor signup error:", err)
    return NextResponse.json({ error: "Failed to register mentor" }, { status: 500 })
  }
}
