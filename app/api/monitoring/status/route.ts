import { NextRequest, NextResponse } from "next/server"
import { autoMonitorService, startAutoMonitoring, stopAutoMonitoring, getMonitoringStatus } from "@/lib/sessions/auto-monitor-service"

export async function GET(request: NextRequest) {
  try {
    const status = getMonitoringStatus()
    
    return NextResponse.json({
      success: true,
      monitoring: {
        ...status,
        timestamp: new Date().toISOString(),
        nextRunInSeconds: status.nextRunIn ? Math.ceil(status.nextRunIn / 1000) : null
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { action, intervalMinutes } = body
    
    switch (action) {
      case 'start':
        startAutoMonitoring(intervalMinutes || 1)
        return NextResponse.json({
          success: true,
          message: `Auto-monitoring started with ${intervalMinutes || 1} minute interval`
        })
        
      case 'stop':
        stopAutoMonitoring()
        return NextResponse.json({
          success: true,
          message: 'Auto-monitoring stopped'
        })
        
      case 'restart':
        stopAutoMonitoring()
        setTimeout(() => {
          startAutoMonitoring(intervalMinutes || 1)
        }, 1000)
        return NextResponse.json({
          success: true,
          message: `Auto-monitoring restarted with ${intervalMinutes || 1} minute interval`
        })
        
      default:
        return NextResponse.json({
          error: 'Invalid action. Use start, stop, or restart'
        }, { status: 400 })
    }
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}