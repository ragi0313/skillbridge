import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth/getSession"
import { withRateLimit } from "@/lib/middleware/rate-limit"
import { db } from "@/db"
import { users } from "@/db/schema"
import { eq } from "drizzle-orm"

const sessionMessages: Record<string, any[]> = {}

// Clean up session messages after 2 hours of inactivity
const sessionCleanupIntervals: Record<string, NodeJS.Timeout> = {}

function scheduleSessionCleanup(sessionId: string) {
  // Clear existing cleanup timer if it exists
  if (sessionCleanupIntervals[sessionId]) {
    clearTimeout(sessionCleanupIntervals[sessionId])
  }

  // Schedule cleanup after 2 hours of inactivity
  sessionCleanupIntervals[sessionId] = setTimeout(() => {
    delete sessionMessages[sessionId]
    delete sessionCleanupIntervals[sessionId]
    }, 2 * 60 * 60 * 1000) // 2 hours
}

async function handleGetChatMessages(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const messages = sessionMessages[id] || []

    // Reset cleanup timer when messages are accessed
    if (messages.length > 0) {
      scheduleSessionCleanup(id)
    }

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

    const newMessage = {
      id: Date.now().toString(),
      message: message || "",
      messageType: messageType || "text",
      timestamp: Date.now(),
      senderName: senderName || `${user.firstName} ${user.lastName}`,
      senderRole: senderRole || user.role,
      senderId: expectedSenderId,
      // Keep attachment data for polling - it's ephemeral anyway (cleared after 2 hours)
      attachment: attachment || undefined
    }

    // Store in memory for the session (ephemeral)
    if (!sessionMessages[sessionId]) {
      sessionMessages[sessionId] = []
    }
    sessionMessages[sessionId].push(newMessage)

    // Schedule cleanup timer for this session
    scheduleSessionCleanup(sessionId)

    console.log(`[SESSION_CHAT] Message stored successfully for session ${sessionId}`)

    // NOTE: Not using Pusher for session chat to avoid conflicts with global ChatContext
    // Video call chat uses polling mode to fetch messages every 3 seconds
    // This keeps session chat separate from the regular messaging system

    return NextResponse.json({
      message: newMessage,
      success: true
    })
  } catch (error) {
    console.error("[SESSION_CHAT] Error posting message:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}