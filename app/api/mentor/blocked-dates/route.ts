import { db } from "@/db"
import { mentorBlockedDates } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { getSession } from "@/lib/auth/getSession"
import { NextResponse } from "next/server"
import { format } from "date-fns"

export async function GET() {
  const session = await getSession()

  if (!session || session.role !== "mentor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const blockedDates = await db.select().from(mentorBlockedDates).where(eq(mentorBlockedDates.mentorId, session.id))

    return NextResponse.json({ blockedDates })
  } catch (error) {
    console.error("Error fetching mentor blocked dates:", error)
    return NextResponse.json({ error: "Failed to fetch blocked dates" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getSession()

  if (!session || session.role !== "mentor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { date, reason } = await req.json()

  if (!date) {
    return NextResponse.json({ error: "Date is required" }, { status: 400 })
  }

  // Ensure date is stored as YYYY-MM-DD to match Drizzle's 'date' type
  const parsedDate = new Date(date)

  try {
    const [newBlockedDate] = await db
      .insert(mentorBlockedDates)
      .values({
        mentorId: session.id,
        blockedDate: parsedDate,
        reason,
      })
      .returning()

    return NextResponse.json({ blockedDate: newBlockedDate }, { status: 201 })
  } catch (error) {
    console.error("Error adding mentor blocked date:", error)
    return NextResponse.json({ error: "Failed to add blocked date" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const session = await getSession()

  if (!session || session.role !== "mentor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await req.json()

  if (!id) {
    return NextResponse.json({ error: "Missing blocked date ID" }, { status: 400 })
  }

  try {
    const [deletedBlockedDate] = await db
      .delete(mentorBlockedDates)
      .where(and(eq(mentorBlockedDates.id, id), eq(mentorBlockedDates.mentorId, session.id)))
      .returning()

    if (!deletedBlockedDate) {
      return NextResponse.json({ error: "Blocked date not found or unauthorized" }, { status: 404 })
    }

    return NextResponse.json({ message: "Blocked date deleted successfully" })
  } catch (error) {
    console.error("Error deleting mentor blocked date:", error)
    return NextResponse.json({ error: "Failed to delete blocked date" }, { status: 500 })
  }
}
