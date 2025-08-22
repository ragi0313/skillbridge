import { NextRequest, NextResponse } from "next/server"
import { runAutoSessionMonitor, getSessionSystemHealth } from "@/lib/sessions/auto-session-monitor"

export async function POST(request: NextRequest) {
  try {
    // Check for cron authorization
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    const userAgent = request.headers.get('user-agent')
    
    // Allow requests from:
    // 1. Proper cron secret in production
    // 2. Development environment for testing
    // 3. Vercel Cron user agent
    const isAuthorized = 
      (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
      process.env.NODE_ENV === 'development' ||
      (userAgent && userAgent.includes('vercel-cron'))

    if (!isAuthorized) {
      console.log(`Unauthorized session monitor request from ${userAgent}`)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("🤖 Session monitor triggered via API")
    
    // Run the comprehensive session monitoring
    const result = await runAutoSessionMonitor()
    
    // Log important results
    if (result.noShowsProcessed > 0 || result.expiredBookingsProcessed > 0 || result.statusUpdates > 0) {
      console.log(`📊 Session Monitor Results:`)
      console.log(`   No-shows processed: ${result.noShowsProcessed}`)
      console.log(`   Expired bookings: ${result.expiredBookingsProcessed}`)
      console.log(`   Status updates: ${result.statusUpdates}`)
      console.log(`   Errors: ${result.errors.length}`)
    }
    
    return NextResponse.json({
      success: true,
      message: "Session monitoring completed",
      results: {
        timestamp: result.timestamp.toISOString(),
        sessionsChecked: result.sessionsChecked,
        noShowsProcessed: result.noShowsProcessed,
        expiredBookingsProcessed: result.expiredBookingsProcessed,
        statusUpdates: result.statusUpdates,
        errors: result.errors,
        summary: `Processed ${result.noShowsProcessed} no-shows, ${result.expiredBookingsProcessed} expired bookings, ${result.statusUpdates} status updates`
      }
    })

  } catch (error) {
    console.error("💥 Critical error in session monitor API:", error)
    return NextResponse.json({ 
      success: false,
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Allow GET requests for health checks and manual triggers in development
    if (process.env.NODE_ENV === 'production') {
      const authHeader = request.headers.get('authorization')
      const cronSecret = process.env.CRON_SECRET
      
      if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    // Get system health status
    const health = await getSessionSystemHealth()
    
    return NextResponse.json({
      success: true,
      health,
      message: "Session system health check",
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("Error in session monitor health check:", error)
    return NextResponse.json({ 
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}