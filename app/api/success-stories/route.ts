import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { sessionFeedback, bookingSessions, users, learners, mentors, mentorSkills } from "@/db/schema"
import { desc, and, gte, isNotNull, sql, eq } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = Math.min(parseInt(searchParams.get("limit") || "12"), 50) // Max 50 for performance

    // Get high-quality feedback for success stories from learners only
    // sessionFeedback is only submitted by learners about their mentoring sessions
    const successStories = await db
      .select({
        id: sessionFeedback.id,
        feedbackText: sessionFeedback.feedbackText,
        overallRating: sessionFeedback.overallRating,
        mostValuableAspect: sessionFeedback.mostValuableAspect,
        wouldRecommend: sessionFeedback.wouldRecommend,
        createdAt: sessionFeedback.createdAt,
        // Learner info (reviewer)
        learnerFirstName: users.firstName,
        learnerLastName: users.lastName,
        learnerProfilePicture: learners.profilePictureUrl,
        learnerCountry: learners.country,
        learnerExperienceLevel: learners.experienceLevel,
        // Mentor info for context
        mentorFirstName: sql<string>`mentor_user.first_name`.as('mentorFirstName'),
        mentorLastName: sql<string>`mentor_user.last_name`.as('mentorLastName'),
        mentorProfessionalTitle: mentors.professionalTitle,
        // Skill info
        skillName: mentorSkills.skillName,
        // Session info
        sessionStatus: bookingSessions.status,
      })
      .from(sessionFeedback)
      .innerJoin(bookingSessions, eq(sessionFeedback.sessionId, bookingSessions.id))
      .innerJoin(users, eq(sessionFeedback.reviewerUserId, users.id))
      .innerJoin(learners, eq(sessionFeedback.reviewerUserId, learners.userId))
      .innerJoin(mentors, eq(bookingSessions.mentorId, mentors.id))
      .innerJoin(sql`users mentor_user`, sql`${mentors.userId} = mentor_user.id`)
      .innerJoin(mentorSkills, eq(bookingSessions.mentorSkillId, mentorSkills.id))
      .where(
        and(
          eq(sessionFeedback.reviewerRole, 'learner'), // Only learner feedback
          gte(sessionFeedback.overallRating, 4), // Only 4+ star ratings
          isNotNull(sessionFeedback.feedbackText), // Must have text feedback
          sql`LENGTH(${sessionFeedback.feedbackText}) >= 50`, // Meaningful feedback (50+ chars)
          eq(bookingSessions.status, 'completed'), // Only completed sessions
          eq(sessionFeedback.wouldRecommend, true) // Must be willing to recommend
        )
      )
      .orderBy(desc(sessionFeedback.createdAt))
      .limit(limit)

    // Transform data for frontend consumption
    const transformedStories = successStories.map((story) => {
      // Create anonymized learner name (first name + last initial)
      const learnerName = `${story.learnerFirstName} ${story.learnerLastName?.charAt(0) || ''}.`

      // Create mentor context (anonymized)
      const mentorName = `${story.mentorFirstName} ${story.mentorLastName?.charAt(0) || ''}.`

      // Create role display with context
      const roleDisplay = `${story.learnerExperienceLevel || 'Learner'} • ${story.skillName || 'General'} Mentoring`

      return {
        id: story.id,
        quote: story.feedbackText,
        author: learnerName,
        role: roleDisplay,
        image: story.learnerProfilePicture || "/default-avatar.png",
        rating: story.overallRating,
        mostValuable: story.mostValuableAspect,
        createdAt: story.createdAt,
        mentorContext: `Mentored by ${mentorName}${story.mentorProfessionalTitle ? `, ${story.mentorProfessionalTitle}` : ''}`,
        learnerCountry: story.learnerCountry
      }
    })

    // Only return if we have stories to show
    if (transformedStories.length === 0) {
      return NextResponse.json({
        success: true,
        stories: [],
        count: 0,
        message: "No success stories available yet"
      })
    }

    return NextResponse.json({
      success: true,
      stories: transformedStories,
      count: transformedStories.length
    })

  } catch (error) {
    console.error("Error fetching success stories:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch success stories",
        stories: [],
        count: 0
      },
      { status: 500 }
    )
  }
}