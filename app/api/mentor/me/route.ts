import { db } from "@/db"
import { 
  mentors, 
  users, 
  mentorSkills, 
  mentorReviews, 
  learners 
} from "@/db/schema"
import { eq } from "drizzle-orm"
import { getSession } from "@/lib/auth/getSession"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await getSession()

  if (!session || session.role !== "mentor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Get mentor profile with user information
  const [mentorProfile] = await db
    .select({
      id: mentors.id,
      userId: mentors.userId,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      role: users.role,
      profilePictureUrl: mentors.profilePictureUrl,
      profileUrl: mentors.profileUrl,
      languagesSpoken: mentors.languagesSpoken,
      gender: mentors.gender,
      country: mentors.country,
      professionalTitle: mentors.professionalTitle,
      bio: mentors.bio,
      yearsOfExperience: mentors.yearsOfExperience,
      linkedInUrl: mentors.linkedInUrl,
      socialLinks: mentors.socialLinks,
      creditsBalance: mentors.creditsBalance,
      createdAt: mentors.createdAt,
      updatedAt: mentors.updatedAt,
    })
    .from(mentors)
    .innerJoin(users, eq(users.id, mentors.userId))
    .where(eq(mentors.userId, session.id))

  if (!mentorProfile) {
    return NextResponse.json({ error: "Mentor not found" }, { status: 404 })
  }

  // Get mentor skills
  const skills = await db
    .select({
      id: mentorSkills.id,
      skillName: mentorSkills.skillName,
      ratePerHour: mentorSkills.ratePerHour,
      createdAt: mentorSkills.createdAt,
      updatedAt: mentorSkills.updatedAt,
    })
    .from(mentorSkills)
    .where(eq(mentorSkills.mentorId, mentorProfile.id))


  // Get mentor reviews with learner information
  const reviews = await db
    .select({
      id: mentorReviews.id,
      reviewText: mentorReviews.reviewText,
      rating: mentorReviews.rating,
      createdAt: mentorReviews.createdAt,
      updatedAt: mentorReviews.updatedAt,
      learner: {
        id: learners.id,
        firstName: users.firstName,
        lastName: users.lastName,
        profilePictureUrl: learners.profilePictureUrl,
      }
    })
    .from(mentorReviews)
    .leftJoin(learners, eq(mentorReviews.learnerId, learners.id))
    .leftJoin(users, eq(learners.userId, users.id))
    .where(eq(mentorReviews.mentorId, mentorProfile.id))


  const averageRating = reviews.length > 0 
    ? reviews.reduce((sum, review) => sum + (review.rating || 0), 0) / reviews.length 
    : 0

  const completeProfile = {
    ...mentorProfile,
    skills: skills,
    reviews: reviews,
    stats: {
      totalReviews: reviews.length,
      averageRating: Math.round(averageRating * 10) / 10, 
      totalSkills: skills.length,
    }
  }

  return NextResponse.json({ mentor: completeProfile })
}