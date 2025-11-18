import { z } from "zod"
import { isValidPhilippineTimezone } from "@/lib/timeZones"

// Helper for URL validation
const urlSchema = z.string().url("Invalid URL format").optional().or(z.literal(""))

export const learnerProfileUpdateSchema = z.object({
  country: z.string().refine((val) => val === "PH", {
    message: "Only Philippines is supported",
  }),
  experienceLevel: z.string().min(1, "Experience level is required"),
  learningGoals: z
    .string()
    .min(10, "Learning goals must be at least 10 characters")
    .max(500, "Learning goals cannot exceed 500 characters"),
  profilePictureUrl: urlSchema,
  timezone: z.string().refine((val) => isValidPhilippineTimezone(val), {
    message: "Only Philippine Standard Time is supported",
  }),
})

