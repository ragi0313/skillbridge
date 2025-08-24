import { NextRequest, NextResponse } from "next/server"
import { 
  startSessionMonitoring, 
  stopSessionMonitoring, 
  getSessionMonitorStatus, 
  runSessionMonitorOnce 
} from "@/lib/sessions/session-monitor-service"

export async function GET(request: NextRequest) {
  try {
    const status = getSessionMonitorStatus()
    
    return NextResponse.json({
      success: true,
      status,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error("[SESSION_MONITOR_API] Error getting status:", error)
    return NextResponse.json(
      { 
        error: "Internal server error", 
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, intervalMinutes } = body

    switch (action) {
      case 'start':
        startSessionMonitoring(intervalMinutes || 2)
        return NextResponse.json({
          success: true,
          message: `Session monitoring started with ${intervalMinutes || 2} minute intervals`,
          status: getSessionMonitorStatus()
        })

      case 'stop':
        stopSessionMonitoring()
        return NextResponse.json({
          success: true,
          message: "Session monitoring stopped",
          status: getSessionMonitorStatus()
        })

      case 'run':
        const result = await runSessionMonitorOnce()
        return NextResponse.json({
          success: true,
          message: "Manual monitoring cycle completed",
          result,
          status: getSessionMonitorStatus()
        })

      case 'status':
        return NextResponse.json({
          success: true,
          status: getSessionMonitorStatus()
        })

      default:
        return NextResponse.json(
          { error: "Invalid action. Use 'start', 'stop', 'run', 'status', or 'force_start'" },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error("[SESSION_MONITOR_API] Error in POST:", error)
    return NextResponse.json(
      { 
        error: "Internal server error", 
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}