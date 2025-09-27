import { NextResponse } from "next/server"
import { db } from "@/db"
import { users, admins } from "@/db/schema"
import { eq } from "drizzle-orm"
import { getSession } from "@/lib/auth/getSession"

export async function GET() {
  try {
    const session = await getSession()

    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user data
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, session.id))
      .limit(1)

    if (!user.length) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check if user is admin
    if (user[0].role !== 'admin') {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Get admin profile data
    const adminProfile = await db
      .select({
        profilePictureUrl: admins.profilePictureUrl,
      })
      .from(admins)
      .where(eq(admins.userId, user[0].id))
      .limit(1)

    const adminData = {
      firstName: user[0].firstName,
      lastName: user[0].lastName,
      profilePictureUrl: adminProfile[0]?.profilePictureUrl || null,
    }

    return NextResponse.json({ admin: adminData })
  } catch (error) {
    console.error("Error fetching admin profile:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}