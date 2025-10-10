import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { supportTickets, supportTicketResponses, auditLogs, users } from '@/db/schema'
import { getSession } from '@/lib/auth/getSession'
import { eq, and, sql } from 'drizzle-orm'
import { logSimpleAction } from '@/lib/admin/audit-log'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ticketId = parseInt(params.id)
    if (isNaN(ticketId)) {
      return NextResponse.json({ error: 'Invalid ticket ID' }, { status: 400 })
    }

    // Verify ticket belongs to user
    const [ticket] = await db
      .select()
      .from(supportTickets)
      .where(and(
        eq(supportTickets.id, ticketId),
        eq(supportTickets.userId, session.id)
      ))

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Fetch messages for this ticket (excluding internal notes)
    const messages = await db
      .select({
        id: supportTicketResponses.id,
        senderId: supportTicketResponses.responderId,
        senderType: supportTicketResponses.responderType,
        senderName: supportTicketResponses.responderName,
        content: supportTicketResponses.message,
        createdAt: supportTicketResponses.createdAt,
      })
      .from(supportTicketResponses)
      .where(and(
        eq(supportTicketResponses.ticketId, ticketId),
        eq(supportTicketResponses.isInternal, false)
      ))
      .orderBy(supportTicketResponses.createdAt)

    return NextResponse.json({ messages }, { status: 200 })

  } catch (error) {
    console.error('Error fetching support messages:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ticketId = parseInt(params.id)
    if (isNaN(ticketId)) {
      return NextResponse.json({ error: 'Invalid ticket ID' }, { status: 400 })
    }

    const { message } = await request.json()

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Verify ticket belongs to user and is not closed
    const [ticket] = await db
      .select()
      .from(supportTickets)
      .where(and(
        eq(supportTickets.id, ticketId),
        eq(supportTickets.userId, session.id)
      ))

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    if (ticket.status === 'closed') {
      return NextResponse.json({ error: 'Cannot reply to closed ticket' }, { status: 400 })
    }

    // Get user details
    const { firstName, lastName, email } = session

    // Insert user message
    const [response] = await db.insert(supportTicketResponses).values({
      ticketId,
      responderId: session.id,
      responderType: 'user',
      responderName: `${firstName} ${lastName}`,
      responderEmail: email,
      message: message.trim(),
      isInternal: false,
      createdAt: new Date(),
    }).returning()

    // Update ticket with response info
    await db
      .update(supportTickets)
      .set({
        lastResponseAt: new Date(),
        responseCount: sql`${supportTickets.responseCount} + 1`,
        status: 'in_progress', // Reopen if user responds
        updatedAt: new Date(),
      })
      .where(eq(supportTickets.id, ticketId))

    // Log the action
    await logSimpleAction({
      userId: session.id,
      action: 'support_ticket_user_reply',
      details: `User replied to support ticket #${ticketId}`,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Message sent successfully',
        response: {
          id: response.id,
          senderId: response.responderId,
          senderType: response.responderType,
          senderName: response.responderName,
          content: response.message,
          createdAt: response.createdAt,
        }
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('Error sending support message:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}