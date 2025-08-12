import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { mentorSkills, mentorSkillCategories } from "@/db/schema"
import { eq, and, or, sql, inArray } from "drizzle-orm"
import { getSession } from "@/lib/auth/getSession"

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { categoryId, skillNames } = await request.json()

    if (!categoryId || !skillNames || !Array.isArray(skillNames) || skillNames.length === 0) {
      return NextResponse.json({ error: "Category ID and skill names are required" }, { status: 400 })
    }

    // Lowercase all skill names
    const lowerCaseSkillNames = skillNames.map((name) => name.toLowerCase())

    // Match skills using ANY() with a real Postgres text[] literal
    const matchingSkills = await db
      .select({
        id: mentorSkills.id,
        skillName: mentorSkills.skillName,
      })
      .from(mentorSkills)
      .where(
        and(
          sql`LOWER(${mentorSkills.skillName}) = ANY(ARRAY[${sql.join(
            lowerCaseSkillNames.map((v) => sql`${v}`),
            sql`,`
          )}]::text[])`,
          eq(mentorSkills.isActive, true),
        ),
      )

    if (matchingSkills.length === 0) {
      return NextResponse.json({ error: "No skills found matching the provided names" }, { status: 400 })
    }

    // Check for existing assignments
    const existingAssignments = await db
      .select({
        mentorSkillId: mentorSkillCategories.mentorSkillId,
      })
      .from(mentorSkillCategories)
      .where(
        and(
          eq(mentorSkillCategories.categoryId, categoryId),
          inArray(mentorSkillCategories.mentorSkillId, matchingSkills.map((skill) => skill.id)),
        ),
      )

    const existingSkillIds = new Set(existingAssignments.map((a) => a.mentorSkillId))

    const skillsToAssign = matchingSkills.filter((skill) => !existingSkillIds.has(skill.id))
    const alreadyAssignedSkills = matchingSkills.filter((skill) => existingSkillIds.has(skill.id))

    if (skillsToAssign.length === 0) {
      return NextResponse.json(
        {
          error: "All matching skills are already assigned to this category",
          alreadyAssigned: alreadyAssignedSkills.map((skill) => skill.skillName),
        },
        { status: 400 },
      )
    }

    const assignments = skillsToAssign.map((skill) => ({
      mentorSkillId: skill.id,
      categoryId: categoryId,
      createdBy: session.id,
    }))

    await db.insert(mentorSkillCategories).values(assignments)

    const response: any = {
      message: `Successfully assigned ${skillsToAssign.length} skill(s) to category`,
      assignedSkills: skillsToAssign.map((skill) => skill.skillName),
    }

    if (alreadyAssignedSkills.length > 0) {
      response.alreadyAssigned = alreadyAssignedSkills.map((skill) => skill.skillName)
      response.message += ` (${alreadyAssignedSkills.length} skill(s) were already assigned to this category)`
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error assigning skills to category:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
