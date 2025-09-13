import { NextRequest, NextResponse } from 'next/server'
import { sessionMonitorService } from '@/lib/services/SessionMonitorService'

export async function GET(request: NextRequest) {
  try {
    const action = request.nextUrl.searchParams.get('action')
    
    switch (action) {
      case 'status':
        return NextResponse.json({
          success: true,
          data: sessionMonitorService.getStatus(),
          timestamp: new Date().toISOString()
        })
        
      case 'restart':
        // Only allow restart in development or with proper auth
        if (process.env.NODE_ENV === 'production') {
          const authHeader = request.headers.get('authorization')
          if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
          }
        }
        
        sessionMonitorService.stop()
        sessionMonitorService.start()
        
        return NextResponse.json({
          success: true,
          message: 'Session monitor restarted',
          data: sessionMonitorService.getStatus(),
          timestamp: new Date().toISOString()
        })
        
      default:
        return NextResponse.json({
          success: true,
          data: sessionMonitorService.getStatus(),
          availableActions: ['status', 'restart'],
          timestamp: new Date().toISOString()
        })
    }
  } catch (error) {
    console.error('[HEALTH_MONITOR] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()
    
    // Require authentication for POST actions
    const authHeader = request.headers.get('authorization')
    if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    switch (action) {
      case 'start':
        if (sessionMonitorService.getStatus().isRunning) {
          return NextResponse.json({
            success: false,
            message: 'Session monitor is already running',
            data: sessionMonitorService.getStatus()
          })
        }
        
        sessionMonitorService.start()
        return NextResponse.json({
          success: true,
          message: 'Session monitor started',
          data: sessionMonitorService.getStatus()
        })
        
      case 'stop':
        sessionMonitorService.stop()
        return NextResponse.json({
          success: true,
          message: 'Session monitor stopped',
          data: sessionMonitorService.getStatus()
        })
        
      case 'restart':
        sessionMonitorService.stop()
        sessionMonitorService.start()
        return NextResponse.json({
          success: true,
          message: 'Session monitor restarted',
          data: sessionMonitorService.getStatus()
        })
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Available actions: start, stop, restart'
        }, { status: 400 })
    }
  } catch (error) {
    console.error('[HEALTH_MONITOR] Error in POST:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}