import { NextRequest, NextResponse } from "next/server"
import { withRateLimit } from "@/lib/middleware/rate-limit"
import { db } from "@/db"
import { users } from "@/db/schema"
import { eq } from "drizzle-orm"
import { getSession } from "@/lib/auth/getSession"
import { sendSuspensionEmail, sendBlacklistEmail } from "@/lib/email/userActionsMail"

async function handleUserAction(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { type, userId, reason, duration } = await request.json()

    if (!type || !userId || !reason) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Prevent admin from suspending/blacklisting other admins
    if (user.role === "admin") {
      return NextResponse.json({ error: "Cannot perform actions on admin accounts" }, { status: 403 })
    }

    const now = new Date()

    if (type === "suspend") {
      if (!duration) {
        return NextResponse.json({ error: "Suspension duration is required" }, { status: 400 })
      }

      const suspensionEndsAt = new Date(now.getTime() + duration * 24 * 60 * 60 * 1000)

      await db
        .update(users)
        .set({
          status: "suspended",
          suspendedAt: now,
          suspensionEndsAt,
          suspensionReason: reason,
          updatedAt: now,
        })
        .where(eq(users.id, userId))

      const emailResult = await sendSuspensionEmail({
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        reason,
        suspensionEndsAt,
        adminMessage: reason,
      })

      if (!emailResult.success) {
        console.error("Failed to send suspension email:", emailResult.error)
      }

      return NextResponse.json(
        {
          message: `User ${user.firstName} ${user.lastName} has been suspended for ${duration} days. Email notification sent.`,
          action: "suspended",
          duration,
          suspensionEndsAt: suspensionEndsAt.toISOString(),
        },
        { status: 200 },
      )
    } else if (type === "blacklist") {
      await db
        .update(users)
        .set({
          status: "blacklisted",
          blacklistedAt: now,
          blacklistReason: reason,
          // Clear any existing suspension data
          suspendedAt: null,
          suspensionEndsAt: null,
          suspensionReason: null,
          updatedAt: now,
        })
        .where(eq(users.id, userId))

      const emailResult = await sendBlacklistEmail({
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        reason,
        adminMessage: reason,
      })

      if (!emailResult.success) {
        console.error("Failed to send blacklist email:", emailResult.error)
      }

      return NextResponse.json(
        {
          message: `User ${user.firstName} ${user.lastName} has been permanently blacklisted. Email notification sent.`,
          action: "blacklisted",
        },
        { status: 200 },
      )
    } else {
      return NextResponse.json({ error: "Invalid action type" }, { status: 400 })
    }
  } catch (error) {
    console.error("Error performing user action:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Apply admin rate limiting
export const POST = withRateLimit('admin', handleUserAction)
