import { NextRequest, NextResponse } from 'next/server'
import { sessionMonitorService } from '@/lib/services/SessionMonitorService'
import { db } from '@/db'
import { bookingSessions } from '@/db/schema'
import { eq, and, or, lt, isNull, sql } from 'drizzle-orm'
import { validateCronAuth, cronRateLimiter, createCronResponse } from '@/lib/middleware/rate-limit-cron'

export async function GET(request: NextRequest) {
  // Validate authentication and rate limiting
  const authResult = validateCronAuth(request)
  if (!authResult.isValid) {
    const rateLimit = cronRateLimiter.isRateLimited(request)
    return new Response(JSON.stringify({ 
      error: authResult.error,
      timestamp: new Date().toISOString()
    }), { 
      status: 401,
      headers: {
        'X-RateLimit-Remaining': String(rateLimit.remaining),
        'X-RateLimit-Reset': String(Math.ceil(rateLimit.resetTime / 1000))
      }
    })
  }

  try {
    console.log('[SESSION_CLEANUP] Starting automated session cleanup job...')
    
    // Get current stats before processing
    const beforeStats = sessionMonitorService.getStatus().stats
    
    // Run the monitoring service manually to ensure it processes everything
    await runCompleteSessionCleanup()
    
    // Get stats after processing
    const afterStats = sessionMonitorService.getStatus().stats
    
    // Calculate what was processed in this run
    const processed = {
      expiredBookings: afterStats.expiredBookings - beforeStats.expiredBookings,
      noShows: afterStats.noShowsDetected - beforeStats.noShowsDetected,
      completedSessions: afterStats.sessionsCompleted - beforeStats.sessionsCompleted,
      totalProcessed: afterStats.sessionsProcessed - beforeStats.sessionsProcessed
    }

    console.log(`[SESSION_CLEANUP] Cleanup completed:`, processed)

    const rateLimit = cronRateLimiter.isRateLimited(request)
    return createCronResponse({
      success: true,
      message: 'Session cleanup completed successfully',
      processed,
      totalStats: afterStats,
      timestamp: new Date().toISOString()
    }, rateLimit)
  } catch (error) {
    console.error('[SESSION_CLEANUP] Error running session cleanup:', error)
    return NextResponse.json({ 
      error: 'Session cleanup failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // Allow manual trigger with basic authentication
  try {
    const { action, force = false } = await request.json()
    
    console.log(`[SESSION_CLEANUP] Manual cleanup triggered with action: ${action || 'all'}`)
    
    const results: any = {}
    
    if (action === 'monitor' || action === 'all' || !action) {
      // Run the full monitoring cycle
      await runCompleteSessionCleanup()
      results.monitoring = 'completed'
    }
    
    if (action === 'diagnostics' || action === 'all') {
      // Run diagnostics to identify problematic sessions
      const diagnostics = await runSessionDiagnostics()
      results.diagnostics = diagnostics
    }
    
    if (action === 'force_fix' && force) {
      // Force fix stuck sessions (use with caution)
      const forceResults = await forceFixStuckSessions()
      results.forceFix = forceResults
    }

    return NextResponse.json({
      success: true,
      message: `Manual session cleanup completed for action: ${action || 'all'}`,
      results,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('[SESSION_CLEANUP] Error in manual session cleanup:', error)
    return NextResponse.json({ 
      error: 'Manual session cleanup failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function runCompleteSessionCleanup(): Promise<void> {
  // This manually runs all the cleanup processes in the correct order
  const monitor = sessionMonitorService
  
  try {
    // Run all the monitoring processes in sequence
    await monitor['processExpiredBookings']?.()
    await monitor['updateToUpcoming']?.()
    await monitor['detectNoShows']?.()
    await monitor['completeFinishedSessions']?.()
    
    console.log('[SESSION_CLEANUP] All monitoring processes completed')
  } catch (error) {
    console.error('[SESSION_CLEANUP] Error running monitoring processes:', error)
    throw error
  }
}

async function runSessionDiagnostics(): Promise<any> {
  try {
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    
    // Find potentially problematic sessions
    const diagnostics = await db
      .select({
        id: bookingSessions.id,
        status: bookingSessions.status,
        startTime: bookingSessions.startTime,
        endTime: bookingSessions.endTime,
        expiresAt: bookingSessions.expiresAt,
        learnerJoinedAt: bookingSessions.learnerJoinedAt,
        mentorJoinedAt: bookingSessions.mentorJoinedAt,
        noShowCheckedAt: bookingSessions.noShowCheckedAt,
        refundProcessedAt: bookingSessions.refundProcessedAt,
        agoraCallEndedAt: bookingSessions.agoraCallEndedAt,
      })
      .from(bookingSessions)
      .where(
        or(
          // Pending sessions past expiry
          and(
            eq(bookingSessions.status, 'pending'),
            lt(bookingSessions.expiresAt, now)
          ),
          // Upcoming sessions stuck for over an hour
          and(
            eq(bookingSessions.status, 'upcoming'),
            lt(bookingSessions.startTime, oneHourAgo)
          ),
          // Ongoing sessions that should have ended
          and(
            eq(bookingSessions.status, 'ongoing'),
            lt(bookingSessions.endTime, now)
          ),
          // Sessions that need no-show checking
          and(
            or(
              eq(bookingSessions.status, 'confirmed'),
              eq(bookingSessions.status, 'upcoming')
            ),
            lt(bookingSessions.startTime, new Date(now.getTime() - 15 * 60 * 1000)),
            isNull(bookingSessions.noShowCheckedAt)
          )
        )
      )

    const categorized = {
      expiredPending: diagnostics.filter(s => 
        s.status === 'pending' && s.expiresAt && s.expiresAt < now
      ).length,
      stuckUpcoming: diagnostics.filter(s => 
        s.status === 'upcoming' && s.startTime < oneHourAgo
      ).length,
      overdueOngoing: diagnostics.filter(s => 
        s.status === 'ongoing' && s.endTime && s.endTime < now
      ).length,
      needsNoShowCheck: diagnostics.filter(s => 
        s.status !== null &&
        ['confirmed', 'upcoming'].includes(s.status) && 
        s.startTime < new Date(now.getTime() - 15 * 60 * 1000) && 
        !s.noShowCheckedAt
      ).length,
      total: diagnostics.length
    }

    return {
      timestamp: now.toISOString(),
      summary: categorized,
      details: diagnostics.map(s => ({
        id: s.id,
        status: s.status,
        issue: getSessionIssue(s, now),
        startTime: s.startTime,
        endTime: s.endTime
      }))
    }
  } catch (error) {
    console.error('[SESSION_DIAGNOSTICS] Error running diagnostics:', error)
    throw error
  }
}

function getSessionIssue(session: any, now: Date): string {
  if (session.status === 'pending' && session.expiresAt && session.expiresAt < now) {
    return 'Expired pending booking'
  }
  if (session.status === 'upcoming' && session.startTime < new Date(now.getTime() - 60 * 60 * 1000)) {
    return 'Stuck in upcoming status'
  }
  if (session.status === 'ongoing' && session.endTime && session.endTime < now) {
    return 'Overdue ongoing session'
  }
  if (['confirmed', 'upcoming'].includes(session.status) && 
      session.startTime < new Date(now.getTime() - 15 * 60 * 1000) && 
      !session.noShowCheckedAt) {
    return 'Needs no-show check'
  }
  return 'Unknown issue'
}

async function forceFixStuckSessions(): Promise<any> {
  try {
    const now = new Date()
    const results = {
      expiredPendingFixed: 0,
      stuckUpcomingFixed: 0,
      overdueOngoingFixed: 0,
      errors: [] as string[]
    }

    // Force fix expired pending sessions
    try {
      const expiredPending = await db
        .select({ id: bookingSessions.id })
        .from(bookingSessions)
        .where(
          and(
            eq(bookingSessions.status, 'pending'),
            lt(bookingSessions.expiresAt, now),
            isNull(bookingSessions.refundProcessedAt)
          )
        )

      for (const session of expiredPending) {
        await db
          .update(bookingSessions)
          .set({
            status: 'mentor_no_response',
            refundProcessedAt: now,
          })
          .where(eq(bookingSessions.id, session.id))
        
        results.expiredPendingFixed++
      }
    } catch (error) {
      results.errors.push(`Error fixing expired pending: ${error}`)
    }

    // Force fix stuck upcoming sessions
    try {
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
      const stuckUpcoming = await db
        .select({ id: bookingSessions.id, endTime: bookingSessions.endTime })
        .from(bookingSessions)
        .where(
          and(
            eq(bookingSessions.status, 'upcoming'),
            lt(bookingSessions.startTime, oneHourAgo)
          )
        )

      for (const session of stuckUpcoming) {
        const newStatus = session.endTime && session.endTime < now ? 'both_no_show' : 'both_no_show'
        
        await db
          .update(bookingSessions)
          .set({
            status: newStatus,
            noShowCheckedAt: now,
            agoraCallEndedAt: now,
          })
          .where(eq(bookingSessions.id, session.id))
        
        results.stuckUpcomingFixed++
      }
    } catch (error) {
      results.errors.push(`Error fixing stuck upcoming: ${error}`)
    }

    // Force complete overdue ongoing sessions
    try {
      const overdueOngoing = await db
        .select({ id: bookingSessions.id })
        .from(bookingSessions)
        .where(
          and(
            eq(bookingSessions.status, 'ongoing'),
            lt(bookingSessions.endTime, now)
          )
        )

      for (const session of overdueOngoing) {
        await db
          .update(bookingSessions)
          .set({
            status: 'completed',
            agoraCallEndedAt: now,
          })
          .where(eq(bookingSessions.id, session.id))
        
        results.overdueOngoingFixed++
      }
    } catch (error) {
      results.errors.push(`Error fixing overdue ongoing: ${error}`)
    }

    return results
  } catch (error) {
    console.error('[SESSION_FORCE_FIX] Error in force fix:', error)
    throw error
  }
}