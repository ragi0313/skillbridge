import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { supportTickets, auditLogs } from '@/db/schema'
import { getSession } from '@/lib/auth/getSession'
import { eq } from 'drizzle-orm'
import { logSimpleAction } from '@/lib/admin/audit-log'

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

    // Fetch ticket
    const [ticket] = await db
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.id, ticketId))

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    return NextResponse.json({ ticket }, { status: 200 })

  } catch (error) {
    console.error('Error fetching support ticket:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
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

    const { status, assignedTo, adminNotes } = await request.json()

    // Prepare update data
    const updateData: any = {}

    if (status) {
      updateData.status = status
      if (status === 'resolved') {
        updateData.resolvedAt = new Date()
      } else if (status === 'closed') {
        updateData.closedAt = new Date()
      }
    }

    if (assignedTo !== undefined) {
      updateData.assignedTo = assignedTo
    }

    if (adminNotes !== undefined) {
      updateData.adminNotes = adminNotes
    }

    updateData.updatedAt = new Date()

    // Update ticket
    const [updatedTicket] = await db
      .update(supportTickets)
      .set(updateData)
      .where(eq(supportTickets.id, ticketId))
      .returning()

    if (!updatedTicket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Log the action
    await logSimpleAction({
      userId: session.id,
      action: 'support_ticket_updated',
      details: `Support ticket #${ticketId} updated - Status: ${status || 'unchanged'}`,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Ticket updated successfully',
        ticket: updatedTicket
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error updating support ticket:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}