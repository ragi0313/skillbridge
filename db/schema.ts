import { pgTable, serial, varchar, text, timestamp, integer, json, numeric } from "drizzle-orm/pg-core"

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}

// USERS TABLE
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  hashedPassword: varchar("hashed_password", { length: 255 }).notNull(),
  role: varchar("role", { length: 20 }).notNull(), // 'learner' | 'mentor' | 'admin'
  ...timestamps,
})

export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => users.id),
  profilePictureUrl: varchar("profile_picture_url", { length: 512 }),
  createdAt: timestamp("created_at").defaultNow(),
})

export const learners = pgTable("learners", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => users.id),
  country: varchar("country", { length: 100 }).notNull(),
  experienceLevel: varchar("experience_level", { length: 50 }).notNull(),
  learningGoals: text("learning_goals").notNull(),
  creditsBalance: integer("credits_balance").default(0).notNull(),
  profileUrl: varchar("profile_url", { length: 255 }),
  profilePictureUrl: varchar("profile_picture_url", { length: 255 }),
  socialLinks: json("social_links"),
  timezone: varchar("timezone", { length: 100 }),
  ...timestamps,
})

export const mentors = pgTable("mentors", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => users.id),
  profileUrl: varchar("profile_url", { length: 255 }),
  profilePictureUrl: varchar("profile_picture_url", { length: 255 }).notNull(),
  languagesSpoken: json("languages_spoken").notNull(),
  gender: varchar("gender", { length: 50 }).notNull(),
  country: varchar("country", { length: 100 }).notNull(),
  timezone: varchar("timezone", { length: 100 }).notNull(),
  professionalTitle: varchar("professional_title", { length: 100 }).notNull(),
  bio: text("bio"),
  yearsOfExperience: integer("years_of_experience").notNull(),
  linkedInUrl: varchar("linkedin_url", { length: 255 }).notNull(),
  socialLinks: json("social_links").notNull(),
  creditsBalance: integer("credits_balance").default(0).notNull(),
  ...timestamps,
})

export const mentorAvailability = pgTable("mentor_availability", {
  id: serial("id").primaryKey(),
  mentorId: integer("mentor_id").notNull().references(() => mentors.id),
  day: varchar("day", { length: 20 }).notNull(), // e.g. "monday"
  startTime: varchar("start_time", { length: 10 }).notNull(), // e.g. "09:00"
  endTime: varchar("end_time", { length: 10 }).notNull(), // e.g. "11:00"
  ...timestamps,
})

export const mentorSkills = pgTable("mentor_skills", {
  id: serial("id").primaryKey(),
  mentorId: integer("mentor_id").notNull().references(() => mentors.id),
  skillName: varchar("skill_name", { length: 100 }).notNull(),
  ratePerHour: integer("rate_per_hour").notNull(),
  ...timestamps,
})

export const mentorReviews = pgTable("mentor_reviews", {
  id: serial("id").primaryKey(),
  mentorId: integer("mentor_id").notNull().references(() => mentors.id),
  learnerId: integer("learner_id").notNull().references(() => learners.id),
  reviewText: text("review_text").notNull(),
  rating: integer("rating"),
  ...timestamps,
})

export const pendingLearners = pgTable("pending_learners", {
  id: serial("id").primaryKey(),
  firstName: varchar("first_name", { length: 255 }).notNull(),
  lastName: varchar("last_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  hashedPassword: varchar("hashed_password", { length: 255 }).notNull(),
  country: varchar("country", { length: 255 }).notNull(),
  experienceLevel: varchar("experience_level", { length: 100 }).notNull(),
  learningGoals: text("learning_goals").notNull(),
  verificationToken: varchar("verification_token", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export const pendingMentors = pgTable("pending_mentors", {
  id: serial("id").primaryKey(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  hashedPassword: varchar("hashed_password", { length: 255 }).notNull(),
  profileUrl: varchar("profile_url", { length: 255 }),
  profilePictureUrl: varchar("profile_picture_url", { length: 255 }).notNull(),
  languagesSpoken: json("languages_spoken").notNull(),
  gender: varchar("gender", { length: 50 }).notNull(),
  country: varchar("country", { length: 100 }).notNull(),
  timezone: varchar("timezone", { length: 100 }).notNull(),
  professionalTitle: varchar("professional_title", { length: 100 }),
  bio: text("bio"),
  yearsOfExperience: integer("years_of_experience").notNull(),
  linkedInUrl: varchar("linkedin_url", { length: 255 }).notNull(),
  socialLinks: json("social_links").notNull(),
  question1: text("question1").notNull(),
  question2: text("question2").notNull(),
  question3: text("question3").notNull(),
  verificationToken: varchar("verification_token", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export const pendingMentorAvailability = pgTable("pending_mentor_availability", {
  id: serial("id").primaryKey(),
  mentorId: integer("mentor_id").notNull().references(() => pendingMentors.id),
  day: varchar("day", { length: 20 }).notNull(),
  startTime: varchar("start_time", { length: 10 }).notNull(),
  endTime: varchar("end_time", { length: 10 }).notNull(),
  ...timestamps,
})


export const pendingMentorSkills = pgTable("pending_mentor_skills", {
  id: serial("id").primaryKey(),
  mentorId: integer("mentor_id").notNull().references(() => pendingMentors.id),
  skillName: varchar("skill_name", { length: 100 }).notNull(),
  ratePerHour: integer("rate_per_hour").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export const creditPurchases = pgTable("credit_purchases", {
  id: serial("id").primaryKey(),

  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  amountCredits: integer("amount_credits").notNull(),
  amountPaidUsd: numeric("amount_paid_usd", { precision: 10, scale: 2 }).notNull(),

  provider: text("provider").notNull(), 
  paymentStatus: text("payment_status").default("pending"), 
  paymentReference: text("payment_reference"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export const creditTransactions = pgTable("credit_transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), 
  direction: text("direction").notNull(), 
  amount: integer("amount").notNull(),
  relatedSessionId: integer("related_session_id").references(() => bookingSessions.id),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
})


export const bookingSessions = pgTable("booking_sessions", {
  id: serial("id").primaryKey(),

  learnerId: integer("learner_id").notNull().references(() => learners.id, { onDelete: "cascade" }),
  mentorId: integer("mentor_id").notNull().references(() => mentors.id, { onDelete: "cascade" }),
  mentorSkillId: integer("mentor_skill_id").notNull().references(() => mentorSkills.id, { onDelete: "set null" }),

  scheduledDate: timestamp("scheduled_date", { withTimezone: true }).notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  totalCostCredits: integer("total_cost_credits").notNull(),

  status: text("status").default("pending"), 

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
})


export const mentorPayouts = pgTable("mentor_payouts", {
  id: serial("id").primaryKey(),

  mentorId: integer("mentor_id").notNull().references(() => mentors.id, { onDelete: "cascade" }),
  sessionId: integer("session_id").notNull().references(() => bookingSessions.id, { onDelete: "cascade" }),

  earnedCredits: integer("earned_credits").notNull(), 
  feePercentage: integer("fee_percentage").default(20),

  status: text("status").default("pending"), 
  paidOutAt: timestamp("paid_out_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
})
