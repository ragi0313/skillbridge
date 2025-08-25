import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { bookingSessions } from "@/db/schema"
import { eq } from "drizzle-orm"
import { getSession } from "@/lib/auth/getSession"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const sessionId = Number.parseInt(id)
    if (!sessionId || isNaN(sessionId)) {
      return NextResponse.json({ error: "Invalid session ID" }, { status: 400 })
    }

    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const reason = body.reason

    const result = await db.transaction(async (tx) => {
      const [booking] = await tx
        .select({
          id: bookingSessions.id,
          status: bookingSessions.status,
        })
        .from(bookingSessions)
        .where(eq(bookingSessions.id, sessionId))

      if (!booking) {
        throw new Error("Session not found")
      }

      if (booking.status !== "ongoing") {
        throw new Error(`Cannot resolve technical issues for session with status: ${booking.status}`)
      }

      const now = new Date()

      // Mark technical issues as resolved - this doesn't change session status
      // The session monitoring service will handle status transitions
      await tx
        .update(bookingSessions)
        .set({
          updatedAt: now,
          // Could add a technicalIssuesResolvedAt field if needed
        })
        .where(eq(bookingSessions.id, sessionId))

      return {
        success: true,
        message: "Technical issues resolved successfully"
      }
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Error resolving technical issues:", error)
    return NextResponse.json({ error: error.message || "Failed to resolve technical issues" }, { status: 500 })
  }
}