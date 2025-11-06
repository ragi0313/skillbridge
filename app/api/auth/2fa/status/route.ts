import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth/getSession"
import { is2FAEnabled } from "@/lib/auth/two-factor-service"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const isEnabled = await is2FAEnabled(session.id)

    return NextResponse.json({ isEnabled }, { status: 200 })
  } catch (error) {
    console.error("Get 2FA status error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
