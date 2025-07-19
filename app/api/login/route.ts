// app/api/login/route.ts

import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { users } from "@/db/schema"
import { compare } from "bcryptjs"
import { sign } from "jsonwebtoken"

export async function POST(req: Request) {
  const { email, password } = await req.json()
  const cookieStore = await cookies();

  const [user] = await db.select().from(users).where(eq(users.email, email))

  if (!user) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
  }

  const isPasswordValid = await compare(password, user.hashedPassword)
  if (!isPasswordValid) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
  }

  const token = sign(
    {
      id: user.id,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      profilePictureUrl: user.profilePictureUrl ?? null,
    },
    process.env.JWT_SECRET!,
    { expiresIn: "7d" }
  )

  cookieStore.set("session_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })

  return NextResponse.json({ success: true })
}
