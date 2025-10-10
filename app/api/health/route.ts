import { NextRequest, NextResponse } from 'next/server'
import { validateServiceHealth } from '@/lib/config/env-validation'
import { db } from '@/db'
import { bookingSessions } from '@/db/schema'
import { sql } from 'drizzle-orm'
import { getSession } from '@/lib/auth/getSession'

export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now()
    const requestedDetailed = request.nextUrl.searchParams.get('detailed') === 'true'

    // SECURITY: Only allow detailed health info for authenticated admins
    const session = await getSession()
    const isAdmin = session?.role === 'admin'
    const detailed = requestedDetailed && isAdmin

    // If user requested detailed but is not admin, return warning
    if (requestedDetailed && !isAdmin) {
      return NextResponse.json({
        error: 'Detailed health information requires admin authentication',
        message: 'Use basic health check without ?detailed=true parameter'
      }, { status: 403 })
    }

    // Comprehensive health checks using the new service validation
    const serviceHealth = await validateServiceHealth()

    // Legacy session monitor check (if available)
    let sessionMonitorHealth = { status: 'healthy', message: 'Not available' }
    try {
      const { sessionMonitorService } = await import('@/lib/services/SessionMonitorService')
      sessionMonitorHealth = checkSessionMonitor(sessionMonitorService)
    } catch (error) {
      // SessionMonitorService might not exist, that's ok
      sessionMonitorHealth = { status: 'healthy', message: 'Service not found (optional)' }
    }

    const responseTime = Date.now() - startTime

    // Build comprehensive health response
    const healthResponse = {
      timestamp: new Date().toISOString(),
      status: serviceHealth.overall ? 'healthy' : 'unhealthy',
      responseTime: `${responseTime}ms`,
      services: {
        database: {
          status: serviceHealth.database ? 'up' : 'down',
          critical: true,
          details: detailed ? await getDatabaseDetails() : undefined
        },
        pusher: {
          status: serviceHealth.pusher ? 'up' : 'down',
          critical: true,
          message: 'Real-time messaging service'
        },
        cache: {
          status: serviceHealth.cache ? 'up' : 'down',
          critical: false,
          message: 'Rate limiting and caching'
        },
        storage: {
          status: serviceHealth.storage ? 'up' : 'down',
          critical: false,
          message: 'File upload service'
        },
        email: {
          status: serviceHealth.email ? 'up' : 'down',
          critical: false,
          message: 'Email notification service'
        },
        sessionMonitor: {
          status: sessionMonitorHealth.status,
          critical: false,
          message: sessionMonitorHealth.message,
          details: detailed ? sessionMonitorHealth : undefined
        }
      }
    }

    // Only include environment info for admins
    if (isAdmin) {
      healthResponse.environment = process.env.NODE_ENV
      healthResponse.version = process.env.npm_package_version || 'unknown'
    }

    // Add detailed information if requested
    if (detailed) {
      healthResponse.services.systemInfo = {
        status: 'up',
        critical: false,
        details: getSystemInfo()
      }

      healthResponse.services.sessionStats = {
        status: 'up',
        critical: false,
        details: await getSessionStats()
      }
    }

    const statusCode = serviceHealth.overall ? 200 : 503

    return NextResponse.json(healthResponse, {
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('[HEALTH_CHECK] Error during health check:', error)

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      environment: process.env.NODE_ENV,
      services: {
        database: { status: 'error', critical: true, message: 'Health check failed' },
        pusher: { status: 'error', critical: true, message: 'Health check failed' }
      }
    }, {
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  }
}

async function getDatabaseDetails(): Promise<{ responseTime: number; message: string; connectionInfo?: any }> {
  try {
    const startTime = Date.now()

    // Simple database connectivity test
    await db.select({ count: sql`count(*)` }).from(bookingSessions).limit(1)

    const responseTime = Date.now() - startTime

    return {
      responseTime,
      message: `Database responding in ${responseTime}ms`,
      connectionInfo: {
        type: 'PostgreSQL',
        pool: 'Active'
      }
    }
  } catch (error) {
    return {
      responseTime: 0,
      message: `Database error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

function checkSessionMonitor(sessionMonitorService: any): { status: string; message?: string; details?: any } {
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

async function getSessionStats(): Promise<any> {
  try {
    const stats = await db
      .select({
        status: bookingSessions.status,
        count: sql`count(*)`
      })
      .from(bookingSessions)
      .groupBy(bookingSessions.status)

    return {
      sessionsByStatus: stats.reduce((acc, stat) => {
        acc[stat.status || 'unknown'] = Number(stat.count)
        return acc
      }, {} as Record<string, number>),
      lastUpdated: new Date().toISOString()
    }
  } catch (error) {
    return {
      error: `Failed to get session stats: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

function getSystemInfo(): any {
  const memoryUsage = process.memoryUsage()

  return {
    nodeVersion: process.version,
    platform: process.platform,
    architecture: process.arch,
    environment: process.env.NODE_ENV,
    uptime: `${Math.floor(process.uptime())}s`,
    memoryUsage: {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`
    },
    pid: process.pid,
    timestamp: new Date().toISOString()
  }
}