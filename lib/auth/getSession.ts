import { cookies } from "next/headers"
import jwt, { JwtPayload } from "jsonwebtoken"

export async function getSession(): Promise<null | { id: number; role: string }> {
  const cookieStore = await cookies()
  const token = cookieStore.get("session_token")?.value

  if (!token) return null

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!)

    if (typeof decoded === "string") return null // invalid payload

    const { id, role } = decoded as JwtPayload

    if (!id || !role) return null

    return { id: Number(id), role: String(role) }
  } catch {
    return null
  }
}
