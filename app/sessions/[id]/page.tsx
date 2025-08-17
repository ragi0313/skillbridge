import { notFound, redirect } from "next/navigation"
import { db } from "@/db"
import { bookingSessions, users, learners, mentors } from "@/db/schema"
import { eq } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { getSession } from "@/lib/auth/getSession"
import VideoCall from "@/components/video/VideoCall"

interface VideoSessionPageProps {
  params: {
    id: string
  }
}

export default async function VideoSessionPage({ params }: VideoSessionPageProps) {
  const sessionId = Number.parseInt(params.id)

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

  // Check if session is confirmed
  if (bookingSession.status !== "confirmed") {
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
          <p className="text-gray-600 mb-4">This session is not confirmed yet or has been cancelled.</p>
          <p className="text-sm text-gray-500">
            Status: <span className="font-medium capitalize">{bookingSession.status}</span>
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

  // Check if it's time to join (10 minutes before to 10 minutes after session end)
  const now = new Date()
  const sessionStart = new Date(bookingSession.scheduledDate)
  const sessionEnd = new Date(sessionStart.getTime() + bookingSession.durationMinutes * 60 * 1000)
  const joinStart = new Date(sessionStart.getTime() - 10 * 60 * 1000) // 10 minutes before
  const joinEnd = new Date(sessionEnd.getTime() + 10 * 60 * 1000) // 10 minutes after

  if (now < joinStart) {
    const minutesUntil = Math.ceil((joinStart.getTime() - now.getTime()) / (1000 * 60))
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <div className="text-blue-500 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Session Preparation Time</h1>
          <p className="text-gray-600 mb-4">
            You can join the call in <strong>{minutesUntil} minutes</strong>
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Session starts: {sessionStart.toLocaleDateString()} at {sessionStart.toLocaleTimeString()}
          </p>
          <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-700">
            <p className="font-medium">Preparation Tips:</p>
            <ul className="mt-2 space-y-1 text-left">
              <li>• Test your camera and microphone</li>
              <li>• Ensure stable internet connection</li>
              <li>• Prepare any materials or questions</li>
              <li>• Find a quiet, well-lit space</li>
            </ul>
          </div>
        </div>
      </div>
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

  const otherParticipant = isLearner ? bookingSession.mentorUser : bookingSession.learnerUser

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              Video Session with {otherParticipant?.firstName} {otherParticipant?.lastName}
            </h1>
            <p className="text-sm text-gray-600">
              {sessionStart.toLocaleDateString()} • {sessionStart.toLocaleTimeString()} -{" "}
              {sessionEnd.toLocaleTimeString()}
            </p>
          </div>
          <div className="text-sm text-gray-500">Session ID: {sessionId}</div>
        </div>
      </div>

      {/* Video Call */}
      <div className="p-4">
        <VideoCall
          sessionId={sessionId.toString()}
          userRole={isLearner ? "learner" : "mentor"}
        />
      </div>
    </div>
  )
}