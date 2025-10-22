import { db } from "@/db"
import {
  users,
  mentors,
  mentorSkills,
  mentorReviews,
} from "@/db/schema"
import { eq, sql, desc } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Get top mentors with their ratings and review count
    const featuredMentors = await db
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
        avgRating: sql<number>`coalesce(avg(${mentorReviews.rating}), 0)`,
      })
      .from(mentors)
      .innerJoin(users, eq(users.id, mentors.userId))
      .leftJoin(mentorReviews, eq(mentorReviews.mentorId, mentors.id))
      .where(eq(users.status, "active"))
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
      .orderBy(desc(sql`coalesce(avg(${mentorReviews.rating}), 0)`))
      .limit(20)

    // Get skills for each mentor
    const mentorSkillsData = await db
      .select({
        mentorId: mentorSkills.mentorId,
        skillName: mentorSkills.skillName,
        ratePerHour: mentorSkills.ratePerHour,
      })
      .from(mentorSkills)
      .where(eq(mentorSkills.isActive, true))

    // Create lookup map
    const mentorSkillsMap = new Map<number, { skills: string[], rates: number[], minRate: number }>()

    // Populate skills map
    for (const skill of mentorSkillsData) {
      if (!mentorSkillsMap.has(skill.mentorId)) {
        mentorSkillsMap.set(skill.mentorId, { skills: [], rates: [], minRate: 0 })
      }
      const mentorData = mentorSkillsMap.get(skill.mentorId)!
      mentorData.skills.push(skill.skillName)
      mentorData.rates.push(skill.ratePerHour)
      // Calculate minimum rate
      mentorData.minRate = Math.min(...mentorData.rates)
    }

    // Format response with skills
    const mentorsWithSkills = featuredMentors
      .filter(mentor => {
        const skillsInfo = mentorSkillsMap.get(mentor.mentorId)
        return skillsInfo && skillsInfo.skills.length > 0 && mentor.reviewCount >= 3
      })
      .slice(0, 8)
      .map((mentor) => {
        const skillsInfo = mentorSkillsMap.get(mentor.mentorId)!

        return {
          mentorId: mentor.mentorId,
          userId: mentor.userId,
          firstName: mentor.firstName,
          lastName: mentor.lastName,
          title: mentor.title,
          profilePicture: mentor.profilePicture,
          bio: mentor.bio,
          skills: skillsInfo.skills,
          location: mentor.location,
          responseTime: mentor.responseTime,
          minRate: skillsInfo.minRate,
          reviewCount: mentor.reviewCount,
          avgRating: Number(mentor.avgRating.toFixed(1)),
        }
      })

    return NextResponse.json({
      mentors: mentorsWithSkills,
    })
  } catch (error) {
    console.error("Failed to fetch featured mentors:", error)
    return NextResponse.json({ mentors: [] })
  }
}
