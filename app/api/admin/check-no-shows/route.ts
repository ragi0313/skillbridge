import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth/getSession"
import { runNoShowCheck } from "@/lib/sessions/session-management"

export async function POST(_request: NextRequest) {
  try {
    // Temporarily disable auth for testing - REMOVE IN PRODUCTION
    const testMode = process.env.NODE_ENV === 'development'
    
    if (!testMode) {
      // Check if user is admin (you can modify this based on your admin system)
      const session = await getSession()
      if (!session?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      console.log(`No-show check triggered by user ${session.id}`)
    } else {
      console.log(`No-show check triggered in test mode`)
    }

    const results = await runNoShowCheck()
    
    return NextResponse.json({
      success: true,
      message: `Processed ${results.processed} sessions for no-show check`,
      processed: results.processed,
      errors: results.errors,
      results: results.results && results.results.length > 0 ? results.results.map(r => ({
        sessionId: r.sessionId,
        learnerNoShow: r.learnerNoShow,
        mentorNoShow: r.mentorNoShow,
        refundProcessed: r.refundProcessed,
        refundAmount: r.refundAmount,
        mentorPayout: r.mentorPayout
      })) : []
    })

  } catch (error) {
    console.error("Error running no-show check:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Also allow GET for easy testing
export async function GET(request: NextRequest) {
  return POST(request)
}