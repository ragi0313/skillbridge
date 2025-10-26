import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { db } from '@/db'
import { sessionLogs, bookingSessions, users } from '@/db/schema'
import { eq, desc, and, sql } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session?.id || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const eventType = searchParams.get('eventType') || 'all'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = 50
    const offset = (page - 1) * limit

    // Build query
    let conditions = []

    if (sessionId) {
      conditions.push(eq(sessionLogs.sessionId, parseInt(sessionId)))
    }

    if (eventType !== 'all') {
      conditions.push(eq(sessionLogs.eventType, eventType))
    }

    const logs = await db
      .select({
        log: sessionLogs,
        session: {
          id: bookingSessions.id,
          status: bookingSessions.status,
          startTime: bookingSessions.startTime,
          endTime: bookingSessions.endTime,
        },
        actor: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
      })
      .from(sessionLogs)
      .leftJoin(bookingSessions, eq(sessionLogs.sessionId, bookingSessions.id))
      .leftJoin(users, eq(sessionLogs.actorId, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(sessionLogs.createdAt))
      .limit(limit)
      .offset(offset)

    // Get total count for pagination
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(sessionLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    })

  } catch (error) {
    console.error('[ADMIN] Error fetching session activity logs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
