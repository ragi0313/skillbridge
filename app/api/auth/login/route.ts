

import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { withRateLimit } from "@/lib/middleware/rate-limit"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { users, learners, mentors, admins } from "@/db/schema"
import { compare } from "bcryptjs"
import { sign } from "jsonwebtoken"
import { sendBlacklistNotificationEmail, sendSuspensionNotificationEmail } from "@/lib/email/userRestrictionMail"


const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Operation timeout')), ms)
    )
  ])
}

async function handleLogin(req: NextRequest) {
  try {
    console.log('Login API: Request received')
    
    // Parse request body with timeout
    const body = await withTimeout(req.json(), 5000)
    const { email, password } = body

    // Validate input
    if (!email || !password) {
      console.log('Login API: Missing email or password')
      return NextResponse.json(
        { message: "Email and password are required" }, 
        { status: 400 }
      )
    }

    console.log('Login API: Querying database for user:', email)
    
    // Database query with timeout (5 seconds)
    const userQuery = await withTimeout(
      db.select().from(users).where(eq(users.email, email)),
      5000
    )
    
    const [user] = userQuery

    if (!user) {
      return NextResponse.json(
        { message: "Invalid email" },
        { status: 401 }
      )
    }
    
    // Password comparison with timeout
    const isPasswordValid = await withTimeout(
      compare(password, user.hashedPassword),
      3000
    )
    
    if (!isPasswordValid) {
      return NextResponse.json(
        { message: "Incorrect password" },
        { status: 401 }
      )
    }

    
    // Check if user is blacklisted
    if (user.blacklistedAt) {
      // Send notification email to user about blacklist with appeal option
      try {
        await sendBlacklistNotificationEmail(user.email, user.firstName, user.blacklistReason || "Policy violation")
      } catch (emailError) {
        console.error('Failed to send blacklist notification email:', emailError)
      }

      return NextResponse.json(
        {
          error: "Your account has been permanently restricted due to policy violations. An email has been sent to you with appeal instructions.",
          status: "blacklisted",
          reason: user.blacklistReason || "Policy violation",
          canAppeal: true
        },
        { status: 403 },
      )
    }

    // Check if user is suspended
    if (user.suspendedAt) {
      const now = new Date()
      const suspensionEnd = user.suspensionEndsAt

      if (suspensionEnd && now < suspensionEnd) {
        // Send notification email about suspension
        try {
          await sendSuspensionNotificationEmail(
            user.email, 
            user.firstName, 
            user.suspensionReason || "Policy violation",
            suspensionEnd
          )
        } catch (emailError) {
          console.error('Failed to send suspension notification email:', emailError)
        }

        const endDate = suspensionEnd.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
        return NextResponse.json(
          {
            error: `Your account is suspended until ${endDate}. An email has been sent with details and appeal instructions.`,
            status: "suspended",
            reason: user.suspensionReason || "Policy violation",
            suspensionEndsAt: suspensionEnd,
            canAppeal: true
          },
          { status: 403 },
        )
      } else if (suspensionEnd && now >= suspensionEnd) {
        await db
          .update(users)
          .set({
            status: "online",
            suspendedAt: null,
            suspensionEndsAt: null,
            suspensionReason: null,
            lastLoginAt: now,
            updatedAt: now,
          })
          .where(eq(users.id, user.id))
      }
    }

    if (user.status !== "online") {
      await db
        .update(users)
        .set({
          status: "online",
          lastLoginAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id))
    } else {
      await db
        .update(users)
        .set({
          lastLoginAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id))
    }

    
    // Get profile picture URL based on user role
    let profilePictureUrl = null
    
    try {
      switch (user.role) {
        case "learner":
          const [learner] = await withTimeout(
            db.select({ profilePictureUrl: learners.profilePictureUrl })
              .from(learners)
              .where(eq(learners.userId, user.id)),
            3000
          )
          profilePictureUrl = learner?.profilePictureUrl || null
          break
          
        case "mentor":
          const [mentor] = await withTimeout(
            db.select({ profilePictureUrl: mentors.profilePictureUrl })
              .from(mentors)
              .where(eq(mentors.userId, user.id)),
            3000
          )
          profilePictureUrl = mentor?.profilePictureUrl || null
          break
          
        case "admin":
          const [admin] = await withTimeout(
            db.select({ profilePictureUrl: admins.profilePictureUrl })
              .from(admins)
              .where(eq(admins.userId, user.id)),
            3000
          )
          profilePictureUrl = admin?.profilePictureUrl || null
          break
      }
    } catch (profileError) {
      console.warn('Login API: Could not fetch profile picture, continuing without it:', profileError)
      // Continue without profile picture if query fails
    }

    
    // JWT signing
    if (!process.env.JWT_SECRET) {
      console.error('Login API: JWT_SECRET not configured')
      return NextResponse.json(
        { message: "Server configuration error" }, 
        { status: 500 }
      )
    }

    const token = sign(
      {
        id: user.id,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        profilePictureUrl,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    )

    
    // Set cookie
    const cookieStore = await cookies()
    cookieStore.set("session_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })
    
    // Return success with role (matching frontend expectation)
    return NextResponse.json({ 
      success: true, 
      role: user.role,
      message: "Login successful"
    })

  } catch (error) {
    console.error('Login API Error:', error)
    
    // Handle specific timeout errors
    if (error instanceof Error && error.message === 'Operation timeout') {
      return NextResponse.json(
        { message: "Request timeout. Please try again." }, 
        { status: 408 }
      )
    }
    
    // Handle other errors
    return NextResponse.json(
      { message: "An unexpected error occurred. Please try again." }, 
      { status: 500 }
    )
  }
}

// Apply rate limiting to login endpoint
export const POST = withRateLimit('auth', handleLogin)