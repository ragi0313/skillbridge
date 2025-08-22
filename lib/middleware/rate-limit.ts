import { NextRequest, NextResponse } from "next/server"

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  skipSuccessfulRequests?: boolean // Don't count successful requests
  skipFailedRequests?: boolean // Don't count failed requests
  keyGenerator?: (req: NextRequest) => string // Custom key generator
  onLimitReached?: (req: NextRequest) => void // Callback when limit is reached
  message?: string // Custom error message
}

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

// Simple in-memory store (in production, use Redis or similar)
const store: RateLimitStore = {}

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  Object.keys(store).forEach(key => {
    if (store[key].resetTime < now) {
      delete store[key]
    }
  })
}, 5 * 60 * 1000)

export function createRateLimit(config: RateLimitConfig) {
  const {
    windowMs,
    maxRequests,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    keyGenerator = defaultKeyGenerator,
    onLimitReached,
    message = "Too many requests, please try again later."
  } = config

  return async function rateLimitMiddleware(
    req: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    const key = keyGenerator(req)
    const now = Date.now()
    const windowStart = now - windowMs

    // Initialize or get existing entry
    if (!store[key] || store[key].resetTime < now) {
      store[key] = {
        count: 0,
        resetTime: now + windowMs
      }
    }

    const entry = store[key]

    // Check if limit is exceeded
    if (entry.count >= maxRequests) {
      onLimitReached?.(req)
      
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000)
      
      return NextResponse.json(
        { 
          error: message,
          retryAfter: retryAfter
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

    // Increment counter before executing handler (unless configured otherwise)
    if (!skipSuccessfulRequests && !skipFailedRequests) {
      entry.count++
    }

    try {
      const response = await handler(req)
      
      // Handle conditional counting
      if (skipSuccessfulRequests && response.status < 400) {
        entry.count--
      } else if (skipFailedRequests && response.status >= 400) {
        entry.count--
      }

      // Add rate limit headers to response
      const remaining = Math.max(0, maxRequests - entry.count)
      response.headers.set('X-RateLimit-Limit', maxRequests.toString())
      response.headers.set('X-RateLimit-Remaining', remaining.toString())
      response.headers.set('X-RateLimit-Reset', entry.resetTime.toString())

      return response
    } catch (error) {
      // If handler throws, decide whether to count this request
      if (skipFailedRequests) {
        entry.count--
      }
      throw error
    }
  }
}

function defaultKeyGenerator(req: NextRequest): string {
  // Try to get IP from various headers (for deployment behind proxies)
  const forwarded = req.headers.get('x-forwarded-for')
  const realIp = req.headers.get('x-real-ip')
  const cfConnectingIp = req.headers.get('cf-connecting-ip')
  
  const ip = forwarded?.split(',')[0] || realIp || cfConnectingIp || 'unknown'
  const userAgent = req.headers.get('user-agent') || 'unknown'
  
  // Include pathname to allow different limits for different endpoints
  const pathname = new URL(req.url).pathname
  
  return `${ip}:${pathname}:${userAgent.slice(0, 50)}`
}

// Predefined rate limit configurations
export const rateLimitConfigs = {
  // Very strict for auth endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per 15 minutes
    message: "Too many authentication attempts. Please try again in 15 minutes."
  },
  
  // Strict for password reset
  passwordReset: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3, // 3 attempts per hour
    message: "Too many password reset attempts. Please try again in 1 hour."
  },

  // Moderate for API endpoints
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // 100 requests per 15 minutes
    message: "API rate limit exceeded. Please slow down."
  },

  // Lenient for general endpoints
  general: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 200, // 200 requests per 15 minutes
    message: "Rate limit exceeded. Please try again later."
  },

  // Very strict for file uploads
  upload: {
    windowMs: 10 * 60 * 1000, // 10 minutes
    maxRequests: 5, // 5 uploads per 10 minutes
    message: "Upload rate limit exceeded. Please wait before uploading again."
  },

  // Strict for booking/payment endpoints
  booking: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 10, // 10 booking attempts per 5 minutes
    message: "Too many booking attempts. Please wait a moment."
  },

  // Very strict for admin operations
  admin: {
    windowMs: 10 * 60 * 1000, // 10 minutes
    maxRequests: 50, // 50 admin operations per 10 minutes
    message: "Admin operation rate limit exceeded."
  }
}

// Helper function to create rate limiters with predefined configs
export const createAuthRateLimit = () => createRateLimit(rateLimitConfigs.auth)
export const createPasswordResetRateLimit = () => createRateLimit(rateLimitConfigs.passwordReset)
export const createApiRateLimit = () => createRateLimit(rateLimitConfigs.api)
export const createGeneralRateLimit = () => createRateLimit(rateLimitConfigs.general)
export const createUploadRateLimit = () => createRateLimit(rateLimitConfigs.upload)
export const createBookingRateLimit = () => createRateLimit(rateLimitConfigs.booking)
export const createAdminRateLimit = () => createRateLimit(rateLimitConfigs.admin)

// Wrapper function to easily apply rate limiting to API routes
export function withRateLimit(
  config: RateLimitConfig | keyof typeof rateLimitConfigs,
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  const rateLimit = typeof config === 'string' 
    ? createRateLimit(rateLimitConfigs[config])
    : createRateLimit(config)

  return async function(req: NextRequest): Promise<NextResponse> {
    return rateLimit(req, handler)
  }
}