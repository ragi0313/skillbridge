import { NextRequest, NextResponse } from 'next/server'
import { withRateLimit } from '@/lib/middleware/rate-limit'
import { db } from '@/db'
import { supportTickets } from '@/db/schema'
import { getSession } from '@/lib/auth/getSession'

const rateLimitedPOST = withRateLimit('contact', async (request: NextRequest) => {
  try {
    const { name, email, subject, message, category, urgency } = await request.json()

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

    // Get user session to check if user is authenticated
    const session = await getSession()

    // Create support ticket
    try {
      const [ticket] = await db.insert(supportTickets).values({
        userId: session?.id || null,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        category: category || 'general',
        subject: subject?.trim() || 'Contact Form Submission',
        message: message.trim(),
        priority: urgency || 'medium',
        status: 'open',
        responseCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning()

      return NextResponse.json(
        {
          success: true,
          message: 'Your message has been received! Our support team will respond to your registered email shortly.',
          ticketId: ticket.id,
        },
        { status: 201 }
      )
    } catch (dbError) {
      console.error('Failed to create support ticket:', dbError)
      return NextResponse.json(
        { error: 'Failed to submit message. Please try again later.' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error processing contact form:', error)
    return NextResponse.json(
      { error: 'Failed to send message. Please try again.' },
      { status: 500 }
    )
  }
})

export const POST = rateLimitedPOST