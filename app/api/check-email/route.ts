import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  const { email } = await req.json()

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 })
  }

  try {
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, email))

    return NextResponse.json({ exists: existing.length > 0 })
  } catch (error) {
    console.error("DB error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
