import { sendEmail } from './email-service'

interface SupportTicketReplyData {
  ticketId: number
  customerName: string
  customerEmail: string
  subject: string
  adminName: string
  adminReply: string
  ticketUrl?: string
}

/**
 * Send support ticket reply notification to customer
 */
export async function sendSupportTicketReply(data: SupportTicketReplyData) {
  const {
    ticketId,
    customerName,
    customerEmail,
    subject,
    adminName,
    adminReply,
    ticketUrl,
  } = data

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://bridgementor.vercel.app'
  const ticketLink = ticketUrl || `${baseUrl}/support`

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Support Ticket Reply</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
      <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Support Team Reply</h1>
          <p style="margin: 10px 0 0; color: #ffffff; font-size: 14px; opacity: 0.9;">
            Ticket #${ticketId}
          </p>
        </div>

        <!-- Content -->
        <div style="padding: 40px 30px;">
          <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
            Hello <strong>${customerName}</strong>,
          </p>

          <p style="margin: 0 0 20px; color: #666666; font-size: 15px; line-height: 1.6;">
            Our support team has replied to your ticket regarding: <strong>${subject}</strong>
          </p>

          <!-- Admin Reply Box -->
          <div style="background-color: #f8f9ff; border-left: 4px solid #667eea; padding: 20px; margin: 30px 0; border-radius: 6px;">
            <p style="margin: 0 0 10px; color: #667eea; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
              ${adminName} replied:
            </p>
            <p style="margin: 0; color: #333333; font-size: 15px; line-height: 1.7; white-space: pre-wrap;">
              ${adminReply}
            </p>
          </div>

          <p style="margin: 30px 0 20px; color: #666666; font-size: 15px; line-height: 1.6;">
            If you have any additional questions, please feel free to reply to this email or visit your support ticket.
          </p>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 35px 0;">
            <a href="${ticketLink}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 10px rgba(102, 126, 234, 0.3); transition: transform 0.2s;">
              View Ticket
            </a>
          </div>

          <!-- Footer Note -->
          <div style="margin-top: 40px; padding-top: 25px; border-top: 1px solid #e0e0e0;">
            <p style="margin: 0; color: #999999; font-size: 13px; line-height: 1.6; text-align: center;">
              This is an automated notification from BridgeMentor Support.<br>
              Please do not reply directly to this email.
            </p>
          </div>
        </div>

        <!-- Brand Footer -->
        <div style="background-color: #f8f9fa; padding: 25px; text-align: center; border-top: 1px solid #e0e0e0;">
          <p style="margin: 0 0 10px; color: #667eea; font-size: 18px; font-weight: bold;">
            BridgeMentor
          </p>
          <p style="margin: 0; color: #999999; font-size: 12px;">
            Connecting learners with expert mentors
          </p>
        </div>
      </div>
    </body>
    </html>
  `

  const text = `
    Hello ${customerName},

    Our support team has replied to your ticket regarding: ${subject}

    ${adminName} replied:
    ${adminReply}

    If you have any additional questions, please visit your support ticket at: ${ticketLink}

    Best regards,
    BridgeMentor Support Team
  `

  return sendEmail({
    to: customerEmail,
    subject: `Re: ${subject} [Ticket #${ticketId}]`,
    html,
    text,
  })
}
