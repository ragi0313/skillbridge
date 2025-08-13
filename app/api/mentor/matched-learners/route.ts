import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { users, mentors, learners, mentorSkills, skillCategories, mentorSkillCategories } from "@/db/schema"
import { eq, and, inArray } from "drizzle-orm"
import { getSession } from "@/lib/auth/getSession"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== "mentor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get mentor's profile first
    const mentorProfile = await db
      .select({
        id: mentors.id,
      })
      .from(mentors)
      .where(eq(mentors.userId, session.id))
      .limit(1)

    if (!mentorProfile.length) {
      return NextResponse.json({ matchedLearners: [] })
    }

    const mentorId = mentorProfile[0].id

    // Get mentor's skills
    const mentorSkillsData = await db
      .select({
        skillName: mentorSkills.skillName,
      })
      .from(mentorSkills)
      .where(and(
        eq(mentorSkills.mentorId, mentorId),
        eq(mentorSkills.isActive, true)
      ))

    // Get mentor's skill categories
    const mentorCategoriesData = await db
      .select({
        categoryName: skillCategories.name,
      })
      .from(mentorSkillCategories)
      .innerJoin(mentorSkills, eq(mentorSkillCategories.mentorSkillId, mentorSkills.id))
      .innerJoin(skillCategories, eq(mentorSkillCategories.categoryId, skillCategories.id))
      .where(eq(mentorSkills.mentorId, mentorId))

    const mentorSkillNames = mentorSkillsData.map(skill => skill.skillName.toLowerCase())
    const mentorCategoryNames = mentorCategoriesData.map(cat => cat.categoryName.toLowerCase())

    // Get all learners
    const allLearners = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        profilePictureUrl: learners.profilePictureUrl,
        learningGoals: learners.learningGoals,
        experienceLevel: learners.experienceLevel,
        country: learners.country,
        createdAt: users.createdAt,
      })
      .from(users)
      .innerJoin(learners, eq(users.id, learners.userId))
      .where(eq(users.role, "learner"))
      .limit(50) // Get more learners to filter from

    // Filter learners based on skill/category matching in learning goals
    const filteredLearners = allLearners.filter((learner) => {
      const learningGoalsText = (learner.learningGoals || "").toLowerCase()
      
      // Check if any mentor skill or category is mentioned in learner's goals
      const hasSkillMatch = mentorSkillNames.some(skill => 
        learningGoalsText.includes(skill)
      )
      
      const hasCategoryMatch = mentorCategoryNames.some(category => 
        learningGoalsText.includes(category)
      )

      return hasSkillMatch || hasCategoryMatch
    })

    // Calculate match scores and format response
    const learnersWithScore = filteredLearners.slice(0, 10).map((learner) => {
      // Calculate actual match score based on keyword matches
      let matchScore = 50 // Base score
      
      const learningGoalsText = learner.learningGoals.toLowerCase()
      
      // Add points for each skill match
      mentorSkillNames.forEach(skill => {
        if (learningGoalsText.includes(skill)) {
          matchScore += 15
        }
      })
      
      // Add points for each category match
      mentorCategoryNames.forEach(category => {
        if (learningGoalsText.includes(category)) {
          matchScore += 10
        }
      })
      
      // Cap at 100
      matchScore = Math.min(matchScore, 100)

      return {
        id: learner.id,
        name: `${learner.firstName} ${learner.lastName}`,
        profilePicture: learner.profilePictureUrl,
        bio: learner.learningGoals, // Using learning goals as bio substitute
        goals: learner.learningGoals,
        experienceLevel: learner.experienceLevel,
        country: learner.country,
        createdAt: learner.createdAt,
        matchScore,
      }
    })

    // Sort by match score descending
    learnersWithScore.sort((a, b) => b.matchScore - a.matchScore)

    return NextResponse.json({ 
      matchedLearners: learnersWithScore,
      totalFound: filteredLearners.length 
    })

  } catch (error) {
    console.error("Error fetching matched learners:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}