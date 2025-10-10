"use client"

import { useState, useEffect } from "react"
import { MentorSessionsClient } from "./MentorSessionsClient"
import { Card } from "@/components/ui/card"
import MentorHeader from "@/components/mentor/Header"
import { useBookingUpdates } from "@/lib/hooks/useBookingUpdates"

interface Session {
  id: number
  status: string
  scheduledDate: string
  startTime: string | null
  endTime: string | null
  durationMinutes: number
  totalCostCredits: number
  sessionNotes: string
  agoraCallStartedAt: string | null
  agoraCallEndedAt: string | null
  learnerJoinedAt: string | null
  mentorJoinedAt: string | null
  learnerLeftAt: string | null
  mentorLeftAt: string | null
  refundAmount: number | null
  rejectionReason: string | null
  cancellationReason: string | null
  mentorResponseMessage: string | null
  expiresAt: string
  createdAt: string
  learnerFirstName: string | null
  learnerLastName: string | null
  learnerProfilePictureUrl: string | null
  learnerExperienceLevel: string | null
  skillName: string | null
  skillRatePerHour: number | null
}

export function MentorSessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Set up real-time booking updates
  useBookingUpdates({
    onBookingStatusChange: (bookingId, newStatus, data) => {
      // Update the session status in the sessions array
      setSessions(prevSessions =>
        prevSessions.map(session =>
          session.id === bookingId
            ? { ...session, status: newStatus, refundAmount: data.refundAmount || session.refundAmount }
            : session
        )
      )
    },
    enableToasts: true
  })

  useEffect(() => {
    async function fetchSessions() {
      try {
        setLoading(true)
        const response = await fetch('/api/mentor/sessions')
        
        if (!response.ok) {
          throw new Error('Failed to fetch sessions')
        }
        
        const data = await response.json()
        setSessions(data.sessions || [])
      } catch (err: any) {
        console.error('Error fetching sessions:', err)
        setError(err.message || 'Failed to load sessions')
      } finally {
        setLoading(false)
      }
    }

    fetchSessions()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md p-6 text-center">
          <div className="animate-spin w-8 h-8 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your sessions...</p>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md p-6 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MentorHeader />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Sessions</h1>
          <p className="text-gray-600 mt-2">Manage your mentoring sessions and track your earnings</p>
        </div>

        <MentorSessionsClient sessions={sessions} />
      </div>
    </div>
  )
}