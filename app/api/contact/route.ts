import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { supportTickets, auditLogs } from '@/db/schema'
import { getSession } from '@/lib/auth/getSession'
import { withRateLimit } from '@/lib/middleware/rate-limit'
import { logSimpleAction } from '@/lib/admin/audit-log'

const rateLimitedPOST = withRateLimit('contact', async (request: NextRequest) => {
  try {
    const { name, email, category, subject, message, urgency } = await request.json()

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate category if provided
    const validCategories = ['general', 'technical', 'billing', 'partnership', 'feedback']
    if (category && !validCategories.includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category' },
        { status: 400 }
      )
    }

    // Validate urgency if provided
    const validUrgencies = ['low', 'medium', 'high', 'urgent']
    const mappedPriority = urgency ? urgency : 'medium'
    if (!validUrgencies.includes(mappedPriority)) {
      return NextResponse.json(
        { error: 'Invalid urgency level' },
        { status: 400 }
      )
    }

    // Get session if user is logged in
    const session = await getSession()
    const userId = session?.id || null

    // Insert support ticket into database
    const [ticket] = await db.insert(supportTickets).values({
      userId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      category: category || 'general',
      subject: subject?.trim() || 'Contact Form Submission',
      message: message.trim(),
      priority: mappedPriority,
      status: 'open',
      createdAt: new Date(),
    }).returning()

    // Log the action
    await logSimpleAction({
      userId: userId,
      action: 'contact_form_submission',
      details: `Contact form submitted by ${email} - Category: ${category || 'general'}`,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Your message has been sent successfully. We will get back to you soon.',
        ticketId: ticket.id
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('Error processing contact form:', error)
    return NextResponse.json(
      { error: 'Failed to send message. Please try again.' },
      { status: 500 }
    )
  }
})

export const POST = rateLimitedPOST