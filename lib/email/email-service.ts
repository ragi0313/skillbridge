/**
 * Email service wrapper with queue support
 *
 * This module provides two ways to send emails:
 * 1. Queued (async, non-blocking) - Recommended for most use cases
 * 2. Direct (sync, blocking) - For critical emails that must be sent immediately
 */

import { EmailData, sendEmail as sendEmailDirect, sendBatchEmails as sendBatchEmailsDirect } from './resend'
import { queueEmail, queueBatchEmails } from '@/lib/queues/email-queue'
import { logger } from '@/lib/monitoring/logger'

export interface SendEmailOptions {
  /**
   * Send mode:
   * - 'queued' (default): Add to queue for async processing (non-blocking)
   * - 'direct': Send immediately (blocking)
   */
  mode?: 'queued' | 'direct'

  /**
   * Metadata for tracking
   */
  metadata?: {
    userId?: string
    action?: string
    [key: string]: any
  }
}

/**
 * Send email with queue support
 *
 * @param emailData - Email data (to, subject, html, etc.)
 * @param options - Send options (mode, metadata)
 *
 * @example
 * // Queued sending (non-blocking, recommended)
 * await sendEmail({
 *   to: 'user@example.com',
 *   subject: 'Welcome!',
 *   html: '<h1>Welcome to Skillbridge</h1>'
 * })
 *
 * @example
 * // Direct sending (blocking, for critical emails)
 * await sendEmail({
 *   to: 'user@example.com',
 *   subject: 'Password Reset',
 *   html: '<p>Your reset code: 123456</p>'
 * }, { mode: 'direct' })
 */
export async function sendEmail(
  emailData: EmailData,
  options: SendEmailOptions = {}
): Promise<{ success: boolean; jobId?: string; error?: string; data?: any }> {
  const { mode = 'queued', metadata } = options

  try {
    if (mode === 'direct') {
      // Direct send (blocking)
      logger.info('[EMAIL SERVICE] Sending email directly (blocking)', {
        to: emailData.to,
        subject: emailData.subject,
      })

      const result = await sendEmailDirect(emailData)
      return {
        success: result.success,
        error: result.error,
        data: result.data,
      }
    } else {
      // Queued send (non-blocking)
      logger.info('[EMAIL SERVICE] Queueing email (non-blocking)', {
        to: emailData.to,
        subject: emailData.subject,
        metadata,
      })

      const result = await queueEmail(emailData, metadata)
      return result
    }
  } catch (error: any) {
    logger.error('[EMAIL SERVICE] Failed to send email', {
      error: error.message,
      to: emailData.to,
      subject: emailData.subject,
      mode,
    })

    return {
      success: false,
      error: error.message || 'Failed to send email',
    }
  }
}

/**
 * Send batch emails with queue support
 *
 * @param emails - Array of email data
 * @param options - Send options (mode, metadata)
 */
export async function sendBatchEmails(
  emails: EmailData[],
  options: SendEmailOptions = {}
): Promise<{ success: boolean; jobId?: string; error?: string; data?: any }> {
  const { mode = 'queued', metadata } = options

  try {
    if (mode === 'direct') {
      // Direct send (blocking)
      logger.info('[EMAIL SERVICE] Sending batch emails directly (blocking)', {
        count: emails.length,
      })

      const result = await sendBatchEmailsDirect(emails)
      return {
        success: result.success,
        error: result.error,
        data: result.data,
      }
    } else {
      // Queued send (non-blocking)
      logger.info('[EMAIL SERVICE] Queueing batch emails (non-blocking)', {
        count: emails.length,
        metadata,
      })

      const result = await queueBatchEmails(emails, metadata)
      return result
    }
  } catch (error: any) {
    logger.error('[EMAIL SERVICE] Failed to send batch emails', {
      error: error.message,
      count: emails.length,
      mode,
    })

    return {
      success: false,
      error: error.message || 'Failed to send batch emails',
    }
  }
}

// Re-export EmailData type for convenience
export type { EmailData } from './resend'
