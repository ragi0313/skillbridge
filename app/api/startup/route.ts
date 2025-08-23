// Auto-startup endpoint that initializes monitoring
// This endpoint is called automatically when the app starts
import { NextRequest, NextResponse } from "next/server"
import { initializeSessionMonitoring } from "@/lib/sessions/monitoring-startup"

export async function GET(request: NextRequest) {
  try {
    console.log('🚀 Startup endpoint called - initializing session monitoring')
    
    // Start monitoring
    initializeSessionMonitoring()
    
    return NextResponse.json({
      success: true,
      message: 'Session monitoring initialized on startup',
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Startup initialization failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Call this endpoint to trigger startup
export async function POST(request: NextRequest) {
  return GET(request)
}