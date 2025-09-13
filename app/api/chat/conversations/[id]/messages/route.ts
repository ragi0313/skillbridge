import { db } from "@/db"
import { conversations, messages, users, mentors, learners, messageUserDeletions } from "@/db/schema"
import { eq, desc, and, notExists } from "drizzle-orm"
import { getSession } from "@/lib/auth/getSession"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  
  if (!session || !["mentor", "learner"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const conversationId = parseInt(id)

    // Check if user has access to this conversation
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
    if (session.role === "mentor") {
      const mentor = await db
        .select({ id: mentors.id })
        .from(mentors)
        .where(eq(mentors.userId, session.id))
        .limit(1)
      
      if (!mentor[0] || conv.mentorId !== mentor[0].id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    } else if (session.role === "learner") {
      const learner = await db
        .select({ id: learners.id })
        .from(learners)
        .where(eq(learners.userId, session.id))
        .limit(1)
      
      if (!learner[0] || conv.learnerId !== learner[0].id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    // Get messages for this conversation (excluding messages deleted by this user)
    const conversationMessages = await db
      .select({
        id: messages.id,
        conversationId: messages.conversationId,
        senderId: messages.senderId,
        content: messages.content,
        messageType: messages.messageType,
        isEdited: messages.isEdited,
        editedAt: messages.editedAt,
        replyToMessageId: messages.replyToMessageId,
        createdAt: messages.createdAt,
        updatedAt: messages.updatedAt,
        sender: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
        },
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(and(
        eq(messages.conversationId, conversationId),
        eq(messages.isDeleted, false),
        // Exclude messages that the current user has deleted
        notExists(
          db.select()
            .from(messageUserDeletions)
            .where(
              and(
                eq(messageUserDeletions.messageId, messages.id),
                eq(messageUserDeletions.userId, session.id)
              )
            )
        )
      ))
      .orderBy(messages.createdAt)

    return NextResponse.json({ messages: conversationMessages })
  } catch (error) {
    console.error("Error fetching messages:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  
  if (!session || !["mentor", "learner"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const conversationId = parseInt(id)
    const { content, messageType = 'text' } = await request.json()

    if (!content) {
      return NextResponse.json({ error: "Message content is required" }, { status: 400 })
    }

    // Check if user has access to this conversation
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
    if (session.role === "mentor") {
      const mentor = await db
        .select({ id: mentors.id })
        .from(mentors)
        .where(eq(mentors.userId, session.id))
        .limit(1)
      
      if (!mentor[0] || conv.mentorId !== mentor[0].id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    } else if (session.role === "learner") {
      const learner = await db
        .select({ id: learners.id })
        .from(learners)
        .where(eq(learners.userId, session.id))
        .limit(1)
      
      if (!learner[0] || conv.learnerId !== learner[0].id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    // Create message
    const newMessage = await db
      .insert(messages)
      .values({
        conversationId,
        senderId: session.id,
        content,
        messageType,
      })
      .returning()

    // Update conversation last message timestamp
    await db
      .update(conversations)
      .set({ 
        lastMessageAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(conversations.id, conversationId))

    // Get the complete message with sender info
    const messageWithSender = await db
      .select({
        id: messages.id,
        conversationId: messages.conversationId,
        senderId: messages.senderId,
        content: messages.content,
        messageType: messages.messageType,
        isEdited: messages.isEdited,
        editedAt: messages.editedAt,
        replyToMessageId: messages.replyToMessageId,
        createdAt: messages.createdAt,
        updatedAt: messages.updatedAt,
        sender: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
        },
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.id, newMessage[0].id))
      .limit(1)

    return NextResponse.json({ message: messageWithSender[0] }, { status: 201 })
  } catch (error) {
    console.error("Error creating message:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}