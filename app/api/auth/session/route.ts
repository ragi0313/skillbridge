// app/api/auth/session/route.ts

import { cookies } from "next/headers"
import { verify } from "jsonwebtoken"

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value

  if (!token) {
    return Response.json({ user: null }, { status: 200 })
  }

  try {
    const user = verify(token, process.env.JWT_SECRET!) as {
      id: number
      role: string
      firstName: string
      lastName: string
      profilePictureUrl: string | null
    }

    return Response.json({ user }, { status: 200 })
  } catch {
    return Response.json({ user: null }, { status: 401 })
  }
}
