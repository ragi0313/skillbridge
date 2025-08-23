import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { sessionVisibility, bookingSessions, learners, mentors } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { getSession } from "@/lib/auth/getSession"

// GET - Get session visibility status
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const sessionId = parseInt(id)

    if (!sessionId || isNaN(sessionId)) {
      return NextResponse.json({ error: "Invalid session ID" }, { status: 400 })
    }

    // Check if visibility record exists
    const [visibility] = await db
      .select()
      .from(sessionVisibility)
      .where(and(
        eq(sessionVisibility.sessionId, sessionId),
        eq(sessionVisibility.userId, session.id)
      ))

    return NextResponse.json({
      isHidden: visibility?.isHidden || false,
    })
  } catch (error) {
    console.error("Error getting session visibility:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Toggle session visibility
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const sessionId = parseInt(id)

    if (!sessionId || isNaN(sessionId)) {
      return NextResponse.json({ error: "Invalid session ID" }, { status: 400 })
    }

    const { isHidden } = await request.json()

    if (typeof isHidden !== 'boolean') {
      return NextResponse.json({ error: "isHidden must be a boolean" }, { status: 400 })
    }

    // Verify user has access to this session
    const [bookingSession] = await db
      .select({
        id: bookingSessions.id,
        learnerId: bookingSessions.learnerId,
        mentorId: bookingSessions.mentorId,
      })
      .from(bookingSessions)
      .where(eq(bookingSessions.id, sessionId))

    if (!bookingSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // Check if user has access to this session
    let hasAccess = false
    
    if (session.role === "learner") {
      const [learner] = await db
        .select({ id: learners.id })
        .from(learners)
        .where(eq(learners.userId, session.id))
      
      if (learner && learner.id === bookingSession.learnerId) {
        hasAccess = true
      }
    } else if (session.role === "mentor") {
      const [mentor] = await db
        .select({ id: mentors.id })
        .from(mentors)
        .where(eq(mentors.userId, session.id))
      
      if (mentor && mentor.id === bookingSession.mentorId) {
        hasAccess = true
      }
    }

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Check if visibility record exists
    const [existingVisibility] = await db
      .select()
      .from(sessionVisibility)
      .where(and(
        eq(sessionVisibility.sessionId, sessionId),
        eq(sessionVisibility.userId, session.id)
      ))

    if (existingVisibility) {
      // Update existing record
      await db
        .update(sessionVisibility)
        .set({
          isHidden,
          hiddenAt: isHidden ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(sessionVisibility.id, existingVisibility.id))
    } else {
      // Create new record
      await db
        .insert(sessionVisibility)
        .values({
          sessionId,
          userId: session.id,
          isHidden,
          hiddenAt: isHidden ? new Date() : null,
        })
    }

    return NextResponse.json({
      success: true,
      isHidden,
      message: isHidden ? "Session hidden successfully" : "Session shown successfully",
    })
  } catch (error) {
    console.error("Error toggling session visibility:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}