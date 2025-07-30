// db/relations.ts
import {
  mentors,
  users,
  mentorSkills,
  mentorAvailability,
  bookingSessions,
  learners
} from "./schema";
import { relations } from "drizzle-orm";

export const userRelations = relations(users, ({ one }) => ({
  mentor: one(mentors, {
    fields: [users.id],
    references: [mentors.userId],
  }),
}));

export const mentorRelations = relations(mentors, ({ one, many }) => ({
  user: one(users, {
    fields: [mentors.userId],
    references: [users.id],
  }),
  mentorSkills: many(mentorSkills),
  mentorAvailability: many(mentorAvailability),
}));

export const mentorSkillRelations = relations(mentorSkills, ({ one }) => ({
  mentor: one(mentors, {
    fields: [mentorSkills.mentorId],
    references: [mentors.id],
  }),
}));

export const mentorAvailabilityRelations = relations(mentorAvailability, ({ one }) => ({
  mentor: one(mentors, {
    fields: [mentorAvailability.mentorId],
    references: [mentors.id],
  }),
}));


export const learnerRelations = relations(learners, ({ one, many }) => ({
  user: one(users, {
    fields: [learners.userId],
    references: [users.id],
  }),
  sessions: many(bookingSessions),
}));

export const bookingSessionRelations = relations(bookingSessions, ({ one }) => ({
  mentor: one(mentors, {
    fields: [bookingSessions.mentorId],
    references: [mentors.id],
  }),
  learner: one(learners, {
    fields: [bookingSessions.learnerId],
    references: [learners.id],
  }),
  skill: one(mentorSkills, {
    fields: [bookingSessions.mentorSkillId],
    references: [mentorSkills.id],
  }),
}));