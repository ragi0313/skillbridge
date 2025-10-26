import nodemailer from 'nodemailer'
import { logger } from '@/lib/monitoring/logger'

export interface EmailData {
  from?: string
  to: string | string[]
  replyTo?: string
  subject: string
  html: string
  text?: string
}

/**
 * SMTP Email Service
 * Works with GoDaddy, Gmail, Outlook, or any SMTP provider
 */
class SMTPEmailService {
  private transporter: nodemailer.Transporter | null = null

  constructor() {
    this.initializeTransporter()
  }

  private initializeTransporter() {
    try {
      // Check required environment variables
      if (!process.env.SMTP_HOST || !process.env.SMTP_PORT || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
        logger.warn('SMTP not fully configured. Email sending will be disabled.')
        return
      }

      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT),
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
        // GoDaddy specific settings (optional, but helps)
        tls: {
          rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== 'false',
        },
      })

      logger.info('SMTP transporter initialized', {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: process.env.SMTP_SECURE === 'true',
      })
    } catch (error) {
      logger.error('Failed to initialize SMTP transporter', { error })
      this.transporter = null
    }
  }

  /**
   * Verify SMTP connection
   */
  async verifyConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.transporter) {
      return { success: false, error: 'SMTP transporter not initialized' }
    }

    try {
      await this.transporter.verify()
      logger.info('SMTP connection verified successfully')
      return { success: true }
    } catch (error: any) {
      logger.error('SMTP connection verification failed', { error: error.message })
      return { success: false, error: error.message }
    }
  }

  /**
   * Send email via SMTP
   */
  async sendEmail(emailData: EmailData): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!this.transporter) {
      logger.error('Cannot send email: SMTP transporter not initialized')
      return { success: false, error: 'Email service not configured' }
    }

    try {
      // Use configured FROM_EMAIL or SMTP_USER if not provided
      const from = emailData.from || process.env.FROM_EMAIL || process.env.SMTP_USER

      if (!from) {
        logger.error('FROM email address not configured')
        return { success: false, error: 'Sender email not configured' }
      }

      // Email override for development/testing
      let finalTo = emailData.to
      let finalSubject = emailData.subject

      if (process.env.NODE_ENV === 'development' && process.env.EMAIL_OVERRIDE_ADDRESS) {
        logger.info(`[EMAIL_OVERRIDE] Redirecting email from ${emailData.to} to ${process.env.EMAIL_OVERRIDE_ADDRESS}`)
        finalTo = process.env.EMAIL_OVERRIDE_ADDRESS
        finalSubject = `[DEV - Originally for: ${emailData.to}] ${emailData.subject}`
      }

      const info = await this.transporter.sendMail({
        from,
        to: finalTo,
        replyTo: emailData.replyTo,
        subject: finalSubject,
        html: emailData.html,
        text: emailData.text || this.htmlToText(emailData.html),
      })

      logger.info('Email sent successfully via SMTP', {
        to: emailData.to,
        subject: emailData.subject,
        messageId: info.messageId,
      })

      return { success: true, data: { messageId: info.messageId } }
    } catch (error: any) {
      logger.error('Failed to send email via SMTP', {
        error: error.message,
        to: emailData.to,
        subject: emailData.subject,
      })

      return {
        success: false,
        error: error.message || 'Failed to send email',
      }
    }
  }

  /**
   * Send batch emails via SMTP
   */
  async sendBatchEmails(emails: EmailData[]): Promise<{ success: boolean; results?: any[]; error?: string }> {
    if (!this.transporter) {
      return { success: false, error: 'Email service not configured' }
    }

    const results = []

    for (const email of emails) {
      const result = await this.sendEmail(email)
      results.push({
        to: email.to,
        success: result.success,
        error: result.error,
      })
    }

    const successCount = results.filter(r => r.success).length
    logger.info('Batch emails sent via SMTP', {
      total: emails.length,
      success: successCount,
      failed: emails.length - successCount,
    })

    return {
      success: successCount > 0,
      results,
    }
  }

  /**
   * Simple HTML to text conversion
   */
  private htmlToText(html: string): string {
    return html
      .replace(/<style[^>]*>.*<\/style>/gi, '')
      .replace(/<script[^>]*>.*<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }
}

// Export singleton instance
export const smtpEmailService = new SMTPEmailService()

// Export convenience functions
export async function sendEmail(emailData: EmailData) {
  return smtpEmailService.sendEmail(emailData)
}

export async function sendBatchEmails(emails: EmailData[]) {
  return smtpEmailService.sendBatchEmails(emails)
}

export async function verifyEmailConnection() {
  return smtpEmailService.verifyConnection()
}
