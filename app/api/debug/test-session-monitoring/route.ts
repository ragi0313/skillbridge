import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { bookingSessions, learners, mentors } from "@/db/schema"
import { eq, and, or, count, sql, inArray } from "drizzle-orm"

// Test endpoint to verify session monitoring systems
export async function GET(request: NextRequest) {
  try {
    const now = new Date()
    const results: any = {
      timestamp: now.toISOString(),
      tests: [],
      noShowStats: {},
      sessionCounts: {},
      errors: []
    }

    // Test 1: Count all session statuses
    console.log("[TEST] Counting session statuses...")
    try {
      const statusCounts = await db
        .select({
          status: bookingSessions.status,
          count: count()
        })
        .from(bookingSessions)
        .groupBy(bookingSessions.status)

      results.sessionCounts = statusCounts.reduce((acc: any, item) => {
        acc[item.status] = item.count
        return acc
      }, {})

      results.tests.push({
        name: "Session Status Counts",
        status: "PASS",
        result: results.sessionCounts
      })
    } catch (error) {
      results.errors.push(`Session count test failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      results.tests.push({
        name: "Session Status Counts",
        status: "FAIL",
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // Test 2: Check no-show statuses specifically
    console.log("[TEST] Checking no-show specific statuses...")
    try {
      const noShowStatuses = ['both_no_show', 'learner_no_show', 'mentor_no_show']
      const noShowCounts = await db
        .select({
          status: bookingSessions.status,
          count: count()
        })
        .from(bookingSessions)
        .where(inArray(bookingSessions.status, noShowStatuses))
        .groupBy(bookingSessions.status)

      results.noShowStats = {
        totalNoShows: noShowCounts.reduce((sum, item) => sum + item.count, 0),
        breakdown: noShowCounts.reduce((acc: any, item) => {
          acc[item.status] = item.count
          return acc
        }, {})
      }

      results.tests.push({
        name: "No-Show Status Check",
        status: "PASS",
        result: results.noShowStats
      })
    } catch (error) {
      results.errors.push(`No-show check failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      results.tests.push({
        name: "No-Show Status Check", 
        status: "FAIL",
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // Test 3: Check sessions that might need no-show processing
    console.log("[TEST] Checking sessions needing no-show processing...")
    try {
      const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000)
      
      const candidateSessions = await db
        .select({
          id: bookingSessions.id,
          status: bookingSessions.status,
          scheduledDate: bookingSessions.scheduledDate,
          learnerJoinedAt: bookingSessions.learnerJoinedAt,
          mentorJoinedAt: bookingSessions.mentorJoinedAt,
          noShowCheckedAt: bookingSessions.noShowCheckedAt
        })
        .from(bookingSessions)
        .where(
          and(
            or(
              eq(bookingSessions.status, "confirmed"),
              eq(bookingSessions.status, "upcoming")
            ),
            sql`${bookingSessions.scheduledDate} + INTERVAL '15 minutes' < ${now}`
          )
        )
        .limit(10)

      results.tests.push({
        name: "Sessions Needing No-Show Processing",
        status: "PASS",
        result: {
          count: candidateSessions.length,
          sessions: candidateSessions.map(s => ({
            id: s.id,
            status: s.status,
            scheduledDate: s.scheduledDate,
            learnerJoined: !!s.learnerJoinedAt,
            mentorJoined: !!s.mentorJoinedAt,
            alreadyChecked: !!s.noShowCheckedAt
          }))
        }
      })
    } catch (error) {
      results.errors.push(`No-show candidate check failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      results.tests.push({
        name: "Sessions Needing No-Show Processing",
        status: "FAIL", 
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // Test 4: Check stuck ongoing sessions
    console.log("[TEST] Checking stuck ongoing sessions...")
    try {
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000)
      
      const stuckSessions = await db
        .select({
          id: bookingSessions.id,
          scheduledDate: bookingSessions.scheduledDate,
          durationMinutes: bookingSessions.durationMinutes,
          agoraCallStartedAt: bookingSessions.agoraCallStartedAt
        })
        .from(bookingSessions)
        .where(
          and(
            eq(bookingSessions.status, "ongoing"),
            sql`${bookingSessions.scheduledDate} < ${twoHoursAgo}`
          )
        )
        .limit(5)

      results.tests.push({
        name: "Stuck Ongoing Sessions",
        status: "PASS",
        result: {
          count: stuckSessions.length,
          sessions: stuckSessions.map(s => {
            const scheduledEnd = new Date(s.scheduledDate.getTime() + (s.durationMinutes || 60) * 60 * 1000)
            const hoursOverdue = Math.round((now.getTime() - scheduledEnd.getTime()) / (1000 * 60 * 60) * 10) / 10
            return {
              id: s.id,
              scheduledDate: s.scheduledDate,
              callStarted: s.agoraCallStartedAt,
              hoursOverdue
            }
          })
        }
      })
    } catch (error) {
      results.errors.push(`Stuck session check failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      results.tests.push({
        name: "Stuck Ongoing Sessions",
        status: "FAIL",
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // Test 5: Test import functionality
    console.log("[TEST] Testing service imports...")
    try {
      const { SessionManagementService } = await import("@/lib/sessions/session-management")
      const { AutoSessionMonitor } = await import("@/lib/sessions/auto-session-monitor") 
      const { BookingLifecycleService } = await import("@/lib/sessions/booking-lifecycle")
      
      const sessionService = SessionManagementService.getInstance()
      const autoMonitor = AutoSessionMonitor.getInstance()
      const lifecycleService = BookingLifecycleService.getInstance()

      results.tests.push({
        name: "Service Import Test",
        status: "PASS",
        result: {
          sessionService: !!sessionService,
          autoMonitor: !!autoMonitor,
          lifecycleService: !!lifecycleService
        }
      })
    } catch (error) {
      results.errors.push(`Service import failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      results.tests.push({
        name: "Service Import Test",
        status: "FAIL",
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // Overall status
    const failedTests = results.tests.filter((t: any) => t.status === "FAIL")
    const overallStatus = failedTests.length === 0 ? "PASS" : "FAIL"

    return NextResponse.json({
      success: true,
      overallStatus,
      totalTests: results.tests.length,
      failedTests: failedTests.length,
      ...results
    })

  } catch (error) {
    console.error("[TEST] Error in session monitoring test:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// Also allow POST requests
export async function POST(request: NextRequest) {
  return GET(request)
}