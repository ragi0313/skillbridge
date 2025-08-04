import { db } from "@/db"
import { mentorAvailability } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { getSession } from "@/lib/auth/getSession"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await getSession()

  if (!session || session.role !== "mentor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const availability = await db.select().from(mentorAvailability).where(eq(mentorAvailability.mentorId, session.id)) // Assuming 
    return NextResponse.json({ availability })
  } catch (error) {
    console.error("Error fetching mentor availability:", error)
    return NextResponse.json({ error: "Failed to fetch availability" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getSession()

  if (!session || session.role !== "mentor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { day, startTime, endTime, isActive } = await req.json()

  if (!day || !startTime || !endTime) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  try {
    const [newAvailability] = await db
      .insert(mentorAvailability)
      .values({
        mentorId: session.id, // Assuming mentorId is userId for simplicity here
        day,
        startTime,
        endTime,
        isActive: isActive ?? true,
      })
      .returning()

    return NextResponse.json({ availability: newAvailability }, { status: 201 })
  } catch (error) {
    console.error("Error adding mentor availability:", error)
    return NextResponse.json({ error: "Failed to add availability" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  const session = await getSession()

  if (!session || session.role !== "mentor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id, day, startTime, endTime, isActive } = await req.json()

  if (!id || !day || !startTime || !endTime) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  try {
    const [updatedAvailability] = await db
      .update(mentorAvailability)
      .set({
        day,
        startTime,
        endTime,
        isActive,
        updatedAt: new Date(),
      })
      .where(and(eq(mentorAvailability.id, id), eq(mentorAvailability.mentorId, session.id)))
      .returning()

    if (!updatedAvailability) {
      return NextResponse.json({ error: "Availability not found or unauthorized" }, { status: 404 })
    }

    return NextResponse.json({ availability: updatedAvailability })
  } catch (error) {
    console.error("Error updating mentor availability:", error)
    return NextResponse.json({ error: "Failed to update availability" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const session = await getSession()

  if (!session || session.role !== "mentor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await req.json()

  if (!id) {
    return NextResponse.json({ error: "Missing availability ID" }, { status: 400 })
  }

  try {
    const [deletedAvailability] = await db
      .delete(mentorAvailability)
      .where(and(eq(mentorAvailability.id, id), eq(mentorAvailability.mentorId, session.id)))
      .returning()

    if (!deletedAvailability) {
      return NextResponse.json({ error: "Availability not found or unauthorized" }, { status: 404 })
    }

    return NextResponse.json({ message: "Availability deleted successfully" })
  } catch (error) {
    console.error("Error deleting mentor availability:", error)
    return NextResponse.json({ error: "Failed to delete availability" }, { status: 500 })
  }
}
