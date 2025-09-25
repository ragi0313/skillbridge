import { db } from "@/db"
import {
  pendingMentors,
  pendingMentorSkills,
  pendingMentorAvailability,
  users,
} from "@/db/schema"
import { hash } from "bcryptjs"
import crypto from "crypto"
import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"

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
      whyFreelancer,
      whyMentor,
      greatestAchievement,
      availability, // ✅ received from frontend
    } = body

    // ✅ Comprehensive validation
    if (
      !firstName ||
      !lastName ||
      !email ||
      !password ||
      !profilePicture ||
      !gender ||
      !languages?.length ||
      !country ||
      !timezone ||
      !professionalTitle ||
      !yearsOfExperience ||
      !linkedinUrl ||
      !skills?.length ||
      !whyFreelancer ||
      !whyMentor ||
      !greatestAchievement
    ) {
      return NextResponse.json(
        { error: "All required fields must be completed." },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      )
    }

    // Validate password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/
    if (!passwordRegex.test(password)) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters with uppercase, lowercase, number, and special character." },
        { status: 400 }
      )
    }

    // Validate name format
    const nameRegex = /^[a-zA-ZÀ-ÿ\u0100-\u017F\u0180-\u024F\u1E00-\u1EFF\s'-]+$/
    if (!nameRegex.test(firstName.trim()) || firstName.trim().length < 2) {
      return NextResponse.json(
        { error: "First name must contain only letters and be at least 2 characters." },
        { status: 400 }
      )
    }

    if (!nameRegex.test(lastName.trim()) || lastName.trim().length < 2) {
      return NextResponse.json(
        { error: "Last name must contain only letters and be at least 2 characters." },
        { status: 400 }
      )
    }

    // Validate LinkedIn URL format
    const linkedinRegex = /^https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9\-_]+\/?$/
    if (!linkedinRegex.test(linkedinUrl.trim())) {
      return NextResponse.json(
        { error: "Please enter a valid LinkedIn profile URL." },
        { status: 400 }
      )
    }

    // Validate years of experience
    const yearsExp = parseInt(yearsOfExperience, 10)
    if (isNaN(yearsExp) || yearsExp < 0 || yearsExp > 50) {
      return NextResponse.json(
        { error: "Years of experience must be a valid number between 0 and 50." },
        { status: 400 }
      )
    }

    // Validate skills format
    if (!Array.isArray(skills) || skills.length === 0) {
      return NextResponse.json(
        { error: "At least one skill is required." },
        { status: 400 }
      )
    }

    for (const skill of skills) {
      if (!skill.name || typeof skill.name !== 'string' || skill.name.trim().length < 2) {
        return NextResponse.json(
          { error: "All skill names must be at least 2 characters long." },
          { status: 400 }
        )
      }

      const rate = parseInt(skill.rate, 10)
      if (isNaN(rate) || rate < 5 || rate > 500) {
        return NextResponse.json(
          { error: "All skill rates must be between 5 and 500 credits per hour." },
          { status: 400 }
        )
      }
    }

    // Check if email already exists
    const existingUser = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.email, email.trim().toLowerCase()))
      .limit(1)

    const existingPendingMentor = await db
      .select({ email: pendingMentors.email })
      .from(pendingMentors)
      .where(eq(pendingMentors.email, email.trim().toLowerCase()))
      .limit(1)

    if (existingUser.length > 0 || existingPendingMentor.length > 0) {
      return NextResponse.json(
        { error: "Email address is already registered." },
        { status: 409 }
      )
    }

    const hashedPassword = await hash(password, 10)
    const verificationToken = crypto.randomUUID()

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
        question1: whyFreelancer,
        question2: whyMentor,
        question3: greatestAchievement,
        verificationToken,
      })
      .returning()

    // Insert mentor skills
    if (skills && skills.length > 0) {
      await db.insert(pendingMentorSkills).values(
        skills.map((s: any) => ({
          mentorId: mentor.id,
          skillName: s.name,
          ratePerHour: s.rate,
        }))
      )
    }

    // ✅ Insert availability
    if (availability && typeof availability === "object") {
      const availabilityInserts = []

      for (const [day, slots] of Object.entries(availability)) {
        for (const slot of slots as { start: string; end: string }[]) {
          availabilityInserts.push({
            mentorId: mentor.id,
            day,
            startTime: slot.start,
            endTime: slot.end,
          })
        }
      }

      if (availabilityInserts.length > 0) {
        await db.insert(pendingMentorAvailability).values(availabilityInserts)
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Mentor signup error:", err)

    // Handle specific database constraint errors
    if (err instanceof Error && err.message.includes('duplicate key value')) {
      return NextResponse.json(
        { error: "Email address is already registered." },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    )
  }
}