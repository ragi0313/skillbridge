// middleware.ts
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

export async function middleware(req: NextRequest) {
  const rawToken = req.cookies.get("session_token")?.value
  const token = rawToken && rawToken.trim().length > 0 ? rawToken : null

  const url = req.nextUrl.clone()
  const pathname = url.pathname

  const session = token ? await verifyJWT(token) : null

  const isPublicPath = [
    "/",
    "/login",
    "/signup",
    "/register/learner",
    "/register/mentor",
  ].includes(pathname)

  // 🔒 Not logged in
  if (!session) {
    if (
      pathname.startsWith("/learner") ||
      pathname.startsWith("/mentor") ||
      pathname.startsWith("/admin")
    ) {
      url.pathname = "/login"
      return NextResponse.redirect(url)
    }

    return NextResponse.next()
  }

  // ✅ Logged in
  const role = session.role as string

  // 🔁 Redirect from `/` to correct dashboard
  if (pathname === "/") {
    url.pathname = `/${role}/dashboard`
    return NextResponse.redirect(url)
  }

  // 🚫 Prevent access to login/register if logged in
  if (isPublicPath) {
    url.pathname = `/${role}/dashboard`
    return NextResponse.redirect(url)
  }

  // 🔐 Role-based route protection
  if (
    (pathname.startsWith("/learner") && role !== "learner") ||
    (pathname.startsWith("/mentor") && role !== "mentor") ||
    (pathname.startsWith("/admin") && role !== "admin")
  ) {
    url.pathname = `/${role}/dashboard`
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/signup",
    "/register/:path*",
    "/learner/:path*",
    "/mentor/:path*",
    "/admin/:path*",
  ],
}
