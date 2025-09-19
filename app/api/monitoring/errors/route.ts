import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth/getSession"
import { logger } from "@/lib/monitoring/logger"

// Error reporting endpoint for client-side errors
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    const body = await request.json()

    const {
      message,
      stack,
      url,
      lineNumber,
      columnNumber,
      userAgent,
      timestamp,
      context
    } = body

    // Validate required fields
    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    // Create error object
    const error = new Error(message)
    if (stack) error.stack = stack

    // Log the client-side error
    logger.error('Client-side error reported', {
      url,
      lineNumber,
      columnNumber,
      userAgent,
      timestamp,
      context,
      userId: session?.id,
      userRole: session?.role
    }, error)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error processing error report:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Get error logs (admin only)
export async function GET(request: NextRequest) {
  const session = await getSession()

  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // This is a placeholder - in production you'd query your logging service
  // For now, just return a success response
  return NextResponse.json({
    message: "Error logs endpoint - integrate with your logging service",
    note: "Check your logging service dashboard for detailed error analysis"
  })
}