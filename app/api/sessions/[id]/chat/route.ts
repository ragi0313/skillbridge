// app/api/sessions/[id]/chat/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth/getSession"
import { broadcastChatMessage } from "@/app/api/sse/session-updates/route"
import { db } from "@/db"
import { bookingSessions, learners, mentors } from "@/db/schema"
import { eq } from "drizzle-orm"

// In-memory storage for session chat (ephemeral)
const sessionMessages: Map<number, any[]> = new Map()
const MAX_MESSAGES_PER_SESSION = 100

// GET - Fetch chat history (only what's in memory)
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const sessionId = parseInt(id)

    if (isNaN(sessionId)) {
      return NextResponse.json({ error: "Invalid session ID" }, { status: 400 })
    }

    // Return messages from memory (empty array if none exist)
    const messages = sessionMessages.get(sessionId) || []
    
    console.log(`[CHAT] Fetched ${messages.length} messages for session ${sessionId}`)
    
    return NextResponse.json({ 
      messages,
      count: messages.length 
    })
  } catch (error) {
    console.error("[CHAT] Error fetching messages:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Send a new message
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const sessionId = parseInt(id)
    const body = await request.json()
    const { message, messageType, senderName, senderRole, attachment } = body

    // Validation
    if (!message && !attachment) {
      return NextResponse.json({ error: "Message or attachment required" }, { status: 400 })
    }

    if (isNaN(sessionId)) {
      return NextResponse.json({ error: "Invalid session ID" }, { status: 400 })
    }

    if (message && message.length > 1000) {
      return NextResponse.json({ error: "Message too long (max 1000 characters)" }, { status: 400 })
    }

    if (attachment && attachment.fileSize > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 })
    }

    // Create message object
    const newMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      message: message || "",
      messageType: messageType || "text",
      timestamp: Date.now(),
      senderName,
      senderRole,
      senderId: `${senderRole}-${senderName}`,
      attachment: attachment || undefined
    }

    // Store in memory
    if (!sessionMessages.has(sessionId)) {
      sessionMessages.set(sessionId, [])
    }
    
    const messages = sessionMessages.get(sessionId)!
    messages.push(newMessage)
    
    // Prevent memory bloat
    if (messages.length > MAX_MESSAGES_PER_SESSION) {
      messages.shift()
    }

    console.log(`[CHAT] Message stored for session ${sessionId} (${messages.length} total)`)

    // Get learner and mentor user IDs for broadcasting
    try {
      const sessionData = await db
        .select({
          learner: {
            userId: learners.userId
          },
          mentor: {
            userId: mentors.userId
          }
        })
        .from(bookingSessions)
        .leftJoin(learners, eq(bookingSessions.learnerId, learners.id))
        .leftJoin(mentors, eq(bookingSessions.mentorId, mentors.id))
        .where(eq(bookingSessions.id, sessionId))
        .limit(1)

      if (sessionData.length > 0 && sessionData[0].learner && sessionData[0].mentor) {
        const targetUserIds = [
          sessionData[0].learner.userId,
          sessionData[0].mentor.userId
        ]

        // Broadcast via existing SSE
        await broadcastChatMessage(sessionId, newMessage, targetUserIds)
        console.log(`[CHAT] Message broadcasted to users: ${targetUserIds.join(', ')}`)
      } else {
        console.warn(`[CHAT] Session ${sessionId} not found or missing participants`)
      }
    } catch (error) {
      console.error(`[CHAT] Failed to broadcast message:`, error)
      // Continue - message is still stored in memory
    }

    return NextResponse.json({
      message: newMessage,
      success: true
    })
  } catch (error) {
    console.error("[CHAT] Error posting message:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE - Clear session messages (when session ends)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const sessionId = parseInt(id)

    if (isNaN(sessionId)) {
      return NextResponse.json({ error: "Invalid session ID" }, { status: 400 })
    }

    // Clear messages from memory
    sessionMessages.delete(sessionId)
    
    console.log(`[CHAT] Cleared messages for session ${sessionId}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[CHAT] Error clearing messages:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}