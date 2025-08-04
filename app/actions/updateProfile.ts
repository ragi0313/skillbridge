"use server"

import { db } from "@/db"
import { users, learners, mentors, mentorAvailability, mentorBlockedDates } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { getSession } from "@/lib/auth/getSession"

export async function updateLearnerProfile(prevState: any, formData: FormData) {
  const session = await getSession()
  if (!session || session.role !== "learner") {
    return { error: "Unauthorized: You must be logged in as a learner to update this profile." }
  }
  const userId = session.id

  const firstName = formData.get("firstName") as string
  const lastName = formData.get("lastName") as string
  const country = formData.get("country") as string
  const experienceLevel = formData.get("experienceLevel") as string
  const learningGoals = formData.get("learningGoals") as string
  const profileUrl = formData.get("profileUrl") as string
  const profilePictureUrl = formData.get("profilePictureUrl") as string
  const timezone = formData.get("timezone") as string

  if (!firstName || !lastName || !country || !experienceLevel || !learningGoals || !timezone) {
    return { error: "Missing required fields." }
  }

  try {
    await db.transaction(async (tx) => {
      // Update user's first and last name
      await tx.update(users).set({ firstName, lastName, updatedAt: new Date() }).where(eq(users.id, userId))

      // Update learner's profile
      await tx
        .update(learners)
        .set({
          country,
          experienceLevel,
          learningGoals,
          profileUrl: profileUrl || null,
          profilePictureUrl: profilePictureUrl || null,
          timezone,
          updatedAt: new Date(),
        })
        .where(eq(learners.userId, userId))
    })

    revalidatePath("/learner/settings")
    return { success: "Profile updated successfully!" }
  } catch (error) {
    console.error("Error updating learner profile:", error)
    return { error: "Failed to update profile. Please try again." }
  }
}

