import { NextResponse } from "next/server"
import { db } from "@/db"
import { users } from "@/db/schema"
import { getSession } from "@/lib/auth/getSession"
import { desc } from "drizzle-orm"

export async function GET() {
  try {
    const session = await getSession()

    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const allUsers = await db.query.users.findMany({
      columns: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        status: true,
        lastLoginAt: true,
        suspendedAt: true,
        suspensionEndsAt: true,
        suspensionReason: true,
        blacklistedAt: true,
        blacklistReason: true,
        createdAt: true,
      },
      orderBy: [desc(users.createdAt)],
    })

    return NextResponse.json({ users: allUsers }, { status: 200 })
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
