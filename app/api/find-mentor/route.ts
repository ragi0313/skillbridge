import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { mentors, users, mentorSkills, mentorReviews, mentorSkillCategories, skillCategories, learners } from "@/db/schema"
import { eq, and, inArray, sql, or, ilike } from "drizzle-orm"
import { getSession } from "@/lib/auth/getSession"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const categories = searchParams.get("categories")?.split(",").filter(Boolean) || []
    const search = searchParams.get("search")?.trim() || ""

    // Check if user is authenticated learner for personalization
    const session = await getSession()
    let learnerGoals: string | null = null

    if (session && session.role === "learner") {
      const learnerProfile = await db
        .select({ learningGoals: learners.learningGoals })
        .from(learners)
        .where(eq(learners.userId, session.id))
        .limit(1)

      if (learnerProfile.length > 0) {
        learnerGoals = (learnerProfile[0].learningGoals || "").toLowerCase()
      }
    }

    // Build WHERE conditions array
    const whereConditions: any[] = []

    // Search condition - Enhanced with partial word matching and case-insensitive search
    // SECURITY: Use proper parameterization to prevent SQL injection
    if (search) {
      // Split search into individual words for partial matching
      const searchWords = search.toLowerCase().split(/\s+/).filter(word => word.length > 0)

      const searchConditions = searchWords.map(word => {
        // Use parameterized pattern instead of string interpolation
        const pattern = `%${word}%`
        return or(
          // Search in mentor name (supports partial word matching)
          sql`LOWER(CONCAT(${users.firstName}, ' ', ${users.lastName})) ILIKE ${pattern}`,
          // Search in professional title
          sql`LOWER(${mentors.professionalTitle}) ILIKE ${pattern}`,
          // Search in bio
          sql`LOWER(${mentors.bio}) ILIKE ${pattern}`,
          // Search in skills
          sql`LOWER(${mentorSkills.skillName}) ILIKE ${pattern}`,
          // Search in country
          sql`LOWER(${mentors.country}) ILIKE ${pattern}`
        )
      })

      // All search words must match (AND logic for multi-word searches)
      const searchCondition = searchConditions.length === 1
        ? searchConditions[0]
        : and(...searchConditions)

      whereConditions.push(searchCondition)
    }

    // Category condition
    if (categories.length > 0) {
      // Convert categories to numbers for proper comparison
      const categoryIds = categories.map(Number).filter(id => !isNaN(id))
      if (categoryIds.length > 0) {
        whereConditions.push(inArray(skillCategories.id, categoryIds))
      }
    }

    // Select fields with conditional search score
    const selectFields = {
      id: mentors.id,
      userId: users.id,
      name: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`.as("name"),
      title: mentors.professionalTitle,
      bio: mentors.bio,
      profilePictureUrl: mentors.profilePictureUrl,
      country: mentors.country,
      timezone: mentors.timezone,
      experience: mentors.yearsOfExperience,
      languagesSpoken: sql<string>`MIN((${mentors.languagesSpoken})::text)`.as("languagesSpoken"),
      rating: sql<number>`COALESCE(AVG(${mentorReviews.rating}), 0)`.as("rating"),
      reviewCount: sql<number>`COUNT(${mentorReviews.id})`.as("reviewCount"),
      skills: sql<string[]>`ARRAY_AGG(DISTINCT ${mentorSkills.skillName}) FILTER (WHERE ${mentorSkills.skillName} IS NOT NULL)`.as("skills"),
      hourlyRate: sql<number>`COALESCE(ROUND(AVG(${mentorSkills.ratePerHour})), 0)`.as("hourlyRate"),
      // Always include search score, but it will be 0 when no search
      searchScore: search ? sql<number>`
        CASE 
          -- Exact name match (highest priority) - 100 points
          WHEN LOWER(CONCAT(${users.firstName}, ' ', ${users.lastName})) = LOWER(${search}) THEN 100
          -- Name starts with search term - 90 points  
          WHEN LOWER(CONCAT(${users.firstName}, ' ', ${users.lastName})) LIKE LOWER(${search} || '%') THEN 90
          -- Exact skill match - 80 points
          WHEN EXISTS(
            SELECT 1 FROM ${mentorSkills} ms 
            WHERE ms.mentor_id = ${mentors.id} 
            AND LOWER(ms.skill_name) = LOWER(${search})
            AND ms.is_active = true
          ) THEN 80
          -- Exact professional title match - 70 points
          WHEN LOWER(${mentors.professionalTitle}) = LOWER(${search}) THEN 70
          -- Professional title starts with search - 60 points
          WHEN LOWER(${mentors.professionalTitle}) LIKE LOWER(${search} || '%') THEN 60
          -- Skill starts with search - 50 points
          WHEN EXISTS(
            SELECT 1 FROM ${mentorSkills} ms 
            WHERE ms.mentor_id = ${mentors.id} 
            AND LOWER(ms.skill_name) LIKE LOWER(${search} || '%')
            AND ms.is_active = true
          ) THEN 50
          -- Name contains search term - 40 points
          WHEN LOWER(CONCAT(${users.firstName}, ' ', ${users.lastName})) LIKE LOWER('%' || ${search} || '%') THEN 40
          -- Professional title contains search - 30 points
          WHEN LOWER(${mentors.professionalTitle}) LIKE LOWER('%' || ${search} || '%') THEN 30
          -- Skill contains search term - 25 points
          WHEN EXISTS(
            SELECT 1 FROM ${mentorSkills} ms 
            WHERE ms.mentor_id = ${mentors.id} 
            AND LOWER(ms.skill_name) LIKE LOWER('%' || ${search} || '%')
            AND ms.is_active = true
          ) THEN 25
          -- Bio contains search term - 15 points
          WHEN LOWER(${mentors.bio}) LIKE LOWER('%' || ${search} || '%') THEN 15
          -- Country contains search term - 10 points
          WHEN LOWER(${mentors.country}) LIKE LOWER('%' || ${search} || '%') THEN 10
          ELSE 0
        END
      `.as("searchScore") : sql<number>`0`.as("searchScore")
    }

    // Build the complete query based on whether we have categories or not
    let mentorsData: any[]

    if (categories.length > 0) {
      // Query with category joins
      const queryWithCategories = db
        .select(selectFields)
        .from(mentors)
        .innerJoin(users, eq(mentors.userId, users.id))
        .leftJoin(
          mentorSkills,
          and(eq(mentors.id, mentorSkills.mentorId), eq(mentorSkills.isActive, true))
        )
        .leftJoin(mentorReviews, eq(mentors.id, mentorReviews.mentorId))
        .leftJoin(mentorSkillCategories, eq(mentorSkills.id, mentorSkillCategories.mentorSkillId))
        .leftJoin(skillCategories, eq(mentorSkillCategories.categoryId, skillCategories.id))

      const finalQueryWithCategories = whereConditions.length > 0 
        ? queryWithCategories.where(and(...whereConditions))
        : queryWithCategories

      mentorsData = await finalQueryWithCategories
        .groupBy(
          mentors.id,
          users.id,
          users.firstName,
          users.lastName,
          mentors.professionalTitle,
          mentors.bio,
          mentors.profilePictureUrl,
          mentors.country,
          mentors.timezone,
          mentors.yearsOfExperience
        )
        // Remove HAVING clause to include mentors without skills
        // .having(sql`COUNT(${mentorSkills.id}) > 0`)
    } else {
      // Query without category joins
      const queryWithoutCategories = db
        .select(selectFields)
        .from(mentors)
        .innerJoin(users, eq(mentors.userId, users.id))
        .leftJoin(
          mentorSkills,
          and(eq(mentors.id, mentorSkills.mentorId), eq(mentorSkills.isActive, true))
        )
        .leftJoin(mentorReviews, eq(mentors.id, mentorReviews.mentorId))

      const finalQueryWithoutCategories = whereConditions.length > 0 
        ? queryWithoutCategories.where(and(...whereConditions))
        : queryWithoutCategories

      mentorsData = await finalQueryWithoutCategories
        .groupBy(
          mentors.id,
          users.id,
          users.firstName,
          users.lastName,
          mentors.professionalTitle,
          mentors.bio,
          mentors.profilePictureUrl,
          mentors.country,
          mentors.timezone,
          mentors.yearsOfExperience
        )
        // Remove HAVING clause to include mentors without skills
        // .having(sql`COUNT(${mentorSkills.id}) > 0`)
    }

    // Calculate personalization scores if learner has goals
    if (learnerGoals && learnerGoals.trim().length > 0) {
      mentorsData = mentorsData.map((mentor) => {
        let personalizedScore = 0
        const skills = mentor.skills?.filter(Boolean) || []
        const bioText = (mentor.bio || "").toLowerCase()
        const titleText = (mentor.title || "").toLowerCase()

        // Check skill matches in learning goals
        skills.forEach(skill => {
          if (learnerGoals.includes(skill.toLowerCase())) {
            personalizedScore += 20 // Higher weight for skill match
          }
        })

        // Check bio matches
        const bioWords = learnerGoals.split(/\s+/).filter(word => word.length > 3)
        bioWords.forEach(word => {
          if (bioText.includes(word)) {
            personalizedScore += 5
          }
          if (titleText.includes(word)) {
            personalizedScore += 8
          }
        })

        return {
          ...mentor,
          personalizedScore: Math.min(personalizedScore, 100) // Cap at 100
        }
      })

      console.log('[FIND_MENTOR] Personalization scoring results:',
        mentorsData.slice(0, 5).map(m => ({ name: m.name, personalizedScore: m.personalizedScore || 0 }))
      )
    }

    // Apply sorting based on available scores
    if (mentorsData.length > 0) {
      mentorsData = mentorsData.sort((a, b) => {
        // If we have personalization scores and no search, prioritize personalized
        if (!search && (a.personalizedScore || b.personalizedScore)) {
          const personalizedA = a.personalizedScore || 0
          const personalizedB = b.personalizedScore || 0
          if (personalizedB !== personalizedA) {
            return personalizedB - personalizedA
          }
        }

        // If we have search scores, prioritize those
        if (search) {
          const searchScoreA = a.searchScore || 0
          const searchScoreB = b.searchScore || 0
          if (searchScoreB !== searchScoreA) {
            return searchScoreB - searchScoreA
          }
        }

        // Fallback to rating
        const ratingA = Number(a.rating) || 0
        const ratingB = Number(b.rating) || 0
        return ratingB - ratingA
      })

      if (search) {
        console.log('[FIND_MENTOR] Search scoring results:',
          mentorsData.slice(0, 5).map(m => ({ name: m.name, searchScore: m.searchScore }))
        )
      }
    }

    // Transform the results
    const transformedMentors = mentorsData.map((mentor) => {
      let languages: string[] = []
      try {
        if (mentor.languagesSpoken) {
          const parsed = JSON.parse(mentor.languagesSpoken)
          if (Array.isArray(parsed)) {
            languages = parsed
          }
        }
      } catch {
        languages = []
      }

      // Split the name for messages page compatibility
      const nameParts = mentor.name.split(' ')
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''

      const result = {
        id: mentor.id.toString(),
        userId: mentor.userId, // Add userId for messages page
        firstName, // Add firstName for messages page
        lastName, // Add lastName for messages page
        name: mentor.name,
        title: mentor.title,
        bio: mentor.bio || "",
        avatar: mentor.profilePictureUrl,
        profilePictureUrl: mentor.profilePictureUrl,
        professionalTitle: mentor.title, // Add professionalTitle for messages page
        country: mentor.country,
        timezone: mentor.timezone,
        experience: mentor.experience,
        languages,
        rating: Number(mentor.rating) || 0,
        reviewCount: Number(mentor.reviewCount) || 0,
        skills: mentor.skills?.filter(Boolean) || [],
        hourlyRate: Number(mentor.hourlyRate) || 0,
        isAvailable: true,
        credits: Number(mentor.hourlyRate) || 0,
        // Include search score for debugging if search is active
        ...(search && { searchScore: mentor.searchScore || 0 }),
        // Include personalized score if personalization is active
        ...(learnerGoals && { personalizedScore: mentor.personalizedScore || 0 })
      }

      return result
    })
    
    return NextResponse.json(transformedMentors)
  } catch (error) {
    console.error("Error fetching mentors:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}