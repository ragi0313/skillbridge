import { cookies } from "next/headers"
import jwt, { JwtPayload } from "jsonwebtoken"
import { NextRequest } from "next/server"
import type { Session } from "./getSession"

export async function verifyToken(request?: NextRequest): Promise<Session | null> {
  let token: string | undefined

  // Try to get token from Authorization header first (for API calls)
  if (request) {
    const authHeader = request.headers.get('authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    }
  }

  // Fallback to cookies (for regular requests)
  if (!token) {
    try {
      const cookieStore = await cookies()
      token = cookieStore.get("session_token")?.value
    } catch (error) {
      // Cookies might not be available in some contexts
      }
  }

  if (!token) return null

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!)

    if (typeof decoded === "string") return null // invalid payload

    const { id, role, email, firstName, lastName } = decoded as JwtPayload

    if (!id || !role) return null

    return {
      id: Number(id),
      role: String(role),
      email: String(email || ''),
      firstName: String(firstName || ''),
      lastName: String(lastName || '')
    }
  } catch (error) {
    return null
  }
}