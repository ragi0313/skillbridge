import { db } from "@/db"
import {
  users,
  learners,
  mentors,
  mentorSkills,
  mentorReviews,
  skillCategories,
  mentorSkillCategories,
} from "@/db/schema"
import { and, eq, sql } from "drizzle-orm"
import { getSession } from "@/lib/auth/getSession"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await getSession()

  if (!session || session.role !== "learner") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Get learner's profile
  const learnerProfile = await db
    .select({
      id: learners.id,
      learningGoals: learners.learningGoals,
    })
    .from(learners)
    .where(eq(learners.userId, session.id))
    .limit(1)

  if (!learnerProfile.length) {
    return NextResponse.json({ mentors: [] })
  }

  const learningGoalsText = (learnerProfile[0].learningGoals || "").toLowerCase()

  // Get all mentors with their skills and categories
  const allMentors = await db
    .select({
      mentorId: mentors.id,
      userId: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      title: mentors.professionalTitle,
      profilePicture: mentors.profilePictureUrl,
      bio: mentors.bio,
      location: mentors.country,
      responseTime: sql<string>`'Usually responds in 2-3 hours'`,
      reviewCount: sql<number>`coalesce(count(distinct ${mentorReviews.id}), 0)`,
    })
    .from(mentors)
    .innerJoin(users, eq(users.id, mentors.userId))
    .leftJoin(mentorReviews, eq(mentorReviews.mentorId, mentors.id))
    .groupBy(
      mentors.id,
      users.id,
      users.firstName,
      users.lastName,
      mentors.professionalTitle,
      mentors.profilePictureUrl,
      mentors.bio,
      mentors.country
    )
    .limit(50)

  // Get skills for each mentor
  const mentorSkillsData = await db
    .select({
      mentorId: mentorSkills.mentorId,
      skillName: mentorSkills.skillName,
      ratePerHour: mentorSkills.ratePerHour,
    })
    .from(mentorSkills)
    .where(eq(mentorSkills.isActive, true))

  // Get skill categories for each mentor
  const mentorCategoriesData = await db
    .select({
      mentorId: mentorSkills.mentorId,
      categoryName: skillCategories.name,
    })
    .from(mentorSkillCategories)
    .innerJoin(mentorSkills, eq(mentorSkillCategories.mentorSkillId, mentorSkills.id))
    .innerJoin(skillCategories, eq(mentorSkillCategories.categoryId, skillCategories.id))
    .where(eq(mentorSkills.isActive, true))

  // Create lookup maps
  const mentorSkillsMap = new Map<number, { skills: string[], rates: number[], avgRate: number }>()
  const mentorCategoriesMap = new Map<number, string[]>()

  // Populate skills map
  for (const skill of mentorSkillsData) {
    if (!mentorSkillsMap.has(skill.mentorId)) {
      mentorSkillsMap.set(skill.mentorId, { skills: [], rates: [], avgRate: 0 })
    }
    const mentorData = mentorSkillsMap.get(skill.mentorId)!
    mentorData.skills.push(skill.skillName)
    mentorData.rates.push(skill.ratePerHour)
    // Calculate average rate
    mentorData.avgRate = Math.round(mentorData.rates.reduce((sum, rate) => sum + rate, 0) / mentorData.rates.length)
  }

  // Populate categories map
  for (const category of mentorCategoriesData) {
    if (!mentorCategoriesMap.has(category.mentorId)) {
      mentorCategoriesMap.set(category.mentorId, [])
    }
    mentorCategoriesMap.get(category.mentorId)!.push(category.categoryName)
  }

  // Filter mentors based on skill/category matching in learning goals
  const filteredMentors = allMentors.filter((mentor) => {
    const mentorSkillsInfo = mentorSkillsMap.get(mentor.mentorId)
    const mentorCategories = mentorCategoriesMap.get(mentor.mentorId) || []

    if (!mentorSkillsInfo) return false

    const mentorSkillNames = mentorSkillsInfo.skills.map(skill => skill.toLowerCase())
    const mentorCategoryNames = mentorCategories.map(cat => cat.toLowerCase())

    // Check if any mentor skill or category is mentioned in learner's goals
    // Use more precise matching: require either full phrase match or multiple significant word matches
    const hasSkillMatch = mentorSkillNames.some(skill => {
      const skillLower = skill.toLowerCase()

      // First check for exact phrase match (most accurate)
      if (learningGoalsText.includes(skillLower)) {
        return true
      }

      // Then check if multiple significant words from the skill appear
      const skillWords = skillLower.split(/\s+/).filter(word => word.length > 3)
      if (skillWords.length === 0) return false

      // For multi-word skills, require at least 2 words to match
      if (skillWords.length >= 2) {
        const matchedWords = skillWords.filter(word => {
          // Use word boundary matching to avoid partial matches
          const regex = new RegExp(`\\b${word}\\b`, 'i')
          return regex.test(learningGoalsText)
        })
        return matchedWords.length >= 2
      }

      // For single-word skills, require exact word match with boundaries
      const regex = new RegExp(`\\b${skillWords[0]}\\b`, 'i')
      return regex.test(learningGoalsText)
    })

    const hasCategoryMatch = mentorCategoryNames.some(category => {
      const categoryLower = category.toLowerCase()

      // Check for exact phrase match first
      if (learningGoalsText.includes(categoryLower)) {
        return true
      }

      // For categories, check with word boundaries
      const categoryWords = categoryLower.split(/\s+/).filter(word => word.length > 3)
      if (categoryWords.length === 0) return false

      // Require at least one significant word match with boundaries
      return categoryWords.some(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'i')
        return regex.test(learningGoalsText)
      })
    })

    // Professional title matching (e.g., "designer", "developer")
    // Only match significant words (5+ chars) with word boundaries
    const titleText = (mentor.title || "").toLowerCase()
    const titleWords = titleText.split(/\s+/).filter(word => word.length > 4)
    const hasTitleMatch = titleWords.some(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'i')
      return regex.test(learningGoalsText)
    })

    return hasSkillMatch || hasCategoryMatch || hasTitleMatch
  })

  // Calculate match scores and format response
  const mentorsWithScore = filteredMentors.slice(0, 10).map((mentor) => {
    const mentorSkillsInfo = mentorSkillsMap.get(mentor.mentorId)!
    const mentorCategories = mentorCategoriesMap.get(mentor.mentorId) || []

    // Calculate match score based on precise keyword matches in learning goals
    let matchScore = 40 // Base score

    const mentorSkillNames = mentorSkillsInfo.skills.map(skill => skill.toLowerCase())
    const mentorCategoryNames = mentorCategories.map(cat => cat.toLowerCase())

    // Add points for each skill match in learning goals
    mentorSkillNames.forEach(skill => {
      const skillLower = skill.toLowerCase()

      // Exact phrase match gets highest points
      if (learningGoalsText.includes(skillLower)) {
        matchScore += 30
        return
      }

      // Multiple word match gets medium points
      const skillWords = skillLower.split(/\s+/).filter(word => word.length > 3)
      if (skillWords.length >= 2) {
        const matchedWords = skillWords.filter(word => {
          const regex = new RegExp(`\\b${word}\\b`, 'i')
          return regex.test(learningGoalsText)
        })
        if (matchedWords.length >= 2) {
          matchScore += 20
        } else if (matchedWords.length === 1) {
          matchScore += 10
        }
      } else if (skillWords.length === 1) {
        const regex = new RegExp(`\\b${skillWords[0]}\\b`, 'i')
        if (regex.test(learningGoalsText)) {
          matchScore += 15
        }
      }
    })

    // Add points for each category match in learning goals
    mentorCategoryNames.forEach(category => {
      const categoryLower = category.toLowerCase()

      // Exact phrase match
      if (learningGoalsText.includes(categoryLower)) {
        matchScore += 20
        return
      }

      // Word boundary match
      const categoryWords = categoryLower.split(/\s+/).filter(word => word.length > 3)
      categoryWords.forEach(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'i')
        if (regex.test(learningGoalsText)) {
          matchScore += 10
        }
      })
    })

    // Add points for professional title match (word boundary only)
    const titleText = (mentor.title || "").toLowerCase()
    const titleWords = titleText.split(/\s+/).filter(word => word.length > 4)
    titleWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'i')
      if (regex.test(learningGoalsText)) {
        matchScore += 10
      }
    })

    // Cap at 100
    matchScore = Math.min(matchScore, 100)

    return {
      mentorId: mentor.mentorId,
      userId: mentor.userId,
      firstName: mentor.firstName,
      lastName: mentor.lastName,
      title: mentor.title,
      profilePicture: mentor.profilePicture,
      bio: mentor.bio,
      skills: mentorSkillsInfo.skills,
      location: mentor.location,
      responseTime: mentor.responseTime,
      minRate: mentorSkillsInfo.avgRate,
      reviewCount: mentor.reviewCount,
      matchScore,
    }
  })

  // Sort by match score descending
  mentorsWithScore.sort((a, b) => b.matchScore - a.matchScore)

  return NextResponse.json({ 
    mentors: mentorsWithScore,
    totalFound: filteredMentors.length 
  })
}
