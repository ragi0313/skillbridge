import { NextRequest, NextResponse } from 'next/server'
import { getSafeCache } from '@/lib/cache/redis-safe'
import jwt from 'jsonwebtoken'

interface UserRateLimitConfig {
  windowMs: number
  maxRequests: number
  message?: string
  bypassForAdmin?: boolean
}

interface RateLimitEntry {
  count: number
  resetTime: number
  userId?: number
}

/**
 * User-based rate limiting (in addition to IP-based)
 * This prevents abuse from distributed attacks using the same account
 */
export function createUserRateLimit(config: UserRateLimitConfig) {
  const {
    windowMs,
    maxRequests,
    message = 'Too many requests from this account. Please try again later.',
    bypassForAdmin = false
  } = config

  const cache = getSafeCache()

  return async function userRateLimitMiddleware(
    req: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    // Extract user ID from session token
    const sessionToken = req.cookies.get('session_token')?.value

    if (!sessionToken) {
      // No session, just proceed (IP rate limiting should still apply)
      return handler(req)
    }

    let userId: number
    let userRole: string = 'user'

    try {
      const decoded = jwt.verify(sessionToken, process.env.JWT_SECRET!) as {
        id: number
        role: string
      }
      userId = decoded.id
      userRole = decoded.role || 'user'
    } catch (error) {
      // Invalid token, proceed without user rate limiting
      return handler(req)
    }

    // Bypass for admins if configured
    if (bypassForAdmin && userRole === 'admin') {
      return handler(req)
    }

    const key = `user_rate_limit:${userId}:${new URL(req.url).pathname}`
    const now = Date.now()

    try {
      // Get current entry
      const entryJson = await cache.get(key)
      let entry: RateLimitEntry

      if (entryJson) {
        entry = JSON.parse(entryJson)

        // Check if window has expired
        if (entry.resetTime < now) {
          entry = {
            count: 0,
            resetTime: now + windowMs,
            userId
          }
        }
      } else {
        entry = {
          count: 0,
          resetTime: now + windowMs,
          userId
        }
      }

      // Check if limit exceeded
      if (entry.count >= maxRequests) {
        const retryAfter = Math.ceil((entry.resetTime - now) / 1000)

        console.warn(`[SECURITY] User rate limit exceeded for user ${userId}`, {
          pathname: new URL(req.url).pathname,
          count: entry.count,
          maxRequests
        })

        return NextResponse.json(
          {
            error: message,
            retryAfter
          },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': maxRequests.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': entry.resetTime.toString(),
              'Retry-After': retryAfter.toString()
            }
          }
        )
      }

      // Increment counter
      entry.count++
      await cache.set(key, JSON.stringify(entry), entry.resetTime - now)

      // Execute handler
      const response = await handler(req)

      // Add headers
      const remaining = Math.max(0, maxRequests - entry.count)
      response.headers.set('X-RateLimit-Limit', maxRequests.toString())
      response.headers.set('X-RateLimit-Remaining', remaining.toString())
      response.headers.set('X-RateLimit-Reset', entry.resetTime.toString())

      return response
    } catch (error) {
      console.error('User rate limit error:', error)
      // If cache fails, proceed without rate limiting
      return handler(req)
    }
  }
}

/**
 * Combined IP and User rate limiting
 */
export function withCombinedRateLimit(
  ipRateLimit: (req: NextRequest, handler: (req: NextRequest) => Promise<NextResponse>) => Promise<NextResponse>,
  userRateLimit: (req: NextRequest, handler: (req: NextRequest) => Promise<NextResponse>) => Promise<NextResponse>
) {
  return async function combinedRateLimitHandler(
    req: NextRequest,
    context?: any
  ): Promise<NextResponse> {
    // First check IP rate limit
    return ipRateLimit(req, async (req) => {
      // Then check user rate limit
      return userRateLimit(req, async (req) => {
        // Both passed, return success (handler will be called elsewhere)
        return NextResponse.next()
      })
    })
  }
}

/**
 * Predefined user rate limit configurations
 */
export const userRateLimitConfigs = {
  // Strict for authentication operations per user
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10, // 10 login attempts per 15 minutes per account
    message: 'Too many authentication attempts from this account.'
  },

  // Moderate for booking operations per user
  booking: {
    windowMs: 10 * 60 * 1000, // 10 minutes
    maxRequests: 20, // 20 booking operations per 10 minutes per user
    message: 'Too many booking requests from this account.'
  },

  // Lenient for general API calls per user
  api: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 100, // 100 requests per 5 minutes per user
    message: 'Too many API requests from this account.',
    bypassForAdmin: true
  },

  // Very strict for file uploads per user
  upload: {
    windowMs: 30 * 60 * 1000, // 30 minutes
    maxRequests: 10, // 10 uploads per 30 minutes per user
    message: 'Upload limit exceeded for this account.'
  },

  // Strict for payment operations per user
  payment: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 5, // 5 payment operations per hour per user
    message: 'Too many payment requests from this account.'
  }
}

// Helper functions to create user rate limiters
export const createUserAuthRateLimit = () => createUserRateLimit(userRateLimitConfigs.auth)
export const createUserBookingRateLimit = () => createUserRateLimit(userRateLimitConfigs.booking)
export const createUserApiRateLimit = () => createUserRateLimit(userRateLimitConfigs.api)
export const createUserUploadRateLimit = () => createUserRateLimit(userRateLimitConfigs.upload)
export const createUserPaymentRateLimit = () => createUserRateLimit(userRateLimitConfigs.payment)
