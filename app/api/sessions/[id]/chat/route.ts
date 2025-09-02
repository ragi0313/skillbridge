import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth/getSession"

// In-memory chat storage (in production, use a database)
const sessionMessages: Record<string, any[]> = {}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const messages = sessionMessages[id] || []
    
    console.log(`[CHAT_API] GET /api/sessions/${id}/chat - returning ${messages.length} messages`)
    return NextResponse.json({ messages })
  } catch (error) {
    console.error("[CHAT_API] Error fetching messages:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { message, messageType, senderName, senderRole, attachment } = body

    if (!message && !attachment) {
      return NextResponse.json({ error: "Message or attachment required" }, { status: 400 })
    }

    const newMessage = {
      id: Date.now().toString(),
      message: message || "",
      messageType: messageType || "text",
      timestamp: Date.now(),
      senderName: senderName || "Unknown",
      senderRole: senderRole || "learner",
      senderId: `${senderRole}-${senderName}`, // Use role + name as unique identifier
      attachment
    }

    if (!sessionMessages[id]) {
      sessionMessages[id] = []
    }

    sessionMessages[id].push(newMessage)
    
    console.log(`[CHAT_API] POST /api/sessions/${id}/chat - added message from ${senderName}. Total messages: ${sessionMessages[id].length}`)
    return NextResponse.json({ message: newMessage, success: true })
  } catch (error) {
    console.error("[CHAT_API] Error posting message:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}