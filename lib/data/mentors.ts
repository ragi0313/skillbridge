// lib/data/mentors.ts - Shared mentor data fetching logic

import { db } from "@/db"
import { users, mentors, mentorSkills, mentorReviews, learners } from "@/db/schema"
import { eq } from "drizzle-orm"

// Helper function to ensure URL has proper protocol
function ensureProtocol(url: string | null): string | null {
  if (!url || url.trim() === '') return null

  const trimmedUrl = url.trim()

  // If URL already has a protocol, return as is
  if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
    return trimmedUrl
  }

  // Add https:// protocol
  return `https://${trimmedUrl}`
}

export interface MentorData {
  id: number
  userId: number
  firstName: string
  lastName: string
  profilePictureUrl: string | null
  country: string | null
  timezone?: string | null
  languages: string | null
  professionalTitle: string | null
  bio: string | null
  yearsOfExperience: number | null
  linkedInUrl: string | null
  socialLinks: any
  skills: string[]
  rates: Record<string, number>
  isAvailable?: boolean
  reviews: {
    rating: number
    reviewText: string | null
    createdAt: Date
    learnerName: string
    learnerProfilePictureUrl: string | null
  }[]
}

export async function getMentorById(mentorId: number): Promise<MentorData | null> {
  if (isNaN(mentorId)) {
    return null
  }

  try {
    const mentorRow = await db
      .select({
        mentors: {
          id: mentors.id,
          userId: mentors.userId,
          profilePictureUrl: mentors.profilePictureUrl,
          country: mentors.country,
          languagesSpoken: mentors.languagesSpoken,
          professionalTitle: mentors.professionalTitle,
          bio: mentors.bio,
          yearsOfExperience: mentors.yearsOfExperience,
          linkedInUrl: mentors.linkedInUrl,
          socialLinks: mentors.socialLinks,
        },
        users: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
        }
      })
      .from(mentors)
      .where(eq(mentors.id, mentorId))
      .innerJoin(users, eq(mentors.userId, users.id))
      .then((rows) => rows[0])

    if (!mentorRow) {
      return null
    }

    const skills = await db
      .select({
        skillName: mentorSkills.skillName,
        ratePerHour: mentorSkills.ratePerHour,
      })
      .from(mentorSkills)
      .where(eq(mentorSkills.mentorId, mentorId))

    const skillNames = skills.map((s) => s.skillName)
    const skillRates = Object.fromEntries(
      skills.map((s) => [s.skillName, s.ratePerHour])
    )

    const reviews = await db
      .select({
        rating: mentorReviews.rating,
        reviewText: mentorReviews.reviewText,
        createdAt: mentorReviews.createdAt,
        learnerFirstName: users.firstName,
        learnerLastName: users.lastName,
        learnerProfilePictureUrl: learners.profilePictureUrl,
      })
      .from(mentorReviews)
      .where(eq(mentorReviews.mentorId, mentorId))
      .innerJoin(learners, eq(mentorReviews.learnerId, learners.id))
      .innerJoin(users, eq(learners.userId, users.id))

    const formattedReviews = reviews.map((r) => ({
      rating: r.rating,
      reviewText: r.reviewText,
      createdAt: r.createdAt,
      learnerName: `${r.learnerFirstName} ${r.learnerLastName}`,
      learnerProfilePictureUrl: r.learnerProfilePictureUrl,
    }))

    const { users: userData, mentors: mentorData } = mentorRow

    // Process social links to ensure proper URL protocols
    let processedSocialLinks = mentorData.socialLinks ?? {}

    // Parse if it's a JSON string
    if (typeof processedSocialLinks === 'string') {
      try {
        processedSocialLinks = JSON.parse(processedSocialLinks)
      } catch (e) {
        processedSocialLinks = {}
      }
    }

    // Ensure all social link URLs have proper protocols
    if (Array.isArray(processedSocialLinks)) {
      processedSocialLinks = processedSocialLinks.map((link: any) => ({
        ...link,
        url: ensureProtocol(link.url)
      })).filter((link: any) => link.url !== null) // Remove invalid URLs
    }

    return {
      id: mentorId,
      userId: mentorData.userId,
      firstName: userData.firstName,
      lastName: userData.lastName,
      profilePictureUrl: mentorData.profilePictureUrl,
      country: mentorData.country,
      languages: mentorData.languagesSpoken,
      professionalTitle: mentorData.professionalTitle,
      bio: mentorData.bio,
      yearsOfExperience: mentorData.yearsOfExperience,
      linkedInUrl: ensureProtocol(mentorData.linkedInUrl),
      socialLinks: processedSocialLinks,
      skills: skillNames,
      rates: skillRates,
      reviews: formattedReviews,
    }
  } catch (error) {
    console.error('Error fetching mentor data:', error)
    return null
  }
}
