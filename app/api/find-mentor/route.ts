import { db } from "@/db";
import { mentors, users, mentorSkills, mentorReviews } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Fetch mentors with user data
    const mentorList = await db
      .select({
        id: mentors.id,
        userId: mentors.userId,
        profilePictureUrl: mentors.profilePictureUrl,
        languagesSpoken: mentors.languagesSpoken,
        country: mentors.country,
        professionalTitle: mentors.professionalTitle,
        bio: mentors.bio,
        yearsOfExperience: mentors.yearsOfExperience,
        creditsBalance: mentors.creditsBalance,
        availability: mentors.availability,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(mentors)
      .innerJoin(users, eq(mentors.userId, users.id));

    // For each mentor, attach skills, reviews, and enrich the data
    const enriched = await Promise.all(
      mentorList.map(async (m) => {
        const skills = await db
          .select({ skillName: mentorSkills.skillName, ratePerHour: mentorSkills.ratePerHour })
          .from(mentorSkills)
          .where(eq(mentorSkills.mentorId, m.id));

        const reviews = await db
          .select({ rating: mentorReviews.rating })
          .from(mentorReviews)
          .where(eq(mentorReviews.mentorId, m.id));

        const ratingSum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
        const avgRating = reviews.length ? ratingSum / reviews.length : 0;

        const hourlyRate = skills.length
          ? Math.min(...skills.map((s) => s.ratePerHour))
          : 0;

        return {
          id: m.id.toString(),
          name: `${m.firstName} ${m.lastName}`,
          title: m.professionalTitle || "Mentor",
          avatar: m.profilePictureUrl,
          rating: Number(avgRating.toFixed(1)),
          reviewCount: reviews.length,
          hourlyRate,
          experience: m.yearsOfExperience || 0,
          skills: skills.map((s) => s.skillName),
          languages: m.languagesSpoken as string[],
          country: m.country,
          bio: m.bio || "",
          isAvailable: !!m.availability, // simplistic check
          credits: m.creditsBalance,
        };
      })
    );
    console.log(enriched)
    return NextResponse.json(enriched);
  } catch (err) {
    console.error("[GET_MENTORS_ERROR]", err);
    return NextResponse.json({ error: "Failed to fetch mentors" }, { status: 500 });
  }
}
