import { NextResponse } from "next/server"
import { db } from "@/db"
import { mentorSkills, mentorSkillCategories, mentors, users } from "@/db/schema"
import { eq, sql } from "drizzle-orm"
import { getSession } from "@/lib/auth/getSession"

export async function GET() {
  try {
    const session = await getSession()
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all skills that have NO category assignments (completely unassigned)
    const unassignedSkills = await db
      .select({
        skillName: mentorSkills.skillName,
        mentorCount: sql<number>`COUNT(DISTINCT ${mentors.id})`.as("mentorCount"),
        mentorNames: sql<string[]>`ARRAY_AGG(DISTINCT CONCAT(${users.firstName}, ' ', ${users.lastName}))`.as(
          "mentorNames",
        ),
      })
      .from(mentorSkills)
      .innerJoin(mentors, eq(mentorSkills.mentorId, mentors.id))
      .innerJoin(users, eq(mentors.userId, users.id))
      .leftJoin(mentorSkillCategories, eq(mentorSkills.id, mentorSkillCategories.mentorSkillId))
      .where(
        sql`${mentorSkills.isActive} = true 
            AND ${mentorSkillCategories.mentorSkillId} IS NULL`,
      )
      .groupBy(mentorSkills.skillName)
      .orderBy(mentorSkills.skillName)

    // Transform the data
    const transformedSkills = unassignedSkills.map((skill) => ({
      skillName: skill.skillName,
      mentorCount: Number(skill.mentorCount) || 0,
      mentorNames: skill.mentorNames?.filter(Boolean) || [],
    }))

    return NextResponse.json({ unassignedSkills: transformedSkills })
  } catch (error) {
    console.error("Error fetching unassigned skills:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
