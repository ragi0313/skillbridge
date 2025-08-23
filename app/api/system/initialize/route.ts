import { NextRequest, NextResponse } from "next/server"
import { initializeSessionMonitoring, isMonitoringInitialized, restartSessionMonitoring } from "@/lib/sessions/monitoring-startup"

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json().catch(() => ({ action: 'start' }))
    
    switch (action) {
      case 'start':
        initializeSessionMonitoring()
        return NextResponse.json({ 
          success: true, 
          message: "Session monitoring initialization triggered",
          wasAlreadyRunning: isMonitoringInitialized()
        })
        
      case 'restart':
        restartSessionMonitoring()
        return NextResponse.json({ 
          success: true, 
          message: "Session monitoring restart triggered" 
        })
        
      case 'status':
        return NextResponse.json({ 
          success: true, 
          monitoring: {
            initialized: isMonitoringInitialized(),
            timestamp: new Date().toISOString()
          }
        })
        
      default:
        return NextResponse.json({ 
          error: "Invalid action. Use 'start', 'restart', or 'status'" 
        }, { status: 400 })
    }
    
  } catch (error) {
    console.error("Error in system initialization:", error)
    return NextResponse.json({ 
      success: false, 
      error: "Failed to initialize system",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      monitoring: {
        initialized: isMonitoringInitialized(),
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    return NextResponse.json({ 
      error: "Failed to get system status" 
    }, { status: 500 })
  }
}