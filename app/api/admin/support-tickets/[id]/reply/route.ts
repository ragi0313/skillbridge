import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { supportTicketResponses, supportTickets, auditLogs, users } from '@/db/schema'
import { getSession } from '@/lib/auth/getSession'
import { eq, sql } from 'drizzle-orm'
import { logSimpleAction } from '@/lib/admin/audit-log'
import { sendSupportTicketReply } from '@/lib/email/supportTicketMail'

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

    // Get ticket details for email
    const [ticketDetails] = await db
      .select({
        customerName: supportTickets.name,
        customerEmail: supportTickets.email,
        subject: supportTickets.subject,
      })
      .from(supportTickets)
      .where(eq(supportTickets.id, ticketId))

    // Log the action
    await logSimpleAction({
      userId: session.id,
      action: isInternal ? 'support_ticket_internal_note_added' : 'support_ticket_reply_sent',
      details: `${isInternal ? 'Internal note added to' : 'Reply sent to'} support ticket #${ticketId}`,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    })

    // Send email notification to customer if not internal
    if (!isInternal && ticketDetails) {
      try {
        await sendSupportTicketReply({
          ticketId,
          customerName: ticketDetails.customerName,
          customerEmail: ticketDetails.customerEmail,
          subject: ticketDetails.subject,
          adminName: `${adminUser.firstName} ${adminUser.lastName}`,
          adminReply: message.trim(),
        })
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError)
        // Don't fail the entire request if email fails
      }
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