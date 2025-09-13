import { NextRequest } from 'next/server'

interface RateLimitEntry {
  count: number
  resetTime: number
}

// Simple in-memory rate limiter for cron endpoints
class CronRateLimiter {
  private requests = new Map<string, RateLimitEntry>()
  private readonly maxRequests = 10 // Max requests per window
  private readonly windowMs = 60 * 1000 // 1 minute window

  private getClientId(request: NextRequest): string {
    // Use IP address and User-Agent as identifier
    const ip = request.ip || 
               request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'
    return `${ip}-${userAgent.slice(0, 50)}`
  }

  private cleanupExpired(): void {
    const now = Date.now()
    for (const [key, entry] of this.requests.entries()) {
      if (now > entry.resetTime) {
        this.requests.delete(key)
      }
    }
  }

  isRateLimited(request: NextRequest): { 
    isLimited: boolean
    remaining: number
    resetTime: number
  } {
    this.cleanupExpired()
    
    const clientId = this.getClientId(request)
    const now = Date.now()
    const entry = this.requests.get(clientId)

    if (!entry || now > entry.resetTime) {
      // First request or window expired, reset
      this.requests.set(clientId, {
        count: 1,
        resetTime: now + this.windowMs
      })
      return {
        isLimited: false,
        remaining: this.maxRequests - 1,
        resetTime: now + this.windowMs
      }
    }

    entry.count++
    
    return {
      isLimited: entry.count > this.maxRequests,
      remaining: Math.max(0, this.maxRequests - entry.count),
      resetTime: entry.resetTime
    }
  }
}

export const cronRateLimiter = new CronRateLimiter()

export function validateCronAuth(request: NextRequest): {
  isValid: boolean
  error?: string
} {
  // Check rate limit first
  const rateLimit = cronRateLimiter.isRateLimited(request)
  if (rateLimit.isLimited) {
    return {
      isValid: false,
      error: `Rate limit exceeded. Try again after ${new Date(rateLimit.resetTime).toISOString()}`
    }
  }

  // Check authentication
  const authHeader = request.headers.get('authorization')
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`
  
  if (process.env.NODE_ENV === 'production') {
    if (!authHeader || authHeader !== expectedAuth) {
      return {
        isValid: false,
        error: 'Invalid or missing authorization header'
      }
    }

    // Additional production checks
    if (!process.env.CRON_SECRET || process.env.CRON_SECRET.length < 32) {
      console.error('[CRON_AUTH] CRON_SECRET is too short or missing in production!')
      return {
        isValid: false,
        error: 'Server configuration error'
      }
    }
  } else {
    // In development, just warn if auth is missing
    if (!authHeader || authHeader !== expectedAuth) {
      console.warn('[CRON_AUTH] Missing or invalid auth in development mode')
    }
  }

  return { isValid: true }
}

export function createCronResponse(data: any, rateLimit?: any) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }

  if (rateLimit) {
    headers['X-RateLimit-Limit'] = String(10)
    headers['X-RateLimit-Remaining'] = String(rateLimit.remaining)
    headers['X-RateLimit-Reset'] = String(Math.ceil(rateLimit.resetTime / 1000))
  }

  return new Response(JSON.stringify(data), { headers })
}