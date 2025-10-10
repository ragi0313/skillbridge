import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth/getSession"
import { db } from "@/db"
import { supportTickets, supportTicketResponses, users } from "@/db/schema"
import { eq, desc, count, sql } from "drizzle-orm"
import { withRateLimit } from "@/lib/middleware/rate-limit"

// GET - Fetch user's support tickets
const rateLimitedGET = withRateLimit('api', async (request: NextRequest) => {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch tickets with response count
    const ticketsResult = await db
      .select({
        id: supportTickets.id,
        subject: supportTickets.subject,
        category: supportTickets.category,
        priority: supportTickets.priority,
        status: supportTickets.status,
        description: supportTickets.message,
        createdAt: supportTickets.createdAt,
        updatedAt: supportTickets.updatedAt,
        responseCount: sql<number>`COALESCE(COUNT(${supportTicketResponses.id}), 0)`
      })
      .from(supportTickets)
      .leftJoin(supportTicketResponses, eq(supportTickets.id, supportTicketResponses.ticketId))
      .where(eq(supportTickets.userId, session.id))
      .groupBy(supportTickets.id)
      .orderBy(desc(supportTickets.updatedAt))

    // Get last response times
    const ticketsWithLastResponse = await Promise.all(
      ticketsResult.map(async (ticket) => {
        const lastResponse = await db
          .select({ createdAt: supportTicketResponses.createdAt })
          .from(supportTicketResponses)
          .where(eq(supportTicketResponses.ticketId, ticket.id))
          .orderBy(desc(supportTicketResponses.createdAt))
          .limit(1)

        return {
          ...ticket,
          lastResponseAt: lastResponse[0]?.createdAt?.toISOString() || null,
          createdAt: ticket.createdAt.toISOString(),
          updatedAt: ticket.updatedAt.toISOString()
        }
      })
    )

    return NextResponse.json({ tickets: ticketsWithLastResponse })
  } catch (error) {
    console.error('Error fetching support tickets:', error)
    return NextResponse.json(
      { error: 'Failed to fetch support tickets' },
      { status: 500 }
    )
  }
})

// POST - Create new support ticket
const rateLimitedPOST = withRateLimit('api', async (request: NextRequest) => {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { subject, category, priority = 'medium', description } = body

    if (!subject || !category || !description) {
      return NextResponse.json(
        { error: 'Subject, category, and description are required' },
        { status: 400 }
      )
    }

    // Validate category
    const validCategories = ['technical', 'billing', 'account', 'sessions', 'safety', 'feature', 'general']
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category' },
        { status: 400 }
      )
    }

    // Validate priority
    const validPriorities = ['low', 'medium', 'high', 'critical']
    if (!validPriorities.includes(priority)) {
      return NextResponse.json(
        { error: 'Invalid priority' },
        { status: 400 }
      )
    }

    // Create ticket
    const newTicket = await db.insert(supportTickets)
      .values({
        userId: session.id,
        name: `${session.firstName} ${session.lastName}`,
        email: session.email,
        subject: subject.trim(),
        category,
        priority,
        status: 'open',
        message: description.trim()
      })
      .returning()

    // Return ticket with formatted dates
    const ticket = {
      ...newTicket[0],
      description: newTicket[0].message,
      responseCount: 0,
      lastResponseAt: null,
      createdAt: newTicket[0].createdAt.toISOString(),
      updatedAt: newTicket[0].updatedAt.toISOString()
    }

    return NextResponse.json({ ticket }, { status: 201 })
  } catch (error) {
    console.error('Error creating support ticket:', error)
    return NextResponse.json(
      { error: 'Failed to create support ticket' },
      { status: 500 }
    )
  }
})

export const GET = rateLimitedGET
export const POST = rateLimitedPOST