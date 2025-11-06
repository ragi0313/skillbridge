import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth/getSession"
import { enable2FA } from "@/lib/auth/two-factor-service"

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const result = await enable2FA(session.id)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ message: "Two-factor authentication enabled successfully" }, { status: 200 })
  } catch (error) {
    console.error("Enable 2FA error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
