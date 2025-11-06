import { type NextRequest, NextResponse } from "next/server"
import { verify2FACode } from "@/lib/auth/two-factor-service"
import { signJwt } from "@/lib/jwt"
import { db } from "@/db"
import { users, learners, mentors, admins } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function POST(request: NextRequest) {
  try {
    const { sessionToken, code } = await request.json()

    if (!sessionToken || !code) {
      return NextResponse.json({ error: "Session token and code are required" }, { status: 400 })
    }

    const result = await verify2FACode(sessionToken, code)

    if (!result.success || !result.userId) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    // Get user details
    const user = await db.select().from(users).where(eq(users.id, result.userId)).limit(1)

    if (user.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const foundUser = user[0]

    // Get role-specific data
    let roleData = null
    if (foundUser.role === "learner") {
      const learnerData = await db.select().from(learners).where(eq(learners.userId, foundUser.id)).limit(1)
      roleData = learnerData[0]
    } else if (foundUser.role === "mentor") {
      const mentorData = await db.select().from(mentors).where(eq(mentors.userId, foundUser.id)).limit(1)
      roleData = mentorData[0]
    } else if (foundUser.role === "admin") {
      const adminData = await db.select().from(admins).where(eq(admins.userId, foundUser.id)).limit(1)
      roleData = adminData[0]
    }

    // Create JWT token
    const token = signJwt({
      id: foundUser.id,
      role: foundUser.role,
      email: foundUser.email,
      firstName: foundUser.firstName,
      lastName: foundUser.lastName,
    })

    // Set HTTP-only cookie
    const response = NextResponse.json(
      {
        message: "Login successful",
        role: foundUser.role,
        user: {
          id: foundUser.id,
          email: foundUser.email,
          firstName: foundUser.firstName,
          lastName: foundUser.lastName,
          role: foundUser.role,
        },
      },
      { status: 200 },
    )

    response.cookies.set("session_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    })

    // Update last login timestamp
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, foundUser.id))

    return response
  } catch (error) {
    console.error("Verify 2FA code error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
