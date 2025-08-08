import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth/getSession"
import { BookingLifecycleService } from "@/lib/sessions/booking-lifecycle"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sessionId = parseInt(params.id)
    if (!sessionId || isNaN(sessionId)) {
      return NextResponse.json({ error: "Invalid session ID" }, { status: 400 })
    }

    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const reason = body.reason

    const bookingLifecycle = BookingLifecycleService.getInstance()

    // Use the comprehensive cancellation system
    const result = await bookingLifecycle.cancelBooking(
      sessionId, 
      session.id, 
      session.role as 'learner' | 'mentor', 
      reason
    )

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    // Return detailed cancellation information
    return NextResponse.json({
      success: true,
      message: "Booking cancelled successfully",
      refundAmount: result.refundAmount,
      refundType: result.refundType,
      mentorPayout: result.mentorPayout,
    })

  } catch (error: any) {
    console.error("Error cancelling booking:", error)
    return NextResponse.json(
      { error: error.message || "Failed to cancel booking" },
      { status: 500 }
    )
  }
}
