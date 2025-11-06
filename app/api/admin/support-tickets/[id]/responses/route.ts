import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { supportTicketResponses, supportTickets, auditLogs } from '@/db/schema'
import { getSession } from '@/lib/auth/getSession'
import { eq, desc } from 'drizzle-orm'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check if user is admin
    const session = await getSession()
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const ticketId = parseInt(id)
    if (isNaN(ticketId)) {
      return NextResponse.json({ error: 'Invalid ticket ID' }, { status: 400 })
    }

    // Fetch responses
    const responses = await db
      .select({
        id: supportTicketResponses.id,
        ticketId: supportTicketResponses.ticketId,
        responderType: supportTicketResponses.responderType,
        responderName: supportTicketResponses.responderName,
        responderEmail: supportTicketResponses.responderEmail,
        message: supportTicketResponses.message,
        isInternal: supportTicketResponses.isInternal,
        createdAt: supportTicketResponses.createdAt,
      })
      .from(supportTicketResponses)
      .where(eq(supportTicketResponses.ticketId, ticketId))
      .orderBy(supportTicketResponses.createdAt)

    return NextResponse.json({ responses }, { status: 200 })

  } catch (error) {
    console.error('Error fetching ticket responses:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}