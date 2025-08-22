import { db } from "@/db"
import { notifications } from "@/db/schema"
import { eq } from "drizzle-orm"
import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth/getSession"

// PATCH endpoint for bulk actions like "mark all as read"
export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let body
    try {
      body = await req.json()
    } catch (parseError) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" }, 
        { status: 400 }
      )
    }

    const { action } = body

    if (action === "markAllAsRead") {
      // Mark all user's notifications as read
      await db.update(notifications)
        .set({ isRead: true, updatedAt: new Date() })
        .where(eq(notifications.userId, session.id))

      return NextResponse.json(
        { message: "All notifications marked as read" }, 
        { status: 200 }
      )
    }

    return NextResponse.json(
      { error: "Invalid action. Supported actions: markAllAsRead" }, 
      { status: 400 }
    )
  } catch (error) {
    console.error("Error performing bulk notification action:", error)
    return NextResponse.json(
      { 
        error: "Failed to perform bulk action", 
        details: error instanceof Error ? error.message : "Unknown error" 
      }, 
      { status: 500 }
    )
  }
}

// DELETE endpoint for bulk deletion like "delete all notifications"
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let body
    try {
      body = await req.json()
    } catch (parseError) {
      // For delete all, we don't require a body, so this is optional
      body = {}
    }

    const { action = "deleteAll" } = body

    if (action === "deleteAll") {
      // Delete all user's notifications
      await db.delete(notifications)
        .where(eq(notifications.userId, session.id))

      return NextResponse.json(
        { message: "All notifications deleted successfully" }, 
        { status: 200 }
      )
    } else if (action === "deleteRead") {
      // Delete only read notifications
      await db.delete(notifications)
        .where(eq(notifications.userId, session.id))
        .where(eq(notifications.isRead, true))

      return NextResponse.json(
        { message: "Read notifications deleted successfully" }, 
        { status: 200 }
      )
    }

    return NextResponse.json(
      { error: "Invalid action. Supported actions: deleteAll, deleteRead" }, 
      { status: 400 }
    )
  } catch (error) {
    console.error("Error deleting notifications:", error)
    return NextResponse.json(
      { 
        error: "Failed to delete notifications", 
        details: error instanceof Error ? error.message : "Unknown error" 
      }, 
      { status: 500 }
    )
  }
}