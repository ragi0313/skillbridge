import { NextResponse } from 'next/server'
import { db } from '@/db'
import { skillCategories, mentorSkillCategories, mentorSkills, mentors } from '@/db/schema'
import { sql, eq } from 'drizzle-orm'

export async function GET() {
  try {
    // Get all skill categories with mentor count
    const categoriesWithCounts = await db
      .select({
        id: skillCategories.id,
        name: skillCategories.name,
        description: skillCategories.description,
        mentorCount: sql<number>`count(distinct ${mentors.id})`.as('mentorCount'),
      })
      .from(skillCategories)
      .leftJoin(mentorSkillCategories, eq(skillCategories.id, mentorSkillCategories.categoryId))
      .leftJoin(mentorSkills, eq(mentorSkillCategories.mentorSkillId, mentorSkills.id))
      .leftJoin(mentors, eq(mentorSkills.mentorId, mentors.id))
      .groupBy(skillCategories.id, skillCategories.name, skillCategories.description)

    // Get popular skills for each category (top 3)
    const categoriesWithSkills = await Promise.all(
      categoriesWithCounts.map(async (category) => {
        const topSkills = await db
          .select({
            skillName: mentorSkills.skillName,
            count: sql<number>`count(*)`.as('count'),
          })
          .from(mentorSkillCategories)
          .innerJoin(mentorSkills, eq(mentorSkillCategories.mentorSkillId, mentorSkills.id))
          .where(eq(mentorSkillCategories.categoryId, category.id))
          .groupBy(mentorSkills.skillName)
          .orderBy(sql`count(*) desc`)
          .limit(3)

        return {
          ...category,
          skills: topSkills.map(s => s.skillName)
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: categoriesWithSkills
    })
  } catch (error) {
    console.error('[LANDING_CATEGORIES] Error:', error)
    // Return empty array on error
    return NextResponse.json({
      success: true,
      data: []
    })
  }
}
