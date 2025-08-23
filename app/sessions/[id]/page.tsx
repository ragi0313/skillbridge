import { notFound, redirect } from "next/navigation"
import { db } from "@/db"
import { bookingSessions, users, learners, mentors } from "@/db/schema"
import { eq } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { getSession } from "@/lib/auth/getSession"
import VideoCall from "@/components/video/VideoCall"
import WaitingRoom from "@/components/session/WaitingRoom"
import Logo from "@/components/ui/logo"

interface VideoSessionPageProps {
  params: {
    id: string
  }
}

export default async function VideoSessionPage({ params }: VideoSessionPageProps) {
  const { id } = await params
  const sessionId = Number.parseInt(id)

  if (!sessionId || isNaN(sessionId)) {
    notFound()
  }

  const session = await getSession()
  if (!session?.id) {
    redirect("/login")
  }

  // Create aliases for the users table since we need to join it twice
  const learnerUsers = alias(users, "learner_users")
  const mentorUsers = alias(users, "mentor_users")

  // Get session details with user information
  const [bookingSession] = await db
    .select({
      id: bookingSessions.id,
      status: bookingSessions.status,
      scheduledDate: bookingSessions.scheduledDate,
      durationMinutes: bookingSessions.durationMinutes,
      agoraChannelName: bookingSessions.agoraChannelName,
      mentorId: bookingSessions.mentorId,
      learnerId: bookingSessions.learnerId,
      learnerJoinedAt: bookingSessions.learnerJoinedAt,
      mentorJoinedAt: bookingSessions.mentorJoinedAt,
      learnerLeftAt: bookingSessions.learnerLeftAt,
      mentorLeftAt: bookingSessions.mentorLeftAt,
      learnerUser: {
        id: learnerUsers.id,
        firstName: learnerUsers.firstName,
        lastName: learnerUsers.lastName,
      },
      mentorUser: {
        id: mentorUsers.id,
        firstName: mentorUsers.firstName,
        lastName: mentorUsers.lastName,
      },
    })
    .from(bookingSessions)
    .leftJoin(learners, eq(bookingSessions.learnerId, learners.id))
    .leftJoin(mentors, eq(bookingSessions.mentorId, mentors.id))
    .leftJoin(learnerUsers, eq(learners.userId, learnerUsers.id))
    .leftJoin(mentorUsers, eq(mentors.userId, mentorUsers.id))
    .where(eq(bookingSessions.id, sessionId))

  if (!bookingSession) {
    notFound()
  }

  // Verify user has access to this session
  const isLearner = bookingSession.learnerUser?.id === session.id
  const isMentor = bookingSession.mentorUser?.id === session.id

  if (!isLearner && !isMentor) {
    redirect("/dashboard")
  }

  // Check if session is in a joinable state
  // Check if session is in an unavailable state (exclude 'upcoming' as it should show waiting room)
  const unavailableStatuses = ['rejected', 'cancelled', 'both_no_show', 'learner_no_show', 'mentor_no_show', 'completed', 'pending']
  if (unavailableStatuses.includes(bookingSession.status || "")) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <div className="text-red-500 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Session Not Available</h1>
          <p className="text-gray-600 mb-4">
            {bookingSession.status === "rejected" && "This session was declined by the mentor."}
            {bookingSession.status === "cancelled" && "This session has been cancelled."}
            {bookingSession.status === "both_no_show" && "Neither participant attended this session."}
            {bookingSession.status === "learner_no_show" && "This session was marked as no-show - learner didn't attend."}
            {bookingSession.status === "mentor_no_show" && "This session was marked as no-show - mentor didn't attend."}
            {bookingSession.status === "completed" && "This session has already been completed."}
            {bookingSession.status === "pending" && "This session is still pending mentor approval."}
            {!unavailableStatuses.includes(bookingSession.status || "") && 
             "This session is not available for joining."}
          </p>
          <p className="text-sm text-gray-500">
            Status: <span className="font-medium capitalize">{(bookingSession.status || "").replace('_', ' ')}</span>
          </p>
        </div>
      </div>
    )
  }

  // Check if Agora channel exists
  if (!bookingSession.agoraChannelName) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <div className="text-yellow-500 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Video Room Not Ready</h1>
          <p className="text-gray-600 mb-4">The video room is being prepared. Please try again in a moment.</p>
        </div>
      </div>
    )
  }

  // Determine other participant early for use in waiting room
  const otherParticipant = isLearner ? bookingSession.mentorUser : bookingSession.learnerUser

  // Check if it's time to join (30 minutes before to 10 minutes after session end)
  const now = new Date()
  const sessionStart = new Date(bookingSession.scheduledDate)
  const sessionEnd = new Date(sessionStart.getTime() + bookingSession.durationMinutes * 60 * 1000)
  const waitingRoomStart = new Date(sessionStart.getTime() - 30 * 60 * 1000) // 30 minutes before
  const joinEnd = new Date(sessionEnd.getTime() + 10 * 60 * 1000) // 10 minutes after

  // Determine current user's join/leave status for reconnection logic
  const currentUserJoined = isLearner ? bookingSession.learnerJoinedAt : bookingSession.mentorJoinedAt
  const currentUserLeft = isLearner ? bookingSession.learnerLeftAt : bookingSession.mentorLeftAt
  
  // User needs reconnection if they joined before but left (and session is still active)
  const needsReconnection = currentUserJoined && currentUserLeft && bookingSession.status === "ongoing"
  
  // Show waiting room from 30 minutes before until session starts, OR during session if user needs reconnection
  // Users should stay in waiting room until actual session time, even if they've joined the API
  const sessionHasStarted = now >= sessionStart
  const isInWaitingPeriod = now >= waitingRoomStart && now < sessionStart
  const sessionIsActive = ['confirmed', 'upcoming', 'ongoing'].includes(bookingSession.status || "")
  
  const showWaitingRoom = sessionIsActive && now <= joinEnd && (
    // Show waiting room if session hasn't started yet (regardless of join status)
    isInWaitingPeriod ||
    // Show waiting room if session has started but user needs reconnection
    (sessionHasStarted && needsReconnection)
  )
  
  if (showWaitingRoom) {
    return (
      <WaitingRoom
        sessionId={sessionId.toString()}
        userRole={isLearner ? "learner" : "mentor"}
        sessionData={{
          scheduledDate: bookingSession.scheduledDate,
          durationMinutes: bookingSession.durationMinutes,
          status: bookingSession.status || "confirmed",
          otherParticipant: {
            firstName: otherParticipant?.firstName || "",
            lastName: otherParticipant?.lastName || "",
            profilePictureUrl: undefined, // Add this to the query if available
            title: isLearner ? "Your Mentor" : "Your Learner"
          },
          isReconnection: needsReconnection || false,
          previouslyJoinedAt: currentUserJoined,
          previouslyLeftAt: currentUserLeft
        }}
      />
    )
  }


  if (now > joinEnd) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <div className="text-gray-500 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Session Has Ended</h1>
          <p className="text-gray-600 mb-4">This session has ended and is no longer available.</p>
          <p className="text-sm text-gray-500">
            Session was: {sessionStart.toLocaleDateString()} at {sessionStart.toLocaleTimeString()}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header with SkillBridge logo */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <Logo textColor="text-white" />
            <div className="hidden md:block">
              <h1 className="text-lg font-semibold text-white">
                Session with {otherParticipant?.firstName} {otherParticipant?.lastName}
              </h1>
              <p className="text-sm text-gray-300">
                {sessionStart.toLocaleDateString()} • {sessionStart.toLocaleTimeString()} -{" "}
                {sessionEnd.toLocaleTimeString()}
              </p>
            </div>
          </div>
          {/* Removed Session ID display - not necessary for users */}
        </div>
      </div>

      {/* Video Call - Full Screen */}
      <div className="h-[calc(100vh-80px)]">
        <VideoCall
          sessionId={sessionId.toString()}
          userRole={isLearner ? "learner" : "mentor"}
          agoraChannel={bookingSession.agoraChannelName}
        />
      </div>
    </div>
  )
}