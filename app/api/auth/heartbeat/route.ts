import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth/getSession"
import { db } from "@/db"
import { users } from "@/db/schema"
import { eq } from "drizzle-orm"

/**
 * Heartbeat endpoint to update user's lastLoginAt timestamp
 * This keeps users marked as "online" in the admin panel
 * Should be called periodically (every 5 minutes) while user is active
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession()

    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Update lastLoginAt to current time
    await db
      .update(users)
      .set({
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, session.id))

    return NextResponse.json({ success: true, timestamp: new Date() })
  } catch (error) {
    console.error("[HEARTBEAT] Error updating user activity:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
