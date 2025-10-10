import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { supportTicketResponses, supportTickets, auditLogs, users } from '@/db/schema'
import { getSession } from '@/lib/auth/getSession'
import { eq, sql } from 'drizzle-orm'
import { logSimpleAction } from '@/lib/admin/audit-log'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if user is admin
    const session = await getSession()
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ticketId = parseInt(params.id)
    if (isNaN(ticketId)) {
      return NextResponse.json({ error: 'Invalid ticket ID' }, { status: 400 })
    }

    const { message, isInternal = false } = await request.json()

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Get admin user details
    const [adminUser] = await db
      .select({
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email
      })
      .from(users)
      .where(eq(users.id, session.id))

    if (!adminUser) {
      return NextResponse.json({ error: 'Admin user not found' }, { status: 404 })
    }

    // Insert response
    const [response] = await db.insert(supportTicketResponses).values({
      ticketId,
      responderId: session.id,
      responderType: 'admin',
      responderName: `${adminUser.firstName} ${adminUser.lastName}`,
      responderEmail: adminUser.email,
      message: message.trim(),
      isInternal,
      createdAt: new Date(),
    }).returning()

    // Update ticket with response info
    const updateData: any = {
      lastResponseAt: new Date(),
      responseCount: sql`${supportTickets.responseCount} + 1`,
      updatedAt: new Date(),
    }

    if (!isInternal) {
      updateData.status = 'in_progress' // Only change status for public replies
    }

    await db
      .update(supportTickets)
      .set(updateData)
      .where(eq(supportTickets.id, ticketId))

    // Log the action
    await logSimpleAction({
      userId: session.id,
      action: isInternal ? 'support_ticket_internal_note_added' : 'support_ticket_reply_sent',
      details: `${isInternal ? 'Internal note added to' : 'Reply sent to'} support ticket #${ticketId}`,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    })

    // TODO: Send email notification to customer if not internal
    if (!isInternal) {
      // Here you would integrate with your email service (e.g., SendGrid, AWS SES)
      // to send the reply to the customer's email address
      }

    return NextResponse.json(
      {
        success: true,
        message: isInternal ? 'Internal note added successfully' : 'Reply sent successfully',
        response
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error sending ticket reply:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}