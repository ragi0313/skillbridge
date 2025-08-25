import { getSession } from "@/lib/auth/getSession"
import { db } from "@/db"
import { bookingSessions, learners, mentors, users, mentorSkills } from "@/db/schema"
import { eq, desc } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { redirect } from "next/navigation"
import { SessionsClientWithRealTime } from "@/components/mentor/SessionsClientWithRealTime"
import MentorHeader from "@/components/mentor/Header"

export default async function MentorSessionsPage() {
  const session = await getSession()
  
  if (!session?.id) {
    redirect("/login")
  }

  // Get mentor info
  const [mentor] = await db
    .select({ id: mentors.id })
    .from(mentors)
    .leftJoin(users, eq(mentors.userId, users.id))
    .where(eq(users.id, session.id))
    .limit(1)

  if (!mentor) {
    redirect("/register/mentor")
  }

  // Create aliases for user table joins
  const learnerUsers = alias(users, "learner_users")

  // Fetch mentor's sessions with learner and skill information
  const sessions = await db
    .select({
      id: bookingSessions.id,
      status: bookingSessions.status,
      scheduledDate: bookingSessions.scheduledDate,
      startTime: bookingSessions.startTime,
      endTime: bookingSessions.endTime,
      durationMinutes: bookingSessions.durationMinutes,
      totalCostCredits: bookingSessions.totalCostCredits,
      sessionNotes: bookingSessions.sessionNotes,
      refundAmount: bookingSessions.refundAmount,
      cancelledBy: bookingSessions.cancelledBy,
      cancellationReason: bookingSessions.cancellationReason,
      mentorResponseAt: bookingSessions.mentorResponseAt,
      mentorResponseMessage: bookingSessions.mentorResponseMessage,
      rejectionReason: bookingSessions.rejectionReason,
      createdAt: bookingSessions.createdAt,
      expiresAt: bookingSessions.expiresAt,
      
      // Agora fields
      agoraChannelName: bookingSessions.agoraChannelName,
      agoraCallStartedAt: bookingSessions.agoraCallStartedAt,
      agoraCallEndedAt: bookingSessions.agoraCallEndedAt,
      
      // Participation tracking
      learnerJoinedAt: bookingSessions.learnerJoinedAt,
      mentorJoinedAt: bookingSessions.mentorJoinedAt,
      learnerLeftAt: bookingSessions.learnerLeftAt,
      mentorLeftAt: bookingSessions.mentorLeftAt,

      // Learner info
      learner: {
        id: learners.id,
        profilePictureUrl: learners.profilePictureUrl,
        experienceLevel: learners.experienceLevel,
      },
      learnerUser: {
        firstName: learnerUsers.firstName,
        lastName: learnerUsers.lastName,
      },
      
      // Skill info
      skill: {
        skillName: mentorSkills.skillName,
        ratePerHour: mentorSkills.ratePerHour,
      }
    })
    .from(bookingSessions)
    .leftJoin(learners, eq(bookingSessions.learnerId, learners.id))
    .leftJoin(learnerUsers, eq(learners.userId, learnerUsers.id))
    .leftJoin(mentorSkills, eq(bookingSessions.mentorSkillId, mentorSkills.id))
    .where(eq(bookingSessions.mentorId, mentor.id))
    .orderBy(desc(bookingSessions.createdAt))

  return (
    <div className="min-h-screen bg-gray-50">
      <MentorHeader />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Sessions</h1>
          <p className="mt-2 text-gray-600">
            Manage your mentoring sessions, respond to requests, and track your completed sessions.
          </p>
        </div>

        <SessionsClientWithRealTime initialSessions={sessions} />
      </main>
    </div>
  )
}

export const metadata = {
  title: 'My Sessions | SkillBridge',
  description: 'Manage your mentoring sessions',
}