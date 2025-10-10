import { NextRequest, NextResponse } from 'next/server'

/**
 * Maximum request body sizes for different endpoint types
 */
export const REQUEST_SIZE_LIMITS = {
  default: 1 * 1024 * 1024, // 1MB for regular requests
  upload: 50 * 1024 * 1024, // 50MB for file uploads
  api: 500 * 1024, // 500KB for API requests
  webhook: 1 * 1024 * 1024 // 1MB for webhooks
} as const

/**
 * Validate request body size
 */
export async function validateRequestSize(
  req: NextRequest,
  maxSize: number
): Promise<{ valid: boolean; error?: string }> {
  try {
    const contentLength = req.headers.get('content-length')

    if (!contentLength) {
      // If no content-length header, we'll check during body read
      return { valid: true }
    }

    const size = parseInt(contentLength, 10)

    if (isNaN(size)) {
      return {
        valid: false,
        error: 'Invalid content-length header'
      }
    }

    if (size > maxSize) {
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1)
      const requestSizeMB = (size / (1024 * 1024)).toFixed(1)

      return {
        valid: false,
        error: `Request body too large: ${requestSizeMB}MB exceeds limit of ${maxSizeMB}MB`
      }
    }

    return { valid: true }
  } catch (error) {
    return {
      valid: false,
      error: 'Failed to validate request size'
    }
  }
}

/**
 * Middleware to enforce request size limits
 */
export function withRequestSizeLimit(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>,
  maxSize: number = REQUEST_SIZE_LIMITS.default
) {
  return async function requestSizeLimitHandler(
    req: NextRequest,
    context?: any
  ): Promise<NextResponse> {
    // Skip size check for GET and HEAD requests
    if (req.method === 'GET' || req.method === 'HEAD') {
      return handler(req, context)
    }

    const validation = await validateRequestSize(req, maxSize)

    if (!validation.valid) {
      console.warn(`Request size limit exceeded: ${validation.error}`)
      return NextResponse.json(
        { error: validation.error || 'Request too large' },
        { status: 413 } // Payload Too Large
      )
    }

    return handler(req, context)
  }
}

/**
 * Validate request origin and referer for additional CSRF protection
 */
export function validateRequestOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin')
  const referer = req.headers.get('referer')
  const host = req.headers.get('host')

  // For same-origin requests
  if (!origin && !referer) {
    // This might be a direct API call or curl, check in production
    return process.env.NODE_ENV !== 'production'
  }

  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    `https://${host}`,
    `http://${host}` // For development
  ].filter(Boolean)

  // Check origin
  if (origin) {
    const isAllowed = allowedOrigins.some(allowed =>
      origin.startsWith(allowed as string)
    )
    if (!isAllowed) {
      return false
    }
  }

  // Check referer
  if (referer && !origin) {
    const isAllowed = allowedOrigins.some(allowed =>
      referer.startsWith(allowed as string)
    )
    if (!isAllowed) {
      return false
    }
  }

  return true
}

/**
 * Middleware to validate request origin
 */
export function withOriginValidation(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async function originValidationHandler(
    req: NextRequest,
    context?: any
  ): Promise<NextResponse> {
    // Only check for state-changing methods
    if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      return handler(req, context)
    }

    const isValid = validateRequestOrigin(req)

    if (!isValid) {
      console.warn('Invalid request origin detected', {
        origin: req.headers.get('origin'),
        referer: req.headers.get('referer'),
        host: req.headers.get('host')
      })

      return NextResponse.json(
        { error: 'Invalid request origin' },
        { status: 403 }
      )
    }

    return handler(req, context)
  }
}

/**
 * Sanitize and validate common input patterns
 */
export const inputValidators = {
  /**
   * Validate email format
   */
  email: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email.trim())
  },

  /**
   * Validate UUID format
   */
  uuid: (uuid: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(uuid)
  },

  /**
   * Validate integer ID
   */
  id: (id: string | number): boolean => {
    const numId = typeof id === 'string' ? parseInt(id, 10) : id
    return !isNaN(numId) && numId > 0 && Number.isInteger(numId)
  },

  /**
   * Validate slug format
   */
  slug: (slug: string): boolean => {
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
    return slugRegex.test(slug)
  },

  /**
   * Sanitize string input (remove null bytes and trim)
   */
  sanitizeString: (input: string): string => {
    return input.replace(/\0/g, '').trim()
  },

  /**
   * Validate date string
   */
  date: (date: string): boolean => {
    const parsedDate = new Date(date)
    return !isNaN(parsedDate.getTime())
  }
}

/**
 * Check for common injection patterns
 */
export function detectInjectionAttempt(input: string): {
  detected: boolean
  type?: string
} {
  // SQL Injection patterns
  const sqlPatterns = [
    /(\bunion\b.*\bselect\b)|(\bselect\b.*\bfrom\b)/i,
    /(\bdrop\b.*\btable\b)|(\bdelete\b.*\bfrom\b)/i,
    /(\binsert\b.*\binto\b)|(\bupdate\b.*\bset\b)/i,
    /(\bexec\b|\bexecute\b).*\(/i,
    /(;|\-\-|\/\*|\*\/|xp_|sp_)/i
  ]

  for (const pattern of sqlPatterns) {
    if (pattern.test(input)) {
      return { detected: true, type: 'sql_injection' }
    }
  }

  // XSS patterns
  const xssPatterns = [
    /<script[\s\S]*?>[\s\S]*?<\/script>/i,
    /javascript:/i,
    /on\w+\s*=/i, // Event handlers like onclick=
    /<iframe/i,
    /<object/i,
    /<embed/i
  ]

  for (const pattern of xssPatterns) {
    if (pattern.test(input)) {
      return { detected: true, type: 'xss' }
    }
  }

  // Path traversal
  const pathTraversalPatterns = [
    /\.\.[\/\\]/,
    /[\/\\]etc[\/\\]passwd/i,
    /[\/\\]windows[\/\\]system/i
  ]

  for (const pattern of pathTraversalPatterns) {
    if (pattern.test(input)) {
      return { detected: true, type: 'path_traversal' }
    }
  }

  return { detected: false }
}
