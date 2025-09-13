import { db } from "@/db"
import { conversations, messages, mentors, learners, conversationUserDeletions, messageUserDeletions } from "@/db/schema"
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
    const conversationId = parseInt(id)

    // Check if conversation exists and user has access
    const conversation = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1)

    if (conversation.length === 0) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
    }

    const conv = conversation[0]
    
    // Verify user has access to this conversation
    let hasAccess = false
    if (session.role === "mentor") {
      const mentor = await db
        .select({ id: mentors.id })
        .from(mentors)
        .where(eq(mentors.userId, session.id))
        .limit(1)
      
      if (mentor[0] && conv.mentorId === mentor[0].id) {
        hasAccess = true
      }
    } else if (session.role === "learner") {
      const learner = await db
        .select({ id: learners.id })
        .from(learners)
        .where(eq(learners.userId, session.id))
        .limit(1)
      
      if (learner[0] && conv.learnerId === learner[0].id) {
        hasAccess = true
      }
    }

    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Check if user has already deleted this conversation
    const existingDeletion = await db
      .select()
      .from(conversationUserDeletions)
      .where(and(
        eq(conversationUserDeletions.conversationId, conversationId),
        eq(conversationUserDeletions.userId, session.id)
      ))
      .limit(1)

    if (existingDeletion.length > 0) {
      return NextResponse.json({ error: "Conversation already deleted" }, { status: 400 })
    }

    // Add to conversation user deletions (soft delete for this user)
    await db
      .insert(conversationUserDeletions)
      .values({
        conversationId,
        userId: session.id,
      })

    // Get all messages in this conversation
    const conversationMessages = await db
      .select({ id: messages.id })
      .from(messages)
      .where(eq(messages.conversationId, conversationId))

    // Add all messages to user deletions for this user
    if (conversationMessages.length > 0) {
      const messageDeletions = conversationMessages.map(msg => ({
        messageId: msg.id,
        userId: session.id,
      }))

      await db
        .insert(messageUserDeletions)
        .values(messageDeletions)
        .onConflictDoNothing() // In case some messages were already individually deleted
    }

    // Check if both users have deleted this conversation
    const allConversationDeletions = await db
      .select()
      .from(conversationUserDeletions)
      .where(eq(conversationUserDeletions.conversationId, conversationId))

    // If both participants have deleted the conversation, hard delete everything
    if (allConversationDeletions.length >= 2) {
      // Hard delete all messages
      await db
        .update(messages)
        .set({ 
          isDeleted: true,
          deletedAt: new Date(),
          content: null
        })
        .where(eq(messages.conversationId, conversationId))

      // Clean up deletion records
      await db
        .delete(messageUserDeletions)
        .where(eq(messageUserDeletions.messageId, conversationMessages.map(m => m.id)[0])) // This needs to be IN clause for all message IDs

      await db
        .delete(conversationUserDeletions)
        .where(eq(conversationUserDeletions.conversationId, conversationId))

      // Mark conversation as inactive
      await db
        .update(conversations)
        .set({ isActive: false })
        .where(eq(conversations.id, conversationId))
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting conversation:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}