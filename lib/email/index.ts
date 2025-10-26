/**
 * Unified Email Service
 * Supports multiple email providers: SMTP, Resend
 * Automatically chooses the configured provider
 */

import { sendEmail as sendViaSMTP, sendBatchEmails as sendBatchViaSMTP, verifyEmailConnection as verifySMTP } from './smtp'
import { sendEmail as sendViaResend, sendBatchEmails as sendBatchViaResend } from './resend'
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
 * Determine which email provider to use
 */
function getEmailProvider(): 'smtp' | 'resend' | 'none' {
  const preferredProvider = process.env.EMAIL_PROVIDER?.toLowerCase()

  // If explicitly set, use that
  if (preferredProvider === 'smtp' || preferredProvider === 'resend') {
    return preferredProvider
  }

  // Auto-detect based on configuration
  const hasSMTP = !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASSWORD
  )

  const hasResend = !!process.env.RESEND_API_KEY

  if (hasSMTP) {
    logger.info('Using SMTP email provider (auto-detected)')
    return 'smtp'
  }

  if (hasResend) {
    logger.info('Using Resend email provider (auto-detected)')
    return 'resend'
  }

  logger.warn('No email provider configured')
  return 'none'
}

/**
 * Send email using configured provider
 */
export async function sendEmail(emailData: EmailData) {
  const provider = getEmailProvider()

  switch (provider) {
    case 'smtp':
      return sendViaSMTP(emailData)

    case 'resend':
      return sendViaResend(emailData)

    case 'none':
      logger.error('Cannot send email: No email provider configured')
      return {
        success: false,
        error: 'Email service not configured. Please set up SMTP or Resend.',
      }
  }
}

/**
 * Send batch emails using configured provider
 */
export async function sendBatchEmails(emails: EmailData[]) {
  const provider = getEmailProvider()

  switch (provider) {
    case 'smtp':
      return sendBatchViaSMTP(emails)

    case 'resend':
      return sendBatchViaResend(emails)

    case 'none':
      logger.error('Cannot send batch emails: No email provider configured')
      return {
        success: false,
        error: 'Email service not configured',
      }
  }
}

/**
 * Verify email connection
 */
export async function verifyEmailConnection() {
  const provider = getEmailProvider()

  switch (provider) {
    case 'smtp':
      return verifySMTP()

    case 'resend':
      // Resend doesn't have a verify method, assume it's working if API key exists
      return {
        success: !!process.env.RESEND_API_KEY,
        error: process.env.RESEND_API_KEY ? undefined : 'RESEND_API_KEY not set',
      }

    case 'none':
      return {
        success: false,
        error: 'No email provider configured',
      }
  }
}

/**
 * Get current email provider info
 */
export function getEmailProviderInfo() {
  const provider = getEmailProvider()

  return {
    provider,
    configured: provider !== 'none',
    details:
      provider === 'smtp'
        ? {
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            user: process.env.SMTP_USER,
            from: process.env.FROM_EMAIL || process.env.SMTP_USER,
          }
        : provider === 'resend'
        ? {
            apiKey: process.env.RESEND_API_KEY ? 'Set' : 'Not set',
            from: process.env.FROM_EMAIL,
          }
        : null,
  }
}
