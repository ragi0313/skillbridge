/**
 * Email Override for Development
 *
 * When in development mode, all emails are redirected to a test address
 * This allows testing email functionality without spamming real users
 */

export const getEmailRecipient = (originalEmail: string): string => {
  // In development, override all emails to go to test address
  if (process.env.NODE_ENV === 'development') {
    console.log(`[EMAIL_OVERRIDE] Redirecting ${originalEmail} → delivered@resend.dev`)
    return 'delivered@resend.dev' // Resend test address
  }

  return originalEmail
}

/**
 * Check if we should actually send emails
 */
export const shouldSendEmail = (): boolean => {
  // Always send in production
  if (process.env.NODE_ENV === 'production') {
    return true
  }

  // In development, check if email override is disabled
  const disableOverride = process.env.DISABLE_EMAIL_OVERRIDE === 'true'

  if (disableOverride) {
    console.warn('[EMAIL] Email override disabled - sending to real addresses in development')
  }

  return true
}

/**
 * Add development notice to email subject
 */
export const getEmailSubject = (originalSubject: string): string => {
  if (process.env.NODE_ENV === 'development') {
    return `[DEV] ${originalSubject}`
  }

  return originalSubject
}
