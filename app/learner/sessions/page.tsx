import { redirect } from "next/navigation"
import { db } from "@/db"
import { bookingSessions, users, learners, mentors, mentorSkills } from "@/db/schema"
import { eq, desc } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { getSession } from "@/lib/auth/getSession"
import { SessionsClientWithRealTime } from "@/components/learner/SessionsClientWithRealTime"
import { LearnerHeader } from "@/components/learner/Header"

export default async function LearnerSessionsPage() {
  const session = await getSession()
  
  if (!session?.id) {
    redirect("/login")
  }

  if (session.role !== "learner") {
    redirect("/dashboard")
  }

  // Get learner info
  const [learner] = await db
    .select({ id: learners.id })
    .from(learners)
    .where(eq(learners.userId, session.id))

  if (!learner) {
    redirect("/dashboard")
  }

  // Create aliases for the users table
  const mentorUsers = alias(users, "mentor_users")

  // Get all sessions for this learner
  const sessions = await db
    .select({
      id: bookingSessions.id,
      status: bookingSessions.status,
      scheduledDate: bookingSessions.scheduledDate,
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
      mentorJoinedAt: bookingSessions.mentorJoinedAt,
      mentorLeftAt: bookingSessions.mentorLeftAt,
      learnerJoinedAt: bookingSessions.learnerJoinedAt,
      learnerLeftAt: bookingSessions.learnerLeftAt,
      mentor: {
        id: mentors.id,
        profilePictureUrl: mentors.profilePictureUrl,
        professionalTitle: mentors.professionalTitle,
      },
      mentorUser: {
        firstName: mentorUsers.firstName,
        lastName: mentorUsers.lastName,
      },
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
    .orderBy(desc(bookingSessions.scheduledDate))

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <LearnerHeader />
      
      {/* Page Header Section */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">My Sessions</h1>
                  <p className="text-gray-600">Track your mentorship journey and upcoming sessions</p>
                </div>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Learning Progress</p>
                <p className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {sessions.filter(s => s.status === "completed").length} Sessions
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <SessionsClientWithRealTime initialSessions={sessions} />
      </div>
    </div>
  )
}