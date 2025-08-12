import { NextResponse } from "next/server"
import { db } from "@/db"
import { mentorSkills, mentorSkillCategories, mentors, users, skillCategories } from "@/db/schema"
import { eq, sql } from "drizzle-orm"
import { getSession } from "@/lib/auth/getSession"

export async function GET() {
  try {
    const session = await getSession()
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all skills with their current category assignments
    const allSkills = await db
      .select({
        skillName: mentorSkills.skillName,
        mentorCount: sql<number>`COUNT(DISTINCT ${mentors.id})`.as("mentorCount"),
        mentorNames: sql<string[]>`ARRAY_AGG(DISTINCT CONCAT(${users.firstName}, ' ', ${users.lastName}))`.as(
          "mentorNames",
        ),
        categoryCount: sql<number>`COUNT(DISTINCT ${mentorSkillCategories.categoryId})`.as("categoryCount"),
        categories: sql<
          string[]
        >`ARRAY_AGG(DISTINCT ${skillCategories.name}) FILTER (WHERE ${skillCategories.name} IS NOT NULL)`.as(
          "categories",
        ),
      })
      .from(mentorSkills)
      .innerJoin(mentors, eq(mentorSkills.mentorId, mentors.id))
      .innerJoin(users, eq(mentors.userId, users.id))
      .leftJoin(mentorSkillCategories, eq(mentorSkills.id, mentorSkillCategories.mentorSkillId))
      .leftJoin(skillCategories, eq(mentorSkillCategories.categoryId, skillCategories.id))
      .where(eq(mentorSkills.isActive, true))
      .groupBy(mentorSkills.skillName)
      .orderBy(mentorSkills.skillName)

    // Transform the data
    const transformedSkills = allSkills.map((skill) => ({
      skillName: skill.skillName,
      mentorCount: Number(skill.mentorCount) || 0,
      mentorNames: skill.mentorNames?.filter(Boolean) || [],
      categoryCount: Number(skill.categoryCount) || 0,
      categories: skill.categories?.filter(Boolean) || [],
      isUnassigned: Number(skill.categoryCount) === 0,
    }))

    return NextResponse.json({ allSkills: transformedSkills })
  } catch (error) {
    console.error("Error fetching all skills:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
