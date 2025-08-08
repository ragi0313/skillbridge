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

    const body = await request.json()
    const { noShowParty } = body

    if (!['learner', 'mentor'].includes(noShowParty)) {
      return NextResponse.json({ error: "Invalid no-show party specified" }, { status: 400 })
    }

    const bookingLifecycle = BookingLifecycleService.getInstance()
    const result = await bookingLifecycle.handleNoShow(sessionId, noShowParty, session.id)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: "No-show processed successfully",
    })

  } catch (error: any) {
    console.error("Error processing no-show:", error)
    return NextResponse.json(
      { error: error.message || "Failed to process no-show" },
      { status: 500 }
    )
  }
}
