import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { db } from '@/db'
import { refundRequests, bookingSessions, users, learners, mentors } from '@/db/schema'
import { eq, desc, and, or, ilike } from 'drizzle-orm'

// GET - List all refund requests with filtering
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session?.id || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'all'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = 20
    const offset = (page - 1) * limit

    // Build query
    let query = db
      .select({
        refundRequest: refundRequests,
        session: bookingSessions,
        requester: users,
      })
      .from(refundRequests)
      .leftJoin(bookingSessions, eq(refundRequests.sessionId, bookingSessions.id))
      .leftJoin(users, eq(refundRequests.requestedBy, users.id))
      .orderBy(desc(refundRequests.createdAt))
      .limit(limit)
      .offset(offset)

    // Apply status filter
    if (status !== 'all') {
      query = query.where(eq(refundRequests.status, status))
    }

    const requests = await query

    // Get total count for pagination
    const totalCount = await db
      .select({ count: refundRequests.id })
      .from(refundRequests)
      .where(status !== 'all' ? eq(refundRequests.status, status) : undefined)

    return NextResponse.json({
      refundRequests: requests,
      pagination: {
        page,
        limit,
        total: totalCount.length,
        totalPages: Math.ceil(totalCount.length / limit)
      }
    })

  } catch (error) {
    console.error('[ADMIN] Error fetching refund requests:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
