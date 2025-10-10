import { NextResponse } from 'next/server'

/**
 * Comprehensive security headers configuration
 */
export const SECURITY_HEADERS = {
  // Prevent clickjacking attacks
  'X-Frame-Options': 'DENY',

  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',

  // Enable browser XSS protection
  'X-XSS-Protection': '1; mode=block',

  // Referrer policy for privacy
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Disable potentially dangerous features
  'Permissions-Policy':
    'geolocation=(), ' +
    'microphone=(), ' +
    'camera=(), ' +
    'payment=(), ' +
    'usb=(), ' +
    'magnetometer=(), ' +
    'gyroscope=(), ' +
    'accelerometer=()',

  // Strict Transport Security (HSTS) - enforce HTTPS
  // Note: Only set in production with HTTPS enabled
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

  // Content Security Policy (CSP)
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com", // For Next.js and external libs
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", // For styled-components and Google Fonts
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: https: blob:", // Allow images from HTTPS sources
    "media-src 'self' https: blob:", // For video/audio
    "connect-src 'self' https://api.agora.io https://*.agora.io https://api.xendit.co wss:", // API endpoints and WebSocket
    "frame-src 'self' https://checkout.xendit.co", // For payment iframes
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ].join('; ')
} as const

/**
 * Apply security headers to response
 */
export function applySecurityHeaders(response: NextResponse): NextResponse {
  // Only add HSTS in production with HTTPS
  const isProduction = process.env.NODE_ENV === 'production'
  const isHttps = process.env.NEXT_PUBLIC_APP_URL?.startsWith('https://')

  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    // Skip HSTS in development or non-HTTPS environments
    if (key === 'Strict-Transport-Security' && (!isProduction || !isHttps)) {
      return
    }

    response.headers.set(key, value)
  })

  return response
}

/**
 * Create a response with security headers
 */
export function createSecureResponse(
  data: any,
  options: {
    status?: number
    headers?: Record<string, string>
  } = {}
): NextResponse {
  const response = NextResponse.json(data, {
    status: options.status || 200,
    headers: options.headers
  })

  return applySecurityHeaders(response)
}

/**
 * Security headers for API routes that handle sensitive operations
 */
export const SENSITIVE_OPERATION_HEADERS = {
  ...SECURITY_HEADERS,
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  'Pragma': 'no-cache',
  'Expires': '0'
} as const

/**
 * Apply headers for sensitive operations (auth, payments, etc.)
 */
export function applySensitiveHeaders(response: NextResponse): NextResponse {
  applySecurityHeaders(response)

  // Add no-cache headers
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  response.headers.set('Pragma', 'no-cache')
  response.headers.set('Expires', '0')

  return response
}
