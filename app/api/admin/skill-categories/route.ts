import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { skillCategories, mentorSkillCategories, mentorSkills, mentors, users } from "@/db/schema"
import { eq, sql } from "drizzle-orm"
import { getSession } from "@/lib/auth/getSession"

export async function GET() {
  try {
    const session = await getSession()
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch categories with mentor counts and skills
    const categoriesWithStats = await db
      .select({
        id: skillCategories.id,
        name: skillCategories.name,
        description: skillCategories.description,
        createdAt: skillCategories.createdAt,
        updatedAt: skillCategories.updatedAt,
        mentorCount: sql<number>`COUNT(DISTINCT ${mentors.id})`.as("mentorCount"),
        skills: sql<
          string[]
        >`ARRAY_AGG(DISTINCT ${mentorSkills.skillName}) FILTER (WHERE ${mentorSkills.skillName} IS NOT NULL)`.as(
          "skills",
        ),
      })
      .from(skillCategories)
      .leftJoin(mentorSkillCategories, eq(skillCategories.id, mentorSkillCategories.categoryId))
      .leftJoin(mentorSkills, eq(mentorSkillCategories.mentorSkillId, mentorSkills.id))
      .leftJoin(mentors, eq(mentorSkills.mentorId, mentors.id))
      .leftJoin(users, eq(mentors.userId, users.id))
      .groupBy(
        skillCategories.id,
        skillCategories.name,
        skillCategories.description,
        skillCategories.createdAt,
        skillCategories.updatedAt,
      )
      .orderBy(skillCategories.name)

    // Transform the data
    const transformedCategories = categoriesWithStats.map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description,
      createdAt: category.createdAt?.toISOString() ?? null,
      updatedAt: category.updatedAt ? category.updatedAt.toISOString() : null,
      mentorCount: Number(category.mentorCount) || 0,
      skills: category.skills?.filter(Boolean) || [],
    }))

    return NextResponse.json({ categories: transformedCategories })
  } catch (error) {
    console.error("Error fetching skill categories:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name, description } = await request.json()

    if (!name?.trim()) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 })
    }

    // Check if category already exists
    const existingCategory = await db
      .select()
      .from(skillCategories)
      .where(eq(skillCategories.name, name.trim()))
      .limit(1)

    if (existingCategory.length > 0) {
      return NextResponse.json({ error: "Category with this name already exists" }, { status: 400 })
    }

    // Create new category
    const [newCategory] = await db
      .insert(skillCategories)
      .values({
        name: name.trim(),
        description: description?.trim() || null,
      })
      .returning()

    return NextResponse.json({
      category: {
        id: newCategory.id,
        name: newCategory.name,
        description: newCategory.description,
        createdAt: newCategory.createdAt?.toISOString() ?? null,
        updatedAt: newCategory.updatedAt ? newCategory.updatedAt.toISOString() : null,
        mentorCount: 0,
        skills: [],
      },
    })
  } catch (error) {
    console.error("Error creating skill category:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id, name, description } = await request.json()

    if (!id || !name?.trim()) {
      return NextResponse.json({ error: "Category ID and name are required" }, { status: 400 })
    }

    // Check if another category with the same name exists
    const existingCategory = await db
      .select()
      .from(skillCategories)
      .where(eq(skillCategories.name, name.trim()))
      .limit(1)

    if (existingCategory.length > 0 && existingCategory[0].id !== id) {
      return NextResponse.json({ error: "Category with this name already exists" }, { status: 400 })
    }

    // Update category
    const [updatedCategory] = await db
      .update(skillCategories)
      .set({
        name: name.trim(),
        description: description?.trim() || null,
        updatedAt: new Date(),
      })
      .where(eq(skillCategories.id, id))
      .returning()

    if (!updatedCategory) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    return NextResponse.json({
      category: {
        id: updatedCategory.id,
        name: updatedCategory.name,
        description: updatedCategory.description,
        createdAt: updatedCategory.createdAt?.toISOString() ?? null,
        updatedAt: updatedCategory.updatedAt ? updatedCategory.updatedAt.toISOString() : null,
      },
    })
  } catch (error) {
    console.error("Error updating skill category:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await request.json()

    if (!id) {
      return NextResponse.json({ error: "Category ID is required" }, { status: 400 })
    }

    // Delete all skill assignments for this category first
    await db.delete(mentorSkillCategories).where(eq(mentorSkillCategories.categoryId, id))

    // Delete the category
    const [deletedCategory] = await db.delete(skillCategories).where(eq(skillCategories.id, id)).returning()

    if (!deletedCategory) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Category deleted successfully" })
  } catch (error) {
    console.error("Error deleting skill category:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
