import { getSession } from "@/lib/auth/getSession"
import { db } from "@/db"
import { bookingSessions, learners, mentors, users, mentorSkills } from "@/db/schema"
import { eq, desc } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { redirect } from "next/navigation"
import { SessionsClientWithRealTime } from "@/components/learner/SessionsClientWithRealTime"
import { LearnerHeader } from "@/components/learner/Header"

export default async function LearnerSessionsPage() {
  const session = await getSession()
  
  if (!session?.id) {
    redirect("/login")
  }

  // Get learner info
  const [learner] = await db
    .select({ id: learners.id })
    .from(learners)
    .leftJoin(users, eq(learners.userId, users.id))
    .where(eq(users.id, session.id))
    .limit(1)

  if (!learner) {
    redirect("/register/learner")
  }

  // Create aliases for user table joins
  const mentorUsers = alias(users, "mentor_users")

  // Fetch learner's sessions with mentor and skill information
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

      // Mentor info
      mentor: {
        id: mentors.id,
        profilePictureUrl: mentors.profilePictureUrl,
        professionalTitle: mentors.professionalTitle,
      },
      mentorUser: {
        firstName: mentorUsers.firstName,
        lastName: mentorUsers.lastName,
      },
      
      // Skill info
      skill: {
        skillName: mentorSkills.skillName,
        ratePerHour: mentorSkills.ratePerHour,
      }
    })
    .from(bookingSessions)
    .leftJoin(mentors, eq(bookingSessions.mentorId, mentors.id))
    .leftJoin(mentorUsers, eq(mentors.userId, mentorUsers.id))
    .leftJoin(mentorSkills, eq(bookingSessions.mentorSkillId, mentorSkills.id))
    .where(eq(bookingSessions.learnerId, learner.id))
    .orderBy(desc(bookingSessions.createdAt))

  return (
    <div className="min-h-screen bg-gray-50">
      <LearnerHeader />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Sessions</h1>
          <p className="mt-2 text-gray-600">
            Manage your mentoring sessions, join upcoming calls, and review completed sessions.
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