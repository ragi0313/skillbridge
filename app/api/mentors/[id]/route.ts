//app/api/mentors/[id]

import { db } from "@/db"
import { users, mentors, mentorSkills, mentorReviews, learners } from "@/db/schema"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

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

export async function GET(
  _: Request,
  contextPromise: Promise<{ params: Promise<{ id: string }> }>
) {
  const { params } = await contextPromise
  const { id } = await params  
  const mentorId = parseInt(id) 

  if (isNaN(mentorId)) {
    return NextResponse.json({ error: "Invalid mentor ID" }, { status: 400 })
  }

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
    return NextResponse.json({ error: "Mentor not found" }, { status: 404 })
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

  return NextResponse.json({
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
  })
}