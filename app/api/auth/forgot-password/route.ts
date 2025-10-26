import { type NextRequest, NextResponse } from "next/server"
import { withRateLimit } from "@/lib/middleware/rate-limit"
import { db } from "@/db"
import { users, passwordResetTokens } from "@/db/schema"
import { eq, and, gt } from "drizzle-orm"
import { sendPasswordResetEmail } from "@/lib/email/passwordResetMail"

async function handleForgotPassword(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    // Check if user exists
    const user = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1)

    if (user.length === 0) {
      return NextResponse.json(
        { error: "No account found with this email address. Please check your email or create a new account." },
        { status: 404 },
      )
    }

    const foundUser = user[0]

    // Check for recent tokens (prevent spam) - 1 minute cooldown
    const oneMinuteAgo = new Date(Date.now() - 1 * 60 * 1000)
    const recentToken = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.userId, foundUser.id),
          eq(passwordResetTokens.isUsed, false),
          gt(passwordResetTokens.createdAt, oneMinuteAgo),
        ),
      )
      .limit(1)

    if (recentToken.length > 0) {
      const tokenAge = Date.now() - new Date(recentToken[0].createdAt).getTime()
      const secondsRemaining = Math.ceil((60000 - tokenAge) / 1000)

      return NextResponse.json(
        {
          error: `A password reset code was sent ${Math.ceil(tokenAge / 1000)} seconds ago. Please wait ${secondsRemaining} more seconds before requesting a new one, or check your spam/junk folder.`,
        },
        { status: 429 },
      )
    }

    // Generate 6-digit verification code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString()

    // Set expiration to 5 minutes from now
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000)

    // Save reset token to database
    await db.insert(passwordResetTokens).values({
      userId: foundUser.id,
      token: resetCode,
      expiresAt,
      isUsed: false,
    })

    // Send email with reset code
    const emailResult = await sendPasswordResetEmail(foundUser.email, foundUser.firstName, resetCode)

    if (!emailResult.success) {
      return NextResponse.json({ error: "Failed to send reset email. Please try again." }, { status: 500 })
    }

    return NextResponse.json({ message: "Password reset code sent to your email." }, { status: 200 })
  } catch (error) {
    console.error("Forgot password error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Apply strict rate limiting to password reset
export const POST = withRateLimit('passwordReset', handleForgotPassword)
