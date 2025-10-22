import { NextRequest, NextResponse } from 'next/server'
import { withRateLimit } from '@/lib/middleware/rate-limit'
import { sendContactFormNotification } from '@/lib/email/userActionsMail'

const rateLimitedPOST = withRateLimit('contact', async (request: NextRequest) => {
  try {
    const { name, email, subject, message } = await request.json()

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

    // Send email notification
    try {
      await sendContactFormNotification({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        subject: subject?.trim() || 'Contact Form Submission',
        message: message.trim(),
      })
    } catch (emailError) {
      console.error('Failed to send contact form notification email:', emailError)
      return NextResponse.json(
        { error: 'Failed to send message. Please try again later.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Your message has been sent successfully. We will get back to you soon.',
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