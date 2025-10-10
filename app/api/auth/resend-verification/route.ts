import { NextRequest, NextResponse } from "next/server"
import { withRateLimit } from "@/lib/middleware/rate-limit"
import { db } from "@/db"
import { pendingLearners } from "@/db/schema"
import { eq } from "drizzle-orm"
import { sendVerificationEmail } from "@/lib/email/activationMail"

async function handleResendVerification(req: NextRequest) {
  try {
    const body = await req.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: "Email is required." },
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

    // Check if email exists in pending_learners
    const pendingLearner = await db
      .select()
      .from(pendingLearners)
      .where(eq(pendingLearners.email, email.trim().toLowerCase()))
      .limit(1)

    if (pendingLearner.length === 0) {
      // Don't reveal if email exists or not for security
      return NextResponse.json(
        { success: true, message: "If this email is registered and pending verification, we've sent a new verification link." }
      )
    }

    const learner = pendingLearner[0]

    // Check if verification token exists
    if (!learner.verificationToken) {
      return NextResponse.json(
        { error: "Verification token is missing. Please register again." },
        { status: 400 }
      )
    }

    // Send verification email
    await sendVerificationEmail({
      to: learner.email,
      token: learner.verificationToken,
      id: learner.id,
    })

    return NextResponse.json({
      success: true,
      message: "Verification email sent successfully. Please check your inbox."
    })
  } catch (error) {
    console.error('Resend verification error:', error)
    return NextResponse.json(
      { error: "Failed to resend verification email. Please try again later." },
      { status: 500 }
    )
  }
}

// Apply rate limiting (stricter than normal auth endpoints to prevent spam)
export const POST = withRateLimit('auth', handleResendVerification)
