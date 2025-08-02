import { db } from "@/db"; // adjust to your db path
import { eq } from "drizzle-orm";
import { bookingSessions, users, learners, mentors, mentorSkills } from "@/db/schema"; 


export const getLearnerSessions = async (learnerId: number) => {
  return await db
    .select({
      sessionId: bookingSessions.id,
      mentorName: users.firstName,
      skill: mentorSkills.skillName,
      scheduledDate: bookingSessions.scheduledDate,
      duration: bookingSessions.durationMinutes,
      status: bookingSessions.status,
    })
    .from(bookingSessions)
    .innerJoin(mentors, eq(bookingSessions.mentorId, mentors.id))
    .innerJoin(users, eq(mentors.userId, users.id))
    .innerJoin(mentorSkills, eq(bookingSessions.mentorSkillId, mentorSkills.id))
    .where(eq(bookingSessions.learnerId, learnerId));
};


export const getMentorSessions = async (mentorId: number) => {
  return await db
    .select({
      sessionId: bookingSessions.id,
      learnerName: users.firstName,
      skill: mentorSkills.skillName,
      scheduledDate: bookingSessions.scheduledDate,
      duration: bookingSessions.durationMinutes,
      status: bookingSessions.status,
      sessionNotes: bookingSessions.sessionNotes,
    })
    .from(bookingSessions)
    .innerJoin(learners, eq(bookingSessions.learnerId, learners.id))
    .innerJoin(users, eq(learners.userId, users.id))
    .innerJoin(mentorSkills, eq(bookingSessions.mentorSkillId, mentorSkills.id))
    .where(eq(bookingSessions.mentorId, mentorId));
};
