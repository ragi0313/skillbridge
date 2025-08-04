import { z } from "zod"

// Helper for URL validation
const urlSchema = z.string().url("Invalid URL format").optional().or(z.literal(""))

export const learnerProfileUpdateSchema = z.object({
  country: z.string().min(1, "Country is required"),
  experienceLevel: z.string().min(1, "Experience level is required"),
  learningGoals: z
    .string()
    .min(10, "Learning goals must be at least 10 characters")
    .max(500, "Learning goals cannot exceed 500 characters"),
  profilePictureUrl: urlSchema,
  socialLinks: z
    .object({
      github: urlSchema,
      twitter: urlSchema,
      website: urlSchema,
    })
    .optional(),
  timezone: z.string().min(1, "Timezone is required"),
})

// Schema for mentor skills - Fixed number handling
export const mentorSkillSchema = z.object({
  skillName: z.string().min(1, "Skill name is required"),
  ratePerHour: z.number().min(1, "Rate per hour must be at least 1 credit"), // Changed from z.coerce.number()
})

// Schema for mentor availability slots
export const mentorAvailabilitySlotSchema = z.object({
  day: z.string().min(1, "Day is required"),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid start time format (HH:MM)"),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid end time format (HH:MM)"),
})

// Schema for mentor blocked dates
export const mentorBlockedDateSchema = z.object({
  blockedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  reason: z.string().optional(),
})

// Mentor Profile Update Schema
export const mentorProfileUpdateSchema = z.object({
  profilePictureUrl: z.string().url("Must be a valid URL"),
  languagesSpoken: z.array(z.string().min(1, "Language cannot be empty")).min(1, "At least one language is required"),
  gender: z.string().min(1, "Gender is required"),
  country: z.string().min(1, "Country is required"),
  timezone: z.string().min(1, "Timezone is required"),
  professionalTitle: z
    .string()
    .min(3, "Professional title is required")
    .max(100, "Professional title cannot exceed 100 characters"),
  bio: z.string().min(50, "Bio must be at least 50 characters").max(1000, "Bio cannot exceed 1000 characters"),
  yearsOfExperience: z
    .number()
    .min(0, "Years of experience cannot be negative")
    .max(50, "Years of experience cannot exceed 50"),
  linkedInUrl: urlSchema.refine((val) => val === "" || val?.includes("linkedin.com/in/"), {
    message: "Please enter a valid LinkedIn profile URL",
  }),
  socialLinks: z
    .object({
      github: urlSchema,
      twitter: urlSchema,
      website: urlSchema,
    })
    .optional(),
  skills: z.array(mentorSkillSchema).optional(),
  availability: z.array(mentorAvailabilitySlotSchema).optional(),
  blockedDates: z.array(mentorBlockedDateSchema).optional(),
})