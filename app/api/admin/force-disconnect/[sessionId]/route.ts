import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth/getSession"
import { sessionTerminationService } from "@/lib/services/SessionTerminationService"
import { broadcastForceDisconnect } from "../../../sse/session-updates/route"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await getSession()
    if (!session?.id || session.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 })
    }

    const { reason = 'Admin terminated session' } = await request.json()
    const { sessionId } = await params
    const sessionIdNum = parseInt(sessionId)

    // Use the termination service to handle force disconnect
    const result = await sessionTerminationService.forceDisconnectSession(sessionIdNum, reason)

    // Broadcast force disconnect to participants
    // Note: We would need user IDs to broadcast, this is handled in the service
    console.log(`Force disconnect result:`, result)

    return NextResponse.json({
      success: true,
      message: "Session force disconnected successfully",
      sessionId: sessionIdNum,
      reason,
      result
    })

  } catch (error) {
    console.error("[ADMIN_FORCE_DISCONNECT] Error force disconnecting session:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}