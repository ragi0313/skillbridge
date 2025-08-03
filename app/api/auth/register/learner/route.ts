// app/api/register/route.ts
import { NextResponse } from "next/server"
import { db } from "@/db"
import { pendingLearners } from "@/db/schema"
import { hash } from "bcryptjs"
import { nanoid } from "nanoid"
import { sendVerificationEmail } from "@/lib/email/activationMail"


export async function POST(req: Request) {
  const body = await req.json()

  const {
    firstName,
    lastName,
    email,
    country,
    timezone,
    password,
    experienceLevel,
    learningGoals,
  } = body

  // ✅ Basic validation
  if (
    !firstName ||
    !lastName ||
    !email ||
    !country ||
    !timezone ||
    !password ||
    !experienceLevel ||
    !learningGoals
  ) {
    return NextResponse.json(
      { error: "All fields are required." },
      { status: 400 }
    )
  }


  const hashedPassword = await hash(password, 10)
  const verificationToken = nanoid(32)

  try {
    const inserted = await db
      .insert(pendingLearners)
      .values({
        firstName,
        lastName,
        email,
        country,
        timezone,
        hashedPassword,
        experienceLevel,
        learningGoals,
        verificationToken,
        createdAt: new Date(),
      })
      .returning({ id: pendingLearners.id })

    const newUserId = inserted[0].id

    await sendVerificationEmail({
      to: email,
      token: verificationToken,
      id: newUserId,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Registration failed" }, { status: 500 })
  }
}
