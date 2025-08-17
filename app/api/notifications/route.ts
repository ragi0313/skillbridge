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
      limit: 10,
    })

    return NextResponse.json({ notifications: userNotifications }, { status: 200 })
  } catch (error) {
    console.error("Error fetching notifications:", error)
    return NextResponse.json(
      { error: "Failed to fetch notifications", details: error instanceof Error ? error.message : "Unknown error" }, 
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let body;
    try {
      body = await req.json()
    } catch (parseError) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" }, 
        { status: 400 }
      )
    }

    const { notificationIds } = body

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return NextResponse.json(
        { error: "Invalid notification IDs provided" }, 
        { status: 400 }
      )
    }

    await db.transaction(async (tx) => {
      for (const id of notificationIds) {
        await tx.update(notifications)
          .set({ isRead: true })
          .where(and(eq(notifications.id, id), eq(notifications.userId, session.id)))
      }
    })

    return NextResponse.json(
      { message: "Notifications marked as read" }, 
      { status: 200 }
    )
  } catch (error) {
    console.error("Error marking notifications as read:", error)
    return NextResponse.json(
      { 
        error: "Failed to mark notifications as read", 
        details: error instanceof Error ? error.message : "Unknown error" 
      }, 
      { status: 500 }
    )
  }
}

// POST endpoint for single notification actions
export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let body;
    try {
      body = await req.json()
    } catch (parseError) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" }, 
        { status: 400 }
      )
    }

    const { notificationId, action } = body

    if (!notificationId || !action) {
      return NextResponse.json(
        { error: "Notification ID and action are required" }, 
        { status: 400 }
      )
    }

    if (action === "markRead") {
      await db.update(notifications)
        .set({ isRead: true })
        .where(and(eq(notifications.id, notificationId), eq(notifications.userId, session.id)))

      return NextResponse.json(
        { message: "Notification marked as read" }, 
        { status: 200 }
      )
    }

    return NextResponse.json(
      { error: "Invalid action" }, 
      { status: 400 }
    )
  } catch (error) {
    console.error("Error updating notification:", error)
    return NextResponse.json(
      { 
        error: "Failed to update notification", 
        details: error instanceof Error ? error.message : "Unknown error" 
      }, 
      { status: 500 }
    )
  }
}

// DELETE endpoint for deleting notifications
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let body;
    try {
      body = await req.json()
    } catch (parseError) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" }, 
        { status: 400 }
      )
    }

    const { notificationId } = body

    if (!notificationId) {
      return NextResponse.json(
        { error: "Notification ID is required" }, 
        { status: 400 }
      )
    }

    // Delete the notification
    await db.delete(notifications)
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, session.id)))

    return NextResponse.json(
      { message: "Notification deleted successfully" }, 
      { status: 200 }
    )
  } catch (error) {
    console.error("Error deleting notification:", error)
    return NextResponse.json(
      { 
        error: "Failed to delete notification", 
        details: error instanceof Error ? error.message : "Unknown error" 
      }, 
      { status: 500 }
    )
  }
}