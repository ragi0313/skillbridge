import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSafeCache } from '@/lib/cache/redis-safe'

const CSRF_TOKEN_LENGTH = 32
const CSRF_TOKEN_EXPIRY = 60 * 60 * 1000 // 1 hour

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex')
}

/**
 * Store CSRF token in cache with expiry
 */
export async function storeCsrfToken(userId: number | string, token: string): Promise<void> {
  const cache = getSafeCache()
  const key = `csrf_token:${userId}`

  try {
    await cache.set(key, token, CSRF_TOKEN_EXPIRY)
  } catch (error) {
    console.error('Failed to store CSRF token:', error)
    throw new Error('Failed to generate CSRF protection')
  }
}

/**
 * Verify CSRF token from request
 */
export async function verifyCsrfToken(
  userId: number | string,
  token: string
): Promise<boolean> {
  if (!token || typeof token !== 'string') {
    return false
  }

  const cache = getSafeCache()
  const key = `csrf_token:${userId}`

  try {
    const storedToken = await cache.get(key)

    if (!storedToken) {
      return false
    }

    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(token),
      Buffer.from(storedToken)
    )
  } catch (error) {
    console.error('CSRF token verification error:', error)
    return false
  }
}

/**
 * Delete CSRF token after use (for one-time tokens)
 */
export async function deleteCsrfToken(userId: number | string): Promise<void> {
  const cache = getSafeCache()
  const key = `csrf_token:${userId}`

  try {
    await cache.del(key)
  } catch (error) {
    console.error('Failed to delete CSRF token:', error)
  }
}

/**
 * CSRF protection middleware for API routes
 */
export function withCsrfProtection(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>,
  options: {
    methods?: string[] // Methods to protect (default: POST, PUT, DELETE, PATCH)
    exemptPaths?: string[] // Paths to exempt from CSRF protection
  } = {}
) {
  const {
    methods = ['POST', 'PUT', 'DELETE', 'PATCH'],
    exemptPaths = []
  } = options

  return async function csrfProtectedHandler(
    req: NextRequest,
    context?: any
  ): Promise<NextResponse> {
    const method = req.method.toUpperCase()
    const pathname = new URL(req.url).pathname

    // Skip CSRF check for safe methods and exempt paths
    if (!methods.includes(method) || exemptPaths.includes(pathname)) {
      return handler(req, context)
    }

    // Get CSRF token from header
    const csrfToken = req.headers.get('x-csrf-token')

    if (!csrfToken) {
      return NextResponse.json(
        { error: 'CSRF token missing' },
        { status: 403 }
      )
    }

    // Get user ID from session cookie (you'll need to decode JWT)
    const sessionToken = req.cookies.get('session_token')?.value

    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Decode JWT to get user ID
    let userId: number
    try {
      const jwt = require('jsonwebtoken')
      const decoded = jwt.verify(sessionToken, process.env.JWT_SECRET!) as { id: number }
      userId = decoded.id
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      )
    }

    // Verify CSRF token
    const isValid = await verifyCsrfToken(userId, csrfToken)

    if (!isValid) {
      console.warn(`CSRF token validation failed for user ${userId}`)
      return NextResponse.json(
        { error: 'Invalid CSRF token' },
        { status: 403 }
      )
    }

    // Token is valid, proceed with request
    return handler(req, context)
  }
}

/**
 * Get or create CSRF token for a user
 */
export async function getCsrfToken(userId: number | string): Promise<string> {
  const cache = getSafeCache()
  const key = `csrf_token:${userId}`

  try {
    // Try to get existing token
    let token = await cache.get(key)

    if (token) {
      return token
    }

    // Generate new token if none exists
    token = generateCsrfToken()
    await storeCsrfToken(userId, token)

    return token
  } catch (error) {
    console.error('Failed to get CSRF token:', error)
    throw new Error('Failed to generate CSRF protection')
  }
}
