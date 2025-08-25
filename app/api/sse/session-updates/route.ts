import { NextRequest } from "next/server"
import { getSession } from "@/lib/auth/getSession"

// Store active SSE connections
const connections = new Map<string, ReadableStreamDefaultController>()

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session?.id) {
    return new Response('Unauthorized', { status: 401 })
  }

  const userId = session.id.toString()

  // Create SSE stream
  const stream = new ReadableStream({
    start(controller) {
      // Store connection for this user
      connections.set(userId, controller)

      // Send initial connection message
      const message = `data: ${JSON.stringify({
        type: 'connected',
        timestamp: new Date().toISOString()
      })}\n\n`
      
      controller.enqueue(new TextEncoder().encode(message))

      // Set up heartbeat to keep connection alive
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

  console.log(`[SSE] Broadcasted ${updateType} for session ${sessionId} to ${targetUserIds ? targetUserIds.length : connections.size} users`)
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