import { cookies } from "next/headers"
import jwt, { JwtPayload } from "jsonwebtoken"
import { NextRequest } from "next/server"

export async function verifyToken(request?: NextRequest): Promise<{ id: number; role: string } | null> {
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
      console.warn('Could not read cookies:', error)
    }
  }

  if (!token) return null

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!)

    if (typeof decoded === "string") return null // invalid payload

    const { id, role } = decoded as JwtPayload

    if (!id || !role) return null

    return { id: Number(id), role: String(role) }
  } catch (error) {
    console.warn('Token verification failed:', error)
    return null
  }
}