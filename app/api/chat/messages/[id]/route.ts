import { db } from "@/db"
import { messages, messageUserDeletions } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { getSession } from "@/lib/auth/getSession"
import { NextRequest, NextResponse } from "next/server"

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  
  if (!session || !["mentor", "learner"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const messageId = parseInt(id)

    // Check if message exists and user owns it
    const message = await db
      .select()
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1)

    if (message.length === 0) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 })
    }

    if (message[0].senderId !== session.id) {
      return NextResponse.json({ error: "You can only delete your own messages" }, { status: 403 })
    }

    // Check if user has already deleted this message
    const existingDeletion = await db
      .select()
      .from(messageUserDeletions)
      .where(and(
        eq(messageUserDeletions.messageId, messageId),
        eq(messageUserDeletions.userId, session.id)
      ))
      .limit(1)

    if (existingDeletion.length > 0) {
      return NextResponse.json({ error: "Message already deleted" }, { status: 400 })
    }

    // Add to user deletions table (soft delete for this user only)
    await db
      .insert(messageUserDeletions)
      .values({
        messageId,
        userId: session.id,
      })

    // Check if both users have deleted this message
    const allDeletions = await db
      .select()
      .from(messageUserDeletions)
      .where(eq(messageUserDeletions.messageId, messageId))

    // If all conversation participants have deleted this message, hard delete it
    if (allDeletions.length >= 2) { // Assuming only 2 participants (mentor + learner)
      await db
        .update(messages)
        .set({ 
          isDeleted: true,
          deletedAt: new Date(),
          content: null // Clear content to save space
        })
        .where(eq(messages.id, messageId))

      // Remove the deletion records since message is now hard deleted
      await db
        .delete(messageUserDeletions)
        .where(eq(messageUserDeletions.messageId, messageId))
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting message:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}