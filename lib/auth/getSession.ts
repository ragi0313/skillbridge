import { cookies } from "next/headers"
import jwt, { JwtPayload } from "jsonwebtoken"

export interface Session {
  id: number
  role: string
  email: string
  firstName: string
  lastName: string
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get("session_token")?.value

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
  } catch {
    return null
  }
}