export async function updateMentorProfile(prevState: any, formData: FormData) {
  const session = await getSession()
  if (!session || session.role !== "mentor") {
    return { error: "Unauthorized: You must be logged in as a mentor to update this profile." }
  }
  const userId = session.id

  const profilePictureUrl = formData.get("profilePictureUrl") as string
  const languagesSpokenRaw = formData.get("languagesSpoken") as string
  const gender = formData.get("gender") as string
  const country = formData.get("country") as string
  const timezone = formData.get("timezone") as string
  const professionalTitle = formData.get("professionalTitle") as string
  const bio = formData.get("bio") as string
  const yearsOfExperience = Number.parseInt(formData.get("yearsOfExperience") as string)
  const linkedInUrl = formData.get("linkedInUrl") as string
  const socialLinksRaw = formData.get("socialLinks") as string

  // Availability and Blocked Dates will be passed as JSON strings from client
  const availabilityDataRaw = formData.get("availabilityData") as string
  const blockedDatesDataRaw = formData.get("blockedDatesData") as string

  if (
    !profilePictureUrl ||
    !languagesSpokenRaw ||
    !gender ||
    !country ||
    !timezone ||
    !professionalTitle ||
    !linkedInUrl ||
    !socialLinksRaw ||
    isNaN(yearsOfExperience)
  ) {
    return { error: "Missing required fields for mentor profile." }
  }

  let languagesSpoken: string[]
  try {
    languagesSpoken = JSON.parse(languagesSpokenRaw)
    if (!Array.isArray(languagesSpoken)) throw new Error("Languages spoken must be a JSON array.")
  } catch (e) {
    return {
      error: 'Invalid format for Languages Spoken. Please provide a valid JSON array (e.g., ["English", "Spanish"]).',
    }
  }

  let socialLinks: Record<string, string>
  try {
    socialLinks = JSON.parse(socialLinksRaw)
    if (typeof socialLinks !== "object" || socialLinks === null) throw new Error("Social links must be a JSON object.")
  } catch (e) {
    return {
      error:
        'Invalid format for Social Links. Please provide a valid JSON object (e.g., {"twitter": "...", "github": "..."}).',
    }
  }

  type AvailabilityInput = { id?: number; day: string; startTime: string; endTime: string; isActive?: boolean }
  let availabilityData: AvailabilityInput[] = []
  try {
    availabilityData = JSON.parse(availabilityDataRaw)
    if (!Array.isArray(availabilityData)) throw new Error("Availability data must be a JSON array.")
  } catch (e) {
    console.error("Error parsing availability data:", e)
    return { error: "Invalid format for Availability. Please provide a valid JSON array." }
  }

  type BlockedDateInput = { id?: number; blockedDate: string; reason?: string }
  let blockedDatesData: BlockedDateInput[] = []
  try {
    blockedDatesData = JSON.parse(blockedDatesDataRaw)
    if (!Array.isArray(blockedDatesData)) throw new Error("Blocked dates data must be a JSON array.")
  } catch (e) {
    console.error("Error parsing blocked dates data:", e)
    return { error: "Invalid format for Blocked Dates. Please provide a valid JSON array." }
  }

  try {
    await db.transaction(async (tx) => {
      const [mentor] = await tx.select().from(mentors).where(eq(mentors.userId, userId))
      if (!mentor) {
        throw new Error("Mentor profile not found.")
      }

      // Update mentor's main profile
      await tx
        .update(mentors)
        .set({
          profilePictureUrl,
          languagesSpoken,
          gender,
          country,
          timezone,
          professionalTitle,
          bio: bio || null,
          yearsOfExperience,
          linkedInUrl,
          socialLinks,
          updatedAt: new Date(),
        })
        .where(eq(mentors.userId, userId))

      // Handle mentor availability
      const existingAvailability = await tx
        .select()
        .from(mentorAvailability)
        .where(eq(mentorAvailability.mentorId, mentor.id))
      const existingAvailabilityMap = new Map(existingAvailability.map((a) => [a.id, a]))

      for (const item of availabilityData) {
        if (item.id && existingAvailabilityMap.has(item.id)) {
          // Update existing
          await tx
            .update(mentorAvailability)
            .set({
              day: item.day,
              startTime: item.startTime,
              endTime: item.endTime,
              isActive: item.isActive ?? true,
              updatedAt: new Date(),
            })
            .where(and(eq(mentorAvailability.id, item.id), eq(mentorAvailability.mentorId, mentor.id)))
          existingAvailabilityMap.delete(item.id) // Mark as processed
        } else {
          // Insert new
          await tx.insert(mentorAvailability).values({
            mentorId: mentor.id,
            day: item.day,
            startTime: item.startTime,
            endTime: item.endTime,
            isActive: item.isActive ?? true,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        }
      }
      // Delete removed availability
      for (const remainingId of existingAvailabilityMap.keys()) {
        await tx.delete(mentorAvailability).where(eq(mentorAvailability.id, remainingId))
      }

      // Handle mentor blocked dates
      const existingBlockedDates = await tx
        .select()
        .from(mentorBlockedDates)
        .where(eq(mentorBlockedDates.mentorId, mentor.id))
      const existingBlockedDatesMap = new Map(existingBlockedDates.map((bd) => [bd.id, bd]))

      for (const item of blockedDatesData) {
        const blockedDate = new Date(item.blockedDate) // Convert string to Date object
        if (isNaN(blockedDate.getTime())) {
          throw new Error(`Invalid date format for blocked date: ${item.blockedDate}`)
        }

        if (item.id && existingBlockedDatesMap.has(item.id)) {
          // Update existing
          await tx
            .update(mentorBlockedDates)
            .set({
              blockedDate: blockedDate,
              reason: item.reason || null,
              updatedAt: new Date(),
            })
            .where(and(eq(mentorBlockedDates.id, item.id), eq(mentorBlockedDates.mentorId, mentor.id)))
          existingBlockedDatesMap.delete(item.id) // Mark as processed
        } else {
          // Insert new
          await tx.insert(mentorBlockedDates).values({
            mentorId: mentor.id,
            blockedDate: blockedDate,
            reason: item.reason || null,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        }
      }
      // Delete removed blocked dates
      for (const remainingId of existingBlockedDatesMap.keys()) {
        await tx.delete(mentorBlockedDates).where(eq(mentorBlockedDates.id, remainingId))
      }
    })

    revalidatePath("/mentor/settings")
    return { success: "Profile updated successfully!" }
  } catch (error: any) {
    console.error("Error updating mentor profile:", error)
    return { error: error.message || "Failed to update profile. Please try again." }
  }
}
