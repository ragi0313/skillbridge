import { NextResponse } from "next/server"
import { db } from "@/db"
import { skillCategories, mentorSkillCategories, mentorSkills, mentors, users } from "@/db/schema"
import { eq, and, sql } from "drizzle-orm"

export async function GET() {
  try {
    // Get categories with mentor counts
    const categoriesWithCounts = await db
      .select({
        id: skillCategories.id,
        name: skillCategories.name,
        description: skillCategories.description,
        mentorCount: sql<number>`COUNT(DISTINCT ${mentors.id})`.as("mentor_count"),
      })
      .from(skillCategories)
      .leftJoin(mentorSkillCategories, eq(skillCategories.id, mentorSkillCategories.categoryId))
      .leftJoin(
        mentorSkills,
        and(eq(mentorSkillCategories.mentorSkillId, mentorSkills.id), eq(mentorSkills.isActive, true)),
      )
      .leftJoin(mentors, eq(mentorSkills.mentorId, mentors.id))
      .leftJoin(users, and(eq(mentors.userId, users.id), eq(users.role, "mentor")))
      .groupBy(skillCategories.id, skillCategories.name, skillCategories.description)
      .orderBy(skillCategories.name)

    return NextResponse.json({ categories: categoriesWithCounts })
  } catch (error) {
    console.error("Error fetching categories with counts:", error)
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 })
  }
}
