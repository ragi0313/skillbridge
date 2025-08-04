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

