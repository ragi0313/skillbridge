// app/api/register/route.ts
import { NextRequest, NextResponse } from "next/server"
import { withRateLimit } from "@/lib/middleware/rate-limit"
import { db } from "@/db"
import { pendingLearners, users } from "@/db/schema"
import { hash } from "bcryptjs"
import { nanoid } from "nanoid"
import { sendVerificationEmail } from "@/lib/email/activationMail"
import { eq, or } from "drizzle-orm"
import { isValidPhilippineTimezone } from "@/lib/timeZones"
import { logUserAction, AUDIT_ACTIONS, ENTITY_TYPES } from "@/lib/admin/audit-log"


async function handleRegisterLearner(req: NextRequest) {
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

  // ✅ Enhanced validation
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

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email.trim())) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 }
    )
  }

  // Validate Philippines-only constraints
  if (country !== "PH") {
    return NextResponse.json(
      { error: "Only Philippines is currently supported." },
      { status: 400 }
    )
  }

  if (!isValidPhilippineTimezone(timezone)) {
    return NextResponse.json(
      { error: "Only Philippine Standard Time is supported." },
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

  // Check if email already exists in users or pending_learners
  const existingUser = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.email, email.trim().toLowerCase()))
    .limit(1)

  const existingPendingLearner = await db
    .select({ email: pendingLearners.email })
    .from(pendingLearners)
    .where(eq(pendingLearners.email, email.trim().toLowerCase()))
    .limit(1)

  if (existingUser.length > 0 || existingPendingLearner.length > 0) {
    return NextResponse.json(
      { error: "Email address is already registered." },
      { status: 409 }
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

    // Log registration
    await logUserAction({
      action: AUDIT_ACTIONS.USER_REGISTER,
      entityType: ENTITY_TYPES.LEARNER,
      entityId: newUserId,
      description: `New learner registered: ${firstName} ${lastName} (${email})`,
      metadata: {
        email,
        country,
        timezone,
        experienceLevel,
        role: "learner"
      },
      severity: "info",
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Learner registration error:', error)

    // Handle specific database constraint errors
    if (error instanceof Error && error.message.includes('duplicate key value')) {
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

// Apply rate limiting to learner registration
export const POST = withRateLimit('auth', handleRegisterLearner)
