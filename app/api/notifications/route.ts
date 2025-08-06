import { db } from "@/db"
import { notifications } from "@/db/schema"
import { eq, and, desc } from "drizzle-orm"
import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth/getSession"

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userNotifications = await db.query.notifications.findMany({
      where: eq(notifications.userId, session.id),
      orderBy: desc(notifications.createdAt),
      limit: 10, // Fetch latest 10 notifications
    })

    return NextResponse.json({ notifications: userNotifications }, { status: 200 })
  } catch (error) {
    console.error("Error fetching notifications:", error)
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { notificationIds } = await req.json()

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return NextResponse.json({ error: "Invalid notification IDs provided" }, { status: 400 })
    }

    await db.transaction(async (tx) => {
      for (const id of notificationIds) {
        await tx.update(notifications)
          .set({ isRead: true })
          .where(and(eq(notifications.id, id), eq(notifications.userId, session.id)))
      }
    })

    return NextResponse.json({ message: "Notifications marked as read" }, { status: 200 })
  } catch (error) {
    console.error("Error marking notifications as read:", error)
    return NextResponse.json({ error: "Failed to mark notifications as read" }, { status: 500 })
  }
}
