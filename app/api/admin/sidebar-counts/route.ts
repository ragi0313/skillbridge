import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { pendingMentors, supportTickets, userReports } from '@/db/schema'
import { getSession } from '@/lib/auth/getSession'
import { eq, count } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    // Check if user is admin
    const session = await getSession()
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch counts in parallel
    const [
      pendingMentorsCount,
      openSupportTicketsCount,
      pendingReportsCount
    ] = await Promise.all([
      // Count pending mentor applications
      db.select({ count: count() }).from(pendingMentors),

      // Count open support tickets
      db.select({ count: count() })
        .from(supportTickets)
        .where(eq(supportTickets.status, 'open')),

      // Count pending user reports
      db.select({ count: count() })
        .from(userReports)
        .where(eq(userReports.status, 'pending'))
    ])

    const counts = {
      pendingMentors: pendingMentorsCount[0]?.count || 0,
      openSupportTickets: openSupportTicketsCount[0]?.count || 0,
      pendingReports: pendingReportsCount[0]?.count || 0
    }

    return NextResponse.json({ counts }, { status: 200 })

  } catch (error) {
    console.error('Error fetching sidebar counts:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}