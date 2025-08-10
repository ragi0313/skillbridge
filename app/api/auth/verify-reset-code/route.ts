import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { users, passwordResetTokens } from "@/db/schema"
import { eq, and, gt } from "drizzle-orm"
import jwt from "jsonwebtoken"

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json()

    if (!email || !code) {
      return NextResponse.json({ error: "Email and code are required" }, { status: 400 })
    }

    // Find user
    const user = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1)

    if (user.length === 0) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    const foundUser = user[0]

    // Find valid reset token
    const resetToken = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.userId, foundUser.id),
          eq(passwordResetTokens.token, code),
          eq(passwordResetTokens.isUsed, false),
          gt(passwordResetTokens.expiresAt, new Date()),
        ),
      )
      .limit(1)

    if (resetToken.length === 0) {
      return NextResponse.json({ error: "Invalid or expired verification code" }, { status: 400 })
    }

    // Mark token as used
    await db.update(passwordResetTokens).set({ isUsed: true }).where(eq(passwordResetTokens.id, resetToken[0].id))

    // Generate temporary JWT token for password reset (valid for 10 minutes)
    const tempToken = jwt.sign({ userId: foundUser.id, purpose: "password-reset" }, process.env.JWT_SECRET!, {
      expiresIn: "10m",
    })

    return NextResponse.json({ resetToken: tempToken }, { status: 200 })
  } catch (error) {
    console.error("Verify reset code error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
