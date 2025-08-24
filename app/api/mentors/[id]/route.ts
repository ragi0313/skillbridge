//app/api/mentors/[id]

import { db } from "@/db"
import { users, mentors, mentorSkills, mentorReviews, learners } from "@/db/schema"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

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

  return NextResponse.json({
    id: mentorId,
    firstName: userData.firstName,
    lastName: userData.lastName,
    profilePictureUrl: mentorData.profilePictureUrl,
    country: mentorData.country,
    languages: mentorData.languagesSpoken,
    professionalTitle: mentorData.professionalTitle,
    bio: mentorData.bio,
    yearsOfExperience: mentorData.yearsOfExperience,
    linkedInUrl: mentorData.linkedInUrl,
    socialLinks: mentorData.socialLinks ?? {},
    skills: skillNames,
    rates: skillRates,
    reviews: formattedReviews,
  })
}