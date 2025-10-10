import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { supportTickets } from '@/db/schema'
import { getSession } from '@/lib/auth/getSession'
import { desc, eq, and, or, like } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    // Check if user is admin
    const session = await getSession()
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const priority = searchParams.get('priority')
    const search = searchParams.get('search')

    // Build query conditions
    let conditions: any[] = []

    if (status && status !== 'all') {
      conditions.push(eq(supportTickets.status, status))
    }

    if (category && category !== 'all') {
      conditions.push(eq(supportTickets.category, category))
    }

    if (priority && priority !== 'all') {
      conditions.push(eq(supportTickets.priority, priority))
    }

    if (search) {
      conditions.push(
        or(
          like(supportTickets.subject, `%${search}%`),
          like(supportTickets.name, `%${search}%`),
          like(supportTickets.email, `%${search}%`)
        )
      )
    }

    // Fetch tickets
    const tickets = await db
      .select()
      .from(supportTickets)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(supportTickets.createdAt))

    return NextResponse.json({ tickets }, { status: 200 })

  } catch (error) {
    console.error('Error fetching support tickets:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}