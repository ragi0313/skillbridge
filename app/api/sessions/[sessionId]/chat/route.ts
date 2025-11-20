import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { broadcastChatMessage } from '@/app/api/sse/session-updates/route'
import db from '@/db/index'

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { message, messageType, senderName, senderRole, attachment } = body

    if (!message && messageType !== 'file') {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      )
    }

    const sessionId = params.sessionId
    const numSessionId = parseInt(sessionId)

    console.log(`[CHAT API] Received message for session ${sessionId}:`, message)

    // Create chat message object
    const chatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      message,
      messageType,
      timestamp: Date.now(),
      senderName,
      senderRole,
      senderId: `${senderRole}-${senderName}`,
      attachment: attachment || undefined,
    }

    // Get session details to find both participants
    const sessionDetails = await db.session.findUnique({
      where: { id: numSessionId },
      select: {
        learnerId: true,
        mentorId: true,
      },
    })

    if (!sessionDetails) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Get the IDs of both participants
    const participantIds = [sessionDetails.learnerId, sessionDetails.mentorId].filter(
      (id) => id !== null && id !== undefined
    ) as number[]

    console.log(
      `[CHAT API] Broadcasting message to participants:`,
      participantIds,
      'from session',
      numSessionId
    )

    // Broadcast to both participants using the SSE endpoint's broadcast function
    await broadcastChatMessage(numSessionId, chatMessage, participantIds)

    return NextResponse.json({
      success: true,
      message: chatMessage,
    })
  } catch (error) {
    console.error('[CHAT API] Error handling chat message:', error)
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    )
  }
}
