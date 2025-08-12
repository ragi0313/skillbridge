import { db } from "@/db"
import { mentorSkillCategories } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth/getSession"

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { assignments } = await request.json()

    if (!Array.isArray(assignments)) {
      return NextResponse.json({ error: "Assignments must be an array" }, { status: 400 })
    }

    // Process each assignment
    for (const assignment of assignments) {
      const { mentorSkillId, categoryId } = assignment

      if (!mentorSkillId || !categoryId) {
        continue // Skip invalid assignments
      }

      // Check if assignment already exists
      const existing = await db
        .select()
        .from(mentorSkillCategories)
        .where(
          and(eq(mentorSkillCategories.mentorSkillId, mentorSkillId), eq(mentorSkillCategories.categoryId, categoryId)),
        )
        .limit(1)

      if (existing.length === 0) {
        // Create new assignment
        await db.insert(mentorSkillCategories).values({
          mentorSkillId,
          categoryId,
          createdBy: session.id,
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error creating skill category assignments:", error)
    return NextResponse.json({ error: "Failed to create assignments" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSession()
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { mentorSkillId, categoryId } = await request.json()

    if (!mentorSkillId || !categoryId) {
      return NextResponse.json({ error: "Mentor skill ID and category ID are required" }, { status: 400 })
    }

    await db
      .delete(mentorSkillCategories)
      .where(
        and(eq(mentorSkillCategories.mentorSkillId, mentorSkillId), eq(mentorSkillCategories.categoryId, categoryId)),
      )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting skill category assignment:", error)
    return NextResponse.json({ error: "Failed to delete assignment" }, { status: 500 })
  }
}
