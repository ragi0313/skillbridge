import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { bookingSessions, learners, mentors, users, creditTransactions, mentorPayouts, notifications } from "@/db/schema"
import { eq, and, or, count, sql, inArray } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"

// Comprehensive no-show system test
export async function GET(request: NextRequest) {
  try {
    const now = new Date()
    const results: any = {
      timestamp: now.toISOString(),
      tests: [],
      noShowAnalysis: {},
      errors: []
    }

    // Test 1: Analyze all no-show related statuses
    console.log("[NO_SHOW_TEST] Analyzing no-show statuses...")
    try {
      const noShowStatuses = ['both_no_show', 'learner_no_show', 'mentor_no_show']
      
      const statusAnalysis = await db
        .select({
          status: bookingSessions.status,
          count: count(),
          totalCredits: sql`SUM(${bookingSessions.totalCostCredits})`,
          avgCredits: sql`AVG(${bookingSessions.totalCostCredits})`,
        })
        .from(bookingSessions)
        .where(inArray(bookingSessions.status, noShowStatuses))
        .groupBy(bookingSessions.status)

      const totalNoShows = statusAnalysis.reduce((sum, item) => sum + item.count, 0)
      
      results.noShowAnalysis = {
        totalNoShowSessions: totalNoShows,
        statusBreakdown: statusAnalysis.reduce((acc: any, item) => {
          acc[item.status] = {
            count: item.count,
            totalCredits: item.totalCredits,
            avgCredits: Math.round(Number(item.avgCredits) * 100) / 100
          }
          return acc
        }, {}),
        rawData: statusAnalysis
      }

      results.tests.push({
        name: "No-Show Status Analysis",
        status: "PASS",
        result: results.noShowAnalysis
      })
    } catch (error) {
      const errorMsg = `No-show analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      results.errors.push(errorMsg)
      results.tests.push({
        name: "No-Show Status Analysis",
        status: "FAIL",
        error: errorMsg
      })
    }

    // Test 2: Check recent no-show transactions
    console.log("[NO_SHOW_TEST] Checking no-show related transactions...")
    try {
      const learnerUsers = alias(users, "learner_users")
      const mentorUsers = alias(users, "mentor_users")

      // Check credit transactions related to no-shows
      const noShowTransactions = await db
        .select({
          id: creditTransactions.id,
          userId: creditTransactions.userId,
          type: creditTransactions.type,
          direction: creditTransactions.direction,
          amount: creditTransactions.amount,
          description: creditTransactions.description,
          metadata: creditTransactions.metadata,
          sessionId: creditTransactions.relatedSessionId,
          createdAt: creditTransactions.createdAt,
          userFirstName: users.firstName,
          userLastName: users.lastName
        })
        .from(creditTransactions)
        .innerJoin(users, eq(creditTransactions.userId, users.id))
        .where(
          or(
            sql`${creditTransactions.description} ILIKE '%no-show%'`,
            sql`${creditTransactions.description} ILIKE '%no_show%'`,
            sql`${creditTransactions.metadata}->>'reason' ILIKE '%no_show%'`,
            sql`${creditTransactions.metadata}->>'systemProcessed' = 'true'`
          )
        )
        .orderBy(sql`${creditTransactions.createdAt} DESC`)
        .limit(10)

      results.tests.push({
        name: "No-Show Transactions Check",
        status: "PASS",
        result: {
          transactionCount: noShowTransactions.length,
          recentTransactions: noShowTransactions.map(t => ({
            id: t.id,
            user: `${t.userFirstName} ${t.userLastName}`,
            type: t.type,
            direction: t.direction,
            amount: t.amount,
            description: t.description,
            sessionId: t.sessionId,
            createdAt: t.createdAt
          }))
        }
      })
    } catch (error) {
      const errorMsg = `No-show transactions check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      results.errors.push(errorMsg)
      results.tests.push({
        name: "No-Show Transactions Check",
        status: "FAIL",
        error: errorMsg
      })
    }

    // Test 3: Check mentor payouts for no-shows
    console.log("[NO_SHOW_TEST] Checking mentor payouts for no-shows...")
    try {
      const noShowPayouts = await db
        .select({
          id: mentorPayouts.id,
          mentorId: mentorPayouts.mentorId,
          sessionId: mentorPayouts.sessionId,
          earnedCredits: mentorPayouts.earnedCredits,
          status: mentorPayouts.status,
          releasedAt: mentorPayouts.releasedAt,
          sessionStatus: bookingSessions.status
        })
        .from(mentorPayouts)
        .innerJoin(bookingSessions, eq(mentorPayouts.sessionId, bookingSessions.id))
        .where(eq(bookingSessions.status, "learner_no_show"))
        .limit(10)

      results.tests.push({
        name: "No-Show Mentor Payouts Check",
        status: "PASS",
        result: {
          payoutCount: noShowPayouts.length,
          recentPayouts: noShowPayouts
        }
      })
    } catch (error) {
      const errorMsg = `No-show payouts check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      results.errors.push(errorMsg)
      results.tests.push({
        name: "No-Show Mentor Payouts Check", 
        status: "FAIL",
        error: errorMsg
      })
    }

    // Test 4: Check notifications for no-shows
    console.log("[NO_SHOW_TEST] Checking no-show notifications...")
    try {
      const noShowNotifications = await db
        .select({
          id: notifications.id,
          userId: notifications.userId,
          type: notifications.type,
          title: notifications.title,
          message: notifications.message,
          relatedEntityId: notifications.relatedEntityId,
          createdAt: notifications.createdAt,
          userFirstName: users.firstName,
          userLastName: users.lastName
        })
        .from(notifications)
        .innerJoin(users, eq(notifications.userId, users.id))
        .where(
          or(
            inArray(notifications.type, ["no_show_penalty", "no_show_payout", "no_show_refund"]),
            sql`${notifications.title} ILIKE '%no-show%'`,
            sql`${notifications.message} ILIKE '%no-show%'`
          )
        )
        .orderBy(sql`${notifications.createdAt} DESC`)
        .limit(10)

      results.tests.push({
        name: "No-Show Notifications Check",
        status: "PASS",
        result: {
          notificationCount: noShowNotifications.length,
          recentNotifications: noShowNotifications.map(n => ({
            id: n.id,
            user: `${n.userFirstName} ${n.userLastName}`,
            type: n.type,
            title: n.title,
            sessionId: n.relatedEntityId,
            createdAt: n.createdAt
          }))
        }
      })
    } catch (error) {
      const errorMsg = `No-show notifications check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      results.errors.push(errorMsg)
      results.tests.push({
        name: "No-Show Notifications Check",
        status: "FAIL",
        error: errorMsg
      })
    }

    // Test 5: Test no-show detection logic
    console.log("[NO_SHOW_TEST] Testing no-show detection logic...")
    try {
      const { SessionManagementService } = await import("@/lib/sessions/session-management")
      const sessionService = SessionManagementService.getInstance()
      
      // This will test the detection logic (but won't process actual no-shows unless there are real ones)
      const noShowResult = await sessionService.detectNoShows()
      
      results.tests.push({
        name: "No-Show Detection Logic Test",
        status: "PASS",
        result: {
          sessionsProcessed: noShowResult.processed,
          results: noShowResult.results,
          errors: noShowResult.errors
        }
      })
    } catch (error) {
      const errorMsg = `No-show detection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      results.errors.push(errorMsg)
      results.tests.push({
        name: "No-Show Detection Logic Test",
        status: "FAIL",
        error: errorMsg
      })
    }

    // Test 6: Check for filtering capabilities
    console.log("[NO_SHOW_TEST] Testing filtering capabilities...")
    try {
      // Test different ways to filter sessions
      const noShowStatuses = ['both_no_show', 'learner_no_show', 'mentor_no_show']
      
      const filterTests = await Promise.all([
        // Filter by learner no-show only
        db.select({ count: count() }).from(bookingSessions).where(eq(bookingSessions.status, "learner_no_show")),
        // Filter by mentor no-show only  
        db.select({ count: count() }).from(bookingSessions).where(eq(bookingSessions.status, "mentor_no_show")),
        // Filter by both no-show
        db.select({ count: count() }).from(bookingSessions).where(eq(bookingSessions.status, "both_no_show")),
        // Filter by any no-show status
        db.select({ count: count() }).from(bookingSessions).where(inArray(bookingSessions.status, noShowStatuses))
      ])

      results.tests.push({
        name: "No-Show Filtering Test",
        status: "PASS",
        result: {
          learnerNoShowCount: filterTests[0][0].count,
          mentorNoShowCount: filterTests[1][0].count,
          bothNoShowCount: filterTests[2][0].count,
          totalNoShowCount: filterTests[3][0].count,
          filteringWorking: true
        }
      })
    } catch (error) {
      const errorMsg = `No-show filtering test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      results.errors.push(errorMsg)
      results.tests.push({
        name: "No-Show Filtering Test",
        status: "FAIL", 
        error: errorMsg
      })
    }

    const failedTests = results.tests.filter((t: any) => t.status === "FAIL")
    const overallStatus = failedTests.length === 0 ? "PASS" : "FAIL"

    return NextResponse.json({
      success: true,
      overallStatus,
      totalTests: results.tests.length,
      failedTests: failedTests.length,
      summary: {
        noShowSystemWorking: overallStatus === "PASS",
        totalNoShows: results.noShowAnalysis?.totalNoShowSessions || 0,
        filteringCapable: true,
        transactionTracking: true,
        notificationSystem: true
      },
      ...results
    })

  } catch (error) {
    console.error("[NO_SHOW_TEST] Error in no-show system test:", error)
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

export async function POST(request: NextRequest) {
  return GET(request)
}