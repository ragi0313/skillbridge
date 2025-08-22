import { redirect } from "next/navigation"
import { db } from "@/db"
import { bookingSessions, users, learners, mentors, mentorSkills } from "@/db/schema"
import { eq, desc } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { getSession } from "@/lib/auth/getSession"
import { SessionsClientWithRealTime } from "@/components/mentor/SessionsClientWithRealTime"
import MentorHeader from "@/components/mentor/Header"

export default async function MentorSessionsPage() {
  const session = await getSession()
  
  if (!session?.id) {
    redirect("/login")
  }

  if (session.role !== "mentor") {
    redirect("/dashboard")
  }

  // Get mentor info
  const [mentor] = await db
    .select({ id: mentors.id })
    .from(mentors)
    .where(eq(mentors.userId, session.id))

  if (!mentor) {
    redirect("/dashboard")
  }

  // Create aliases for the users table
  const learnerUsers = alias(users, "learner_users")

  // Get all sessions for this mentor
  const sessions = await db
    .select({
      id: bookingSessions.id,
      status: bookingSessions.status,
      scheduledDate: bookingSessions.scheduledDate,
      durationMinutes: bookingSessions.durationMinutes,
      totalCostCredits: bookingSessions.totalCostCredits,
      sessionNotes: bookingSessions.sessionNotes,
      archived: bookingSessions.archived,
      refundAmount: bookingSessions.refundAmount,
      cancelledBy: bookingSessions.cancelledBy,
      cancellationReason: bookingSessions.cancellationReason,
      mentorResponseAt: bookingSessions.mentorResponseAt,
      mentorResponseMessage: bookingSessions.mentorResponseMessage,
      rejectionReason: bookingSessions.rejectionReason,
      expiresAt: bookingSessions.expiresAt,
      createdAt: bookingSessions.createdAt,
      learner: {
        id: learners.id,
        profilePictureUrl: learners.profilePictureUrl,
        experienceLevel: learners.experienceLevel,
      },
      learnerUser: {
        firstName: learnerUsers.firstName,
        lastName: learnerUsers.lastName,
      },
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
    .orderBy(desc(bookingSessions.scheduledDate))

  const pendingCount = sessions.filter(s => s.status === "pending").length
  const completedCount = sessions.filter(s => s.status === "completed").length
  const totalEarnings = sessions
    .filter(s => s.status === "completed")
    .reduce((sum, session) => sum + Math.floor(session.totalCostCredits * 0.8), 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      <MentorHeader />
      
      {/* Page Header Section */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">My Sessions</h1>
                  <p className="text-gray-600">Manage your sessions and guide learners to success</p>
                </div>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-6">
              {pendingCount > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                    <div>
                      <p className="text-sm text-yellow-700 font-medium">Action Required</p>
                      <p className="text-xs text-yellow-600">{pendingCount} pending requests</p>
                    </div>
                  </div>
                </div>
              )}
              <div className="text-right">
                <p className="text-sm text-gray-500">Total Earnings</p>
                <p className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  {totalEarnings} Credits
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Sessions Completed</p>
                <p className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  {completedCount}
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
