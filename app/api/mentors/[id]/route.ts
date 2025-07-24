import { db } from "@/db"
import {
  users,
  mentors,
  mentorSkills,
  mentorReviews,
  learners,
} from "@/db/schema"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function GET(
  _: Request,
  contextPromise: Promise<{ params: Promise<{ id: string }> }>
) {
  const { params } = await contextPromise
  const { id } = await params  // Add this line to await params
  const mentorId = parseInt(id) // Use id instead of params.id

  if (isNaN(mentorId)) {
    return NextResponse.json({ error: "Invalid mentor ID" }, { status: 400 })
  }

  const mentorRow = await db
    .select()
    .from(mentors)
    .where(eq(mentors.id, mentorId))
    .innerJoin(users, eq(mentors.userId, users.id))
    .then((rows) => rows[0])

  if (!mentorRow) {
    return NextResponse.json({ error: "Mentor not found" }, { status: 404 })
  }

  const skills = await db
    .select()
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
  }))

  const { users: userData, mentors: mentorData } = mentorRow

  return NextResponse.json({
    id: mentorId,
    firstName: userData.firstName,
    lastName: userData.lastName,
    profilePictureUrl: mentorData.profilePictureUrl,
    country: mentorData.country,
    languages: mentorData.languagesSpoken,
    timezone: mentorData.timezone,
    professionalTitle: mentorData.professionalTitle,
    bio: mentorData.bio,
    yearsOfExperience: mentorData.yearsOfExperience,
    linkedInUrl: mentorData.linkedInUrl,
    socialLinks: mentorData.socialLinks ?? {},
    availability: JSON.parse(mentorData.availability || "{}"),
    skills: skillNames,
    rates: skillRates,
    reviews: formattedReviews,
  })
}