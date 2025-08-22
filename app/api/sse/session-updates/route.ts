import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth/getSession"
import { db } from "@/db"
import { bookingSessions, users, learners, mentors, mentorSkills } from "@/db/schema"
import { eq, desc, or } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"

// Store active SSE connections
const activeConnections = new Map<string, {
  writer: WritableStreamDefaultWriter
  userId: number
  userRole: string
  lastUpdateTime: Date
}>()

// Cleanup inactive connections every 30 seconds
setInterval(() => {
  const now = new Date()
  const staleThreshold = 5 * 60 * 1000 // 5 minutes

  for (const [connectionId, connection] of activeConnections.entries()) {
    if (now.getTime() - connection.lastUpdateTime.getTime() > staleThreshold) {
      try {
        connection.writer.close()
      } catch (error) {
        console.error("Error closing stale SSE connection:", error)
      }
      activeConnections.delete(connectionId)
      console.log(`Cleaned up stale SSE connection: ${connectionId}`)
    }
  }
}, 30000)

export async function GET(request: NextRequest) {
  try {
    // Verify user authentication
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Set up SSE headers
    const headers = new Headers({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    })

    // Create a readable stream for SSE
    const stream = new ReadableStream({
      start(controller) {
        const writer = controller
        const connectionId = `${session.id}-${Date.now()}-${Math.random()}`
        
        // Store the connection
        activeConnections.set(connectionId, {
          writer: writer as any,
          userId: session.id,
          userRole: session.role,
          lastUpdateTime: new Date()
        })

        console.log(`SSE connection established: ${connectionId} (${session.role})`)

        // Send initial connection confirmation
        const encoder = new TextEncoder()
        const initialData = JSON.stringify({
          type: 'connection',
          message: 'Connected to session updates',
          timestamp: new Date().toISOString(),
          connectionId
        })

        try {
          writer.enqueue(encoder.encode(`data: ${initialData}\n\n`))
        } catch (error) {
          console.error("Error sending initial SSE message:", error)
        }

        // Set up periodic heartbeat
        const heartbeatInterval = setInterval(() => {
          try {
            const heartbeatData = JSON.stringify({
              type: 'heartbeat',
              timestamp: new Date().toISOString()
            })
            writer.enqueue(encoder.encode(`data: ${heartbeatData}\n\n`))
            
            // Update last activity time
            const connection = activeConnections.get(connectionId)
            if (connection) {
              connection.lastUpdateTime = new Date()
            }
          } catch (error) {
            console.error("Error sending heartbeat:", error)
            clearInterval(heartbeatInterval)
            activeConnections.delete(connectionId)
          }
        }, 30000) // Send heartbeat every 30 seconds

        // Handle connection close
        request.signal.addEventListener('abort', () => {
          console.log(`SSE connection closed: ${connectionId}`)
          clearInterval(heartbeatInterval)
          activeConnections.delete(connectionId)
          try {
            writer.close()
          } catch (error) {
            // Connection already closed
          }
        })
      }
    })

    return new Response(stream, { headers })

  } catch (error) {
    console.error("Error setting up SSE connection:", error)
    return NextResponse.json({ error: "Failed to establish SSE connection" }, { status: 500 })
  }
}

// Function to broadcast session updates to connected clients
export async function broadcastSessionUpdate(sessionId: number, updateType: string, data?: any) {
  try {
    // Get session details to determine who to notify
    const mentorUsers = alias(users, "mentor_users")
    const learnerUsers = alias(users, "learner_users")

    const [sessionData] = await db
      .select({
        id: bookingSessions.id,
        status: bookingSessions.status,
        scheduledDate: bookingSessions.scheduledDate,
        durationMinutes: bookingSessions.durationMinutes,
        totalCostCredits: bookingSessions.totalCostCredits,
        sessionNotes: bookingSessions.sessionNotes,
        mentorResponseAt: bookingSessions.mentorResponseAt,
        mentorResponseMessage: bookingSessions.mentorResponseMessage,
        rejectionReason: bookingSessions.rejectionReason,
        cancelledBy: bookingSessions.cancelledBy,
        cancellationReason: bookingSessions.cancellationReason,
        refundAmount: bookingSessions.refundAmount,
        learnerId: bookingSessions.learnerId,
        mentorId: bookingSessions.mentorId,
        mentor: {
          id: mentors.id,
          userId: mentors.userId,
          profilePictureUrl: mentors.profilePictureUrl,
          professionalTitle: mentors.professionalTitle,
        },
        mentorUser: {
          firstName: mentorUsers.firstName,
          lastName: mentorUsers.lastName,
        },
        learner: {
          id: learners.id,
          userId: learners.userId,
          profilePictureUrl: learners.profilePictureUrl,
          experienceLevel: learners.experienceLevel,
        },
        learnerUser: {
          firstName: learnerUsers.firstName,
          lastName: learnerUsers.lastName,
        },
        skill: {
          skillName: mentorSkills.skillName,
          ratePerHour: mentorSkills.ratePerHour,
        }
      })
      .from(bookingSessions)
      .leftJoin(mentors, eq(bookingSessions.mentorId, mentors.id))
      .leftJoin(mentorUsers, eq(mentors.userId, mentorUsers.id))
      .leftJoin(learners, eq(bookingSessions.learnerId, learners.id))
      .leftJoin(learnerUsers, eq(learners.userId, learnerUsers.id))
      .leftJoin(mentorSkills, eq(bookingSessions.mentorSkillId, mentorSkills.id))
      .where(eq(bookingSessions.id, sessionId))

    if (!sessionData) {
      console.error(`Session ${sessionId} not found for broadcast`)
      return
    }

    // Prepare the update message
    const updateMessage = {
      type: 'session_update',
      updateType,
      sessionId,
      session: sessionData,
      timestamp: new Date().toISOString(),
      ...data
    }

    const encoder = new TextEncoder()
    const messageData = `data: ${JSON.stringify(updateMessage)}\n\n`

    // Get target user IDs (mentor and learner)
    const targetUserIds = [
      sessionData.mentor?.userId,
      sessionData.learner?.userId
    ].filter(Boolean)

    let broadcastCount = 0

    // Send update to all relevant connected clients
    for (const [connectionId, connection] of activeConnections.entries()) {
      if (targetUserIds.includes(connection.userId)) {
        try {
          await connection.writer.enqueue(encoder.encode(messageData))
          connection.lastUpdateTime = new Date()
          broadcastCount++
        } catch (error) {
          console.error(`Error broadcasting to connection ${connectionId}:`, error)
          // Remove failed connection
          activeConnections.delete(connectionId)
        }
      }
    }

    console.log(`Broadcasted session update (${updateType}) for session ${sessionId} to ${broadcastCount} clients`)

  } catch (error) {
    console.error("Error broadcasting session update:", error)
  }
}

// Helper function to broadcast from other API endpoints
export { broadcastSessionUpdate as notifySessionUpdate }