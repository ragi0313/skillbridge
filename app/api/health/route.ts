import { NextRequest, NextResponse } from 'next/server'
import { sessionMonitorService } from '@/lib/services/SessionMonitorService'
import { db } from '@/db'
import { bookingSessions } from '@/db/schema'
import { sql } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const detailed = request.nextUrl.searchParams.get('detailed') === 'true'
    
    // Basic health checks
    const basicChecks = {
      database: await checkDatabase(),
      sessionMonitor: checkSessionMonitor(),
    }

    // Add detailed information if requested
    const healthChecks = {
      timestamp: new Date().toISOString(),
      status: 'healthy' as string,
      checks: detailed ? {
        ...basicChecks,
        sessionStats: await getSessionStats(),
        systemInfo: getSystemInfo(),
      } : basicChecks
    }

    // Determine overall health
    const allHealthy = Object.values(healthChecks.checks).every(
      check => check.status === 'healthy'
    )
    
    healthChecks.status = allHealthy ? 'healthy' : 'unhealthy'

    const statusCode = allHealthy ? 200 : 503

    return NextResponse.json(healthChecks, { status: statusCode })

  } catch (error) {
    console.error('[HEALTH_CHECK] Error during health check:', error)
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      checks: {
        database: { status: 'error', message: 'Health check failed' },
        sessionMonitor: { status: 'error', message: 'Health check failed' }
      }
    }, { status: 503 })
  }
}

async function checkDatabase(): Promise<{ status: string; responseTime?: number; message?: string }> {
  try {
    const startTime = Date.now()
    
    // Simple database connectivity test
    await db.select({ count: sql`count(*)` }).from(bookingSessions).limit(1)
    
    const responseTime = Date.now() - startTime
    
    return {
      status: 'healthy',
      responseTime,
      message: `Database responding in ${responseTime}ms`
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      message: `Database error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

function checkSessionMonitor(): { status: string; message?: string; details?: any } {
  try {
    const monitorStatus = sessionMonitorService.getStatus()
    
    if (!monitorStatus.isHealthy) {
      return {
        status: 'unhealthy',
        message: 'Session monitor is not healthy',
        details: {
          isRunning: monitorStatus.isRunning,
          consecutiveErrors: monitorStatus.consecutiveErrors,
          lastRunTime: monitorStatus.lastRunTime,
          lastHealthCheck: monitorStatus.lastHealthCheck
        }
      }
    }

    return {
      status: 'healthy',
      message: 'Session monitor is running normally',
      details: {
        isRunning: monitorStatus.isRunning,
        lastRunTime: monitorStatus.lastRunTime,
        stats: monitorStatus.stats
      }
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      message: `Session monitor error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

async function getSessionStats(): Promise<{ status: string; data?: any; message?: string }> {
  try {
    const stats = await db
      .select({
        status: bookingSessions.status,
        count: sql`count(*)`
      })
      .from(bookingSessions)
      .groupBy(bookingSessions.status)

    return {
      status: 'healthy',
      data: stats.reduce((acc, stat) => {
        acc[stat.status || 'unknown'] = Number(stat.count)
        return acc
      }, {} as Record<string, number>)
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      message: `Failed to get session stats: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

function getSystemInfo(): any {
  return {
    nodeVersion: process.version,
    platform: process.platform,
    environment: process.env.NODE_ENV,
    uptime: Math.floor(process.uptime()),
    memoryUsage: process.memoryUsage(),
  }
}