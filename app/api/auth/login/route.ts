

import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { withRateLimit } from "@/lib/middleware/rate-limit"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { users, learners, mentors, admins } from "@/db/schema"
import { compare } from "bcryptjs"
import { sign } from "jsonwebtoken"
import { sendBlacklistNotificationEmail, sendSuspensionNotificationEmail } from "@/lib/email/userRestrictionMail"
import { logUserAction, AUDIT_ACTIONS, ENTITY_TYPES, extractRequestInfo } from "@/lib/admin/audit-log"
import { is2FAEnabled, create2FACode } from "@/lib/auth/two-factor-service"

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
    // Parse request body with timeout
    const body = await withTimeout(req.json(), 5000)
    const { email, password } = body

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { message: "Email and password are required" }, 
        { status: 400 }
      )
    }

    // Database query with timeout (5 seconds)
    const userQuery = await withTimeout(
      db.select().from(users).where(eq(users.email, email)),
      5000
    )
    
    const [user] = userQuery

    const { ipAddress, userAgent } = extractRequestInfo(req)

    if (!user) {
      // Log failed login attempt
      await logUserAction({
        action: AUDIT_ACTIONS.USER_LOGIN_FAILED,
        entityType: ENTITY_TYPES.USER,
        description: `Failed login attempt for email: ${email}`,
        metadata: { email, reason: "email_not_found" },
        ipAddress,
        userAgent,
        severity: "warning",
      })

      return NextResponse.json(
        { message: "No account exists with this email address" },
        { status: 401 }
      )
    }

    // Password comparison with timeout
    const isPasswordValid = await withTimeout(
      compare(password, user.hashedPassword),
      3000
    )

    if (!isPasswordValid) {
      // Log failed login attempt
      await logUserAction({
        userId: user.id,
        action: AUDIT_ACTIONS.USER_LOGIN_FAILED,
        entityType: ENTITY_TYPES.USER,
        entityId: user.id,
        description: `Failed login attempt: Incorrect password for ${user.email}`,
        metadata: { email: user.email, reason: "incorrect_password" },
        ipAddress,
        userAgent,
        severity: "warning",
      })

      return NextResponse.json(
        { message: "Incorrect password. Please try again." },
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

    // Check if 2FA is enabled for this user
    const twoFactorEnabled = await is2FAEnabled(user.id)

    if (twoFactorEnabled) {
      // Create and send 2FA code
      const codeResult = await create2FACode(user.id)

      if (!codeResult.success || !codeResult.sessionToken) {
        return NextResponse.json(
          { error: codeResult.error || "Failed to send verification code" },
          { status: 500 }
        )
      }

      // Return response indicating 2FA is required
      return NextResponse.json(
        {
          status: "2fa_required",
          sessionToken: codeResult.sessionToken,
          message: "A verification code has been sent to your email"
        },
        { status: 200 }
      )
    }

    // Set user status to online and update last login
    await db
      .update(users)
      .set({
        status: "online",
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))

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
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profilePictureUrl,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    )

    // Set cookie with enhanced security
    const cookieStore = await cookies()
    cookieStore.set("session_token", token, {
      httpOnly: true, // Prevent JavaScript access (XSS protection)
      secure: process.env.NODE_ENV === "production", // HTTPS only in production
      sameSite: "lax", // SECURITY: CSRF protection while allowing redirects from payment providers
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    // Log successful login
    await logUserAction({
      userId: user.id,
      action: user.role === "admin" ? AUDIT_ACTIONS.ADMIN_LOGIN : AUDIT_ACTIONS.USER_LOGIN,
      entityType: ENTITY_TYPES.USER,
      entityId: user.id,
      description: `${user.role} logged in: ${user.firstName} ${user.lastName} (${user.email})`,
      metadata: { role: user.role, email: user.email },
      ipAddress,
      userAgent,
      severity: "info",
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