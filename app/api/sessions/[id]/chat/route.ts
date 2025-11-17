import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth/getSession"
import { withRateLimit } from "@/lib/middleware/rate-limit"
import { db } from "@/db"
import { users, bookingSessions, learners, mentors } from "@/db/schema"
import { eq } from "drizzle-orm"
import { broadcastChatMessage } from "@/app/api/sse/session-updates/route"
import { sessionChatService } from "@/lib/services/SessionChatService"

async function handleGetChatMessages(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    // Use hybrid service (Redis first, DB fallback)
    const messages = await sessionChatService.getMessages(sessionId)

    return NextResponse.json({ messages })
  } catch (error) {
    console.error("[CHAT_API] Error fetching messages:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Apply rate limiting to GET requests (20 per minute max)
export async function GET(request: NextRequest, context: any) {
  return withRateLimit("chat", async (req: NextRequest) => {
    return handleGetChatMessages(req, context)
  })(request)
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session?.id) {
      console.warn("[SESSION_CHAT] Unauthorized request to post message")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: sessionId } = await params
    const body = await request.json()
    const { message, messageType, senderName, senderRole, attachment } = body

    console.log(`[SESSION_CHAT] Received message for session ${sessionId} from ${senderName} (${senderRole})`)

    // Validate input
    if (!message && !attachment) {
      return NextResponse.json({ error: "Message or attachment required" }, { status: 400 })
    }

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
    }

    // Validate message content
    if (message && message.length > 1000) {
      return NextResponse.json({ error: "Message too long (max 1000 characters)" }, { status: 400 })
    }

    // Validate file size if attachment exists (5MB limit for session chat)
    // Note: Files are stored in-memory for the session duration only (ephemeral)
    if (attachment && attachment.fileSize > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 5MB for session chat)" }, { status: 400 })
    }

    // Basic spam detection for session chat
    if (message) {
      const spamPatterns = [
        /(.)\1{10,}/i, // Repeated characters (10+ times)
        /(buy now|click here|limited time|act now)/gi, // Spam keywords
      ]

      if (spamPatterns.some(pattern => pattern.test(message))) {
        return NextResponse.json({ error: "Message appears to contain spam content" }, { status: 400 })
      }
    }

    // Get user details from database
    const [user] = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role
      })
      .from(users)
      .where(eq(users.id, session.id))
      .limit(1)

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Verify the sender matches the authenticated user
    const expectedSenderId = `${user.role}-${user.firstName} ${user.lastName}`
    const providedSenderId = `${senderRole}-${senderName}`

    if (providedSenderId !== expectedSenderId) {
      return NextResponse.json({ error: "Message sender does not match authenticated user" }, { status: 403 })
    }

    const sessionIdInt = parseInt(sessionId)
    if (isNaN(sessionIdInt)) {
      return NextResponse.json({ error: "Invalid session ID" }, { status: 400 })
    }

    // Store message using hybrid service (Redis first, DB fallback)
    const storedMessage = await sessionChatService.storeMessage(
      sessionIdInt,
      session.id,
      senderRole || user.role,
      message || ""
    )

    const newMessage = {
      ...storedMessage,
      senderName: senderName || `${user.firstName} ${user.lastName}`,
      // Note: Attachments not persisted - they're ephemeral for session only
      attachment: attachment || undefined
    }

    console.log(`[SESSION_CHAT] Message stored for session ${sessionId}`)

    // Broadcast message via SSE for real-time delivery
    try {
      // Get learner and mentor user IDs for this session
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
        .where(eq(bookingSessions.id, sessionIdInt))
        .limit(1)

      if (sessionData.length > 0 && sessionData[0].learner && sessionData[0].mentor) {
        const targetUserIds = [
          sessionData[0].learner.userId,
          sessionData[0].mentor.userId
        ]

        await broadcastChatMessage(sessionIdInt, newMessage, targetUserIds)
        console.log(`[SESSION_CHAT] Message broadcasted via SSE for session ${sessionId}`)
      }
    } catch (error) {
      console.error(`[SESSION_CHAT] Failed to broadcast message via SSE:`, error)
      // Continue - client can still poll as fallback
    }

    return NextResponse.json({
      message: newMessage,
      success: true
    })
  } catch (error) {
    console.error("[SESSION_CHAT] Error posting message:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}