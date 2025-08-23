import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { chatMessages, chatAttachments, bookingSessions, users } from "@/db/schema"
import { eq, desc, and } from "drizzle-orm"
import { getSession } from "@/lib/auth/getSession"

// GET - Fetch chat messages for a session
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const sessionId = parseInt(id)

    if (!sessionId || isNaN(sessionId)) {
      return NextResponse.json({ error: "Invalid session ID" }, { status: 400 })
    }

    // Verify user has access to this session
    const [bookingSession] = await db
      .select({
        id: bookingSessions.id,
        learnerId: bookingSessions.learnerId,
        mentorId: bookingSessions.mentorId,
      })
      .from(bookingSessions)
      .where(eq(bookingSessions.id, sessionId))

    if (!bookingSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // TODO: Add proper access control based on learner/mentor relationship

    // Get chat messages with user information
    const messages = await db
      .select({
        id: chatMessages.id,
        message: chatMessages.message,
        messageType: chatMessages.messageType,
        isEdited: chatMessages.isEdited,
        editedAt: chatMessages.editedAt,
        replyToMessageId: chatMessages.replyToMessageId,
        createdAt: chatMessages.createdAt,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
        },
        attachments: chatAttachments,
      })
      .from(chatMessages)
      .leftJoin(users, eq(chatMessages.userId, users.id))
      .leftJoin(chatAttachments, eq(chatMessages.id, chatAttachments.messageId))
      .where(and(
        eq(chatMessages.sessionId, sessionId),
        eq(chatMessages.isDeleted, false)
      ))
      .orderBy(desc(chatMessages.createdAt))
      .limit(100) // Last 100 messages

    return NextResponse.json({ messages })
  } catch (error) {
    console.error("Error fetching chat messages:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Send a chat message
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const sessionId = parseInt(id)

    if (!sessionId || isNaN(sessionId)) {
      return NextResponse.json({ error: "Invalid session ID" }, { status: 400 })
    }

    const { message, messageType = "text", replyToMessageId } = await request.json()

    if (!message || message.trim().length === 0) {
      return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 })
    }

    if (message.length > 2000) {
      return NextResponse.json({ error: "Message too long" }, { status: 400 })
    }

    // Verify user has access to this session
    const [bookingSession] = await db
      .select({
        id: bookingSessions.id,
        learnerId: bookingSessions.learnerId,
        mentorId: bookingSessions.mentorId,
      })
      .from(bookingSessions)
      .where(eq(bookingSessions.id, sessionId))

    if (!bookingSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // TODO: Add proper access control based on learner/mentor relationship

    // Insert the message
    const [newMessage] = await db
      .insert(chatMessages)
      .values({
        sessionId,
        userId: session.id,
        message: message.trim(),
        messageType,
        replyToMessageId: replyToMessageId || null,
      })
      .returning({
        id: chatMessages.id,
        message: chatMessages.message,
        messageType: chatMessages.messageType,
        createdAt: chatMessages.createdAt,
      })

    // Get user info for the response
    const [userInfo] = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, session.id))

    return NextResponse.json({
      success: true,
      message: {
        ...newMessage,
        user: userInfo,
      },
    })
  } catch (error) {
    console.error("Error sending chat message:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}