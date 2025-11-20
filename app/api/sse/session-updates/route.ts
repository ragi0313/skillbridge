//app/api/sse/session-updates
import { NextRequest } from "next/server"
import { getSession } from "@/lib/auth/getSession"

const connections = new Map<string, ReadableStreamDefaultController>()

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session?.id) {
    return new Response('Unauthorized', { status: 401 })
  }

  const userId = session.id.toString()


  const stream = new ReadableStream({
    start(controller) {
      connections.set(userId, controller)
      const message = `data: ${JSON.stringify({
        type: 'connected',
        timestamp: new Date().toISOString()
      })}\n\n`
      
      controller.enqueue(new TextEncoder().encode(message))
      const heartbeatInterval = setInterval(() => {
        try {
          const heartbeat = `data: ${JSON.stringify({
            type: 'heartbeat',
            timestamp: new Date().toISOString()
          })}\n\n`
          
          controller.enqueue(new TextEncoder().encode(heartbeat))
        } catch (error) {
          // Connection closed, clean up
          clearInterval(heartbeatInterval)
          connections.delete(userId)
        }
      }, 30000) // 30 seconds

      // Clean up on close
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval)
        connections.delete(userId)
        try {
          controller.close()
        } catch (error) {
          // Ignore close errors
        }
      })
    },
    cancel() {
      connections.delete(userId)
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  })
}

// Export function to broadcast updates to specific users
export async function broadcastSessionUpdate(
  sessionId: number, 
  updateType: string, 
  data: any,
  targetUserIds?: number[]
) {
  const message = `data: ${JSON.stringify({
    type: 'session_update',
    sessionId,
    updateType,
    ...data,
    timestamp: new Date().toISOString()
  })}\n\n`

  const encodedMessage = new TextEncoder().encode(message)

  // If specific users are targeted, only send to them
  if (targetUserIds && targetUserIds.length > 0) {
    for (const userId of targetUserIds) {
      const connection = connections.get(userId.toString())
      if (connection) {
        try {
          connection.enqueue(encodedMessage)
        } catch (error) {
          console.error(`Failed to send update to user ${userId}:`, error)
          connections.delete(userId.toString())
        }
      }
    }
  } else {
    // Broadcast to all connected users
    for (const [userId, connection] of connections) {
      try {
        connection.enqueue(encodedMessage)
      } catch (error) {
        console.error(`Failed to broadcast to user ${userId}:`, error)
        connections.delete(userId)
      }
    }
  }

  }

// Export function to force disconnect users
export async function broadcastForceDisconnect(
  sessionId: number,
  reason: string,
  targetUserIds: number[]
) {
  await broadcastSessionUpdate(sessionId, 'force_disconnect', {
    reason,
    message: reason
  }, targetUserIds)
}

// Export function to broadcast booking status updates
export async function broadcastBookingUpdate(
  bookingId: number,
  updateType: 'status_changed' | 'booking_expired' | 'mentor_response',
  data: any,
  targetUserIds?: number[]
) {
  const message = `data: ${JSON.stringify({
    type: 'booking_update',
    bookingId,
    updateType,
    ...data,
    timestamp: new Date().toISOString()
  })}\n\n`

  const encodedMessage = new TextEncoder().encode(message)

  // If specific users are targeted, only send to them
  if (targetUserIds && targetUserIds.length > 0) {
    for (const userId of targetUserIds) {
      const connection = connections.get(userId.toString())
      if (connection) {
        try {
          connection.enqueue(encodedMessage)
        } catch (error) {
          console.error(`Failed to send booking update to user ${userId}:`, error)
          connections.delete(userId.toString())
        }
      }
    }
  }

  }

// Export function to broadcast chat messages
export async function broadcastChatMessage(
  sessionId: number,
  message: any,
  targetUserIds: number[]
) {
  const data = `data: ${JSON.stringify({
    type: 'chat_message',
    sessionId,
    message,
    timestamp: new Date().toISOString()
  })}\n\n`

  const encodedMessage = new TextEncoder().encode(data)

  // Debug: log all active connections
  console.log(`[SSE] Broadcasting chat message to users: ${targetUserIds.join(', ')}`)
  console.log(`[SSE] Current active connections: ${Array.from(connections.keys()).join(', ')}`)

  // Send to specific users
  for (const userId of targetUserIds) {
    const connection = connections.get(userId.toString())
    if (connection) {
      try {
        connection.enqueue(encodedMessage)
        console.log(`[SSE] ✓ Chat message sent to user ${userId}`)
      } catch (error) {
        console.error(`[SSE] ✗ Failed to send chat message to user ${userId}:`, error)
        connections.delete(userId.toString())
      }
    } else {
      console.warn(`[SSE] ✗ User ${userId} has no active SSE connection`)
    }
  }
}