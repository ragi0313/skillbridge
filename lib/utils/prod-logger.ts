/**
 * Production-safe logger
 * Conditionally logs based on environment
 */

const isDevelopment = process.env.NODE_ENV === 'development'

export const prodLogger = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args)
    }
  },

  error: (...args: any[]) => {
    // Always log errors, but sanitize in production
    if (isDevelopment) {
      console.error(...args)
    } else {
      // In production, log to external service or just the message
      console.error('An error occurred')
    }
  },

  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args)
    }
  },

  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug(...args)
    }
  },

  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args)
    }
  }
}
