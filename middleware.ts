import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { jwtVerify } from "jose"

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)

async function verifyJWT(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload
  } catch (err) {
    return null
  }
}

/**
 * Apply comprehensive security headers to all responses
 */
function applySecurityHeaders(response: NextResponse, pathname: string): NextResponse {
  // Security headers for all responses
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=(), usb=()')

  // Add HSTS in production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  }

  // Content Security Policy
  // NOTE: 'unsafe-inline' for scripts should be replaced with nonce-based CSP in the future
  // This requires generating unique nonces per request and passing them to inline scripts
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://unpkg.com https://*.pusher.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: https: blob:",
    "media-src 'self' https: blob:",
    "connect-src 'self' https://api.agora.io https://*.agora.io https://api.xendit.co https://*.pusher.com wss: ws:",
    "frame-src 'self' https://checkout.xendit.co",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'"
  ]

  // Add upgrade-insecure-requests in production
  if (process.env.NODE_ENV === 'production') {
    cspDirectives.push('upgrade-insecure-requests')
  }

  response.headers.set('Content-Security-Policy', cspDirectives.join('; '))

  // Additional headers for sensitive pages (auth, payments, etc.)
  const sensitivePaths = ['/login', '/register', '/admin']
  if (sensitivePaths.some(path => pathname.startsWith(path))) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
  }

  return response
}

export async function middleware(req: NextRequest) {
  const rawToken = req.cookies.get("session_token")?.value
  const token = rawToken && rawToken.trim().length > 0 ? rawToken : null

  const url = req.nextUrl.clone()
  const pathname = url.pathname

  const session = token ? await verifyJWT(token) : null

  const isPublicPath = [
    "/",
    "/login",
    "/register",
    "/register/learner",
    "/register/mentor",
  ].includes(pathname)

  if (!session) {
    if (
      pathname.startsWith("/learner") ||
      pathname.startsWith("/mentor") ||
      pathname.startsWith("/admin")
    ) {
      url.pathname = "/login"
      const response = NextResponse.redirect(url)
      return applySecurityHeaders(response, pathname)
    }

    const response = NextResponse.next()
    return applySecurityHeaders(response, pathname)
  }

  const role = session.role as string

  if (pathname === "/") {
    url.pathname = role === "admin" ? `/${role}/dashboard` : `/${role}`
    const response = NextResponse.redirect(url)
    return applySecurityHeaders(response, pathname)
  }

  if (isPublicPath) {
    url.pathname = role === "admin" ? `/${role}/dashboard` : `/${role}`
    const response = NextResponse.redirect(url)
    return applySecurityHeaders(response, pathname)
  }

  // Prevent mentors from accessing find-mentors page
  if (pathname === "/find-mentors" && role === "mentor") {
    url.pathname = "/mentor"
    const response = NextResponse.redirect(url)
    return applySecurityHeaders(response, pathname)
  }

  if (
    (pathname.startsWith("/learner") && role !== "learner") ||
    (pathname.startsWith("/mentor") && role !== "mentor") ||
    (pathname.startsWith("/admin") && role !== "admin")
  ) {
    url.pathname = role === "admin" ? `/${role}/dashboard` : `/${role}`
    const response = NextResponse.redirect(url)
    return applySecurityHeaders(response, pathname)
  }

  const response = NextResponse.next()
  return applySecurityHeaders(response, pathname)
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/register",
    "/register/:path*",
    "/learner/:path*",
    "/mentor/:path*",
    "/admin/:path*",
    "/find-mentors",
  ],
}
