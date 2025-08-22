import { NextRequest, NextResponse } from "next/server"
import { withRateLimit } from "@/lib/middleware/rate-limit"
import { runNoShowCheck } from "@/lib/sessions/session-management"

async function handleNoShowCheck(request: NextRequest) {
  try {
    // This endpoint should be called by cron jobs or admin tools
    // In production, you might want to add API key authentication here
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const results = await runNoShowCheck()
    
    return NextResponse.json({
      success: true,
      message: `Processed ${results.processed} sessions for no-show check`,
      processed: results.processed,
      errors: results.errors,
      results: results.results.map(r => ({
        sessionId: r.sessionId,
        learnerNoShow: r.learnerNoShow,
        mentorNoShow: r.mentorNoShow,
        refundProcessed: r.refundProcessed,
        refundAmount: r.refundAmount,
        mentorPayout: r.mentorPayout
      }))
    })

  } catch (error) {
    console.error("Error running no-show check:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Apply admin rate limiting since this is a maintenance endpoint
export const POST = withRateLimit('admin', handleNoShowCheck)