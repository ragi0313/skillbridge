import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!)
    const role = (decoded as any).role

    const pathname = request.nextUrl.pathname

    if (pathname.startsWith("/app/mentor") && role !== "mentor") {
      return NextResponse.redirect(new URL("/unauthorized", request.url))
    }

    if (pathname.startsWith("/app/learner") && role !== "learner") {
      return NextResponse.redirect(new URL("/unauthorized", request.url))
    }

    if (pathname.startsWith("/app/admin") && role !== "admin") {
      return NextResponse.redirect(new URL("/unauthorized", request.url))
    }

    return NextResponse.next()
  } catch (err) {
    return NextResponse.redirect(new URL("/login", request.url))
  }
}

export const config = {
  matcher: [
    "/app/mentor/:path*",
    "/app/learner/:path*",
    "/app/admin/:path*", 
  ],
}
