import { pgTable, serial, varchar, text, timestamp, integer, json, } from "drizzle-orm/pg-core"

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  firstName: varchar("first_name", { length: 100 }).notNull(), 
  lastName: varchar("last_name", { length: 100 }).notNull(), 
  email: varchar("email", { length: 255 }).notNull().unique(),
  hashedPassword: varchar("hashed_password", { length: 255 }).notNull(),
  role: varchar("role", { length: 20 }).notNull(), // 'learner' for now
  ...timestamps,
})


export const learners = pgTable("learners", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => users.id),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  country: varchar("country", { length: 100 }).notNull(),
  experienceLevel: varchar("experience_level", { length: 50 }).notNull(),
  learningGoals: text("learning_goals").notNull(),
  creditsBalance: integer("credits_balance").default(0).notNull(), 
  profileUrl: varchar("profile_url", { length: 255 }),
  socialLinks: json("social_links"), 
  timezone: varchar("timezone", { length: 100 }),
  availability: text("availability"), 

  ...timestamps,
})

export const mentors = pgTable("mentors", {
  id: serial("id").primaryKey(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  hashedPassword: varchar("hashed_password", { length: 255 }).notNull(),
  profileUrl: varchar("profile_url", { length: 255 }),
  country: varchar("country", { length: 100 }).notNull(),
  timezone: varchar("timezone", { length: 100 }),
  linkedInUrl: varchar("linkedin_url", { length: 255 }),
  socialLinks: json("social_links"),
  skills: json("skills"),
  availability: text("availability"),
  role: varchar("role", { length: 20 }).notNull().default("mentor"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export const pendingLearners = pgTable("pending_learners", {
  id: serial("id").primaryKey(),
  firstName: varchar("first_name", { length: 255 }).notNull(), 
  lastName: varchar("last_name", { length: 255 }).notNull(),   
  email: varchar("email", { length: 255 }).notNull().unique(),
  hashedPassword: varchar("hashed_password", { length: 255 }).notNull(),
  country: varchar("country", { length: 255 }).notNull(),     
  role: varchar("role", { length: 50 }).notNull(),            
  experienceLevel: varchar("experience_level", { length: 100 }).notNull(), 
  learningGoals: text("learning_goals").notNull(),            
  verificationToken: varchar("verification_token", { length: 255 }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(), 
})

export const pendingMentors = pgTable("pending_mentors", {
  id: serial("id").primaryKey(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  hashedPassword: varchar("hashed_password", { length: 255 }).notNull(),
  profileUrl: varchar("profile_url", { length: 255 }), // File upload URL
  country: varchar("country", { length: 100 }).notNull(),
  timezone: varchar("timezone", { length: 100 }),
  linkedInUrl: varchar("linkedin_url", { length: 255 }),
  socialLinks: json("social_links"),
  skills: json("skills"), // Array of skills with rate
  availability: text("availability"), // JSON stringified object
  question1: text("question1").notNull(),
  question2: text("question2").notNull(),
  question3: text("question3").notNull(),
  role: varchar("role", { length: 20 }).notNull().default("mentor"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
})