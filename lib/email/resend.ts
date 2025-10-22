import { Resend } from "resend"
import { logger } from "@/lib/monitoring/logger"

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY)

export interface EmailData {
  from?: string
  to: string | string[]
  replyTo?: string
  subject: string
  html: string
  text?: string
}

/**
 * Send email using Resend
 */
export async function sendEmail(emailData: EmailData) {
  try {
    // Validate API key
    if (!process.env.RESEND_API_KEY) {
      logger.error("RESEND_API_KEY is not configured")
      return { success: false, error: "Email service not configured" }
    }

    // Validate FROM_EMAIL
    if (!process.env.FROM_EMAIL) {
      logger.error("FROM_EMAIL is not configured")
      return { success: false, error: "Sender email not configured" }
    }

    // Use configured FROM_EMAIL if not provided
    const from = emailData.from || process.env.FROM_EMAIL

    const data = await resend.emails.send({
      from,
      to: emailData.to,
      replyTo: emailData.replyTo,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
    })

    logger.info("Email sent successfully via Resend", {
      to: emailData.to,
      subject: emailData.subject,
      emailId: data.id
    })

    return { success: true, data }
  } catch (error: any) {
    logger.error("Failed to send email via Resend", {
      error: error?.message,
      to: emailData.to,
      subject: emailData.subject
    })

    return {
      success: false,
      error: error?.message || "Failed to send email"
    }
  }
}

/**
 * Send batch emails using Resend
 * Useful for sending multiple emails at once
 */
export async function sendBatchEmails(emails: EmailData[]) {
  try {
    if (!process.env.RESEND_API_KEY) {
      logger.error("RESEND_API_KEY is not configured")
      return { success: false, error: "Email service not configured" }
    }

    if (!process.env.FROM_EMAIL) {
      logger.error("FROM_EMAIL is not configured")
      return { success: false, error: "Sender email not configured" }
    }

    const emailsWithFrom = emails.map(email => ({
      ...email,
      from: email.from || process.env.FROM_EMAIL!,
    }))

    const data = await resend.batch.send(emailsWithFrom)

    logger.info("Batch emails sent successfully via Resend", {
      count: emails.length
    })

    return { success: true, data }
  } catch (error: any) {
    logger.error("Failed to send batch emails via Resend", {
      error: error?.message,
      count: emails.length
    })

    return {
      success: false,
      error: error?.message || "Failed to send batch emails"
    }
  }
}
