import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { bookingSessions, mentors, learners } from "@/db/schema"
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

    const result = await db.transaction(async (tx) => {
      // Get booking session details
      const [booking] = await tx
        .select({
          id: bookingSessions.id,
          mentorId: bookingSessions.mentorId,
          learnerId: bookingSessions.learnerId,
          status: bookingSessions.status,
        })
        .from(bookingSessions)
        .where(eq(bookingSessions.id, sessionId))

      if (!booking) {
        throw new Error("Session not found")
      }

      // Verify user has permission to archive
      let userCanArchive = false

      if (session.role === "learner") {
        const [learner] = await tx.select({ id: learners.id }).from(learners).where(eq(learners.userId, session.id))

        if (learner && learner.id === booking.learnerId) {
          userCanArchive = true
        }
      } else if (session.role === "mentor") {
        const [mentor] = await tx.select({ id: mentors.id }).from(mentors).where(eq(mentors.userId, session.id))

        if (mentor && mentor.id === booking.mentorId) {
          userCanArchive = true
        }
      } else if (session.role === "admin") {
        userCanArchive = true
      }

      if (!userCanArchive) {
        throw new Error("You are not authorized to archive this session")
      }

      // Update session to archived
      await tx
        .update(bookingSessions)
        .set({
          archived: true,
          updatedAt: new Date(),
        })
        .where(eq(bookingSessions.id, sessionId))

      return {
        success: true,
        message: "Session archived successfully",
      }
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Error archiving session:", error)
    return NextResponse.json({ error: error.message || "Failed to archive session" }, { status: 500 })
  }
}
