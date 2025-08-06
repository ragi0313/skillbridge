"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import MentorHeader from "@/components/mentor/Header"
import Footer from "@/components/landing/Footer"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, DollarSign, User, CheckCircle, XCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Separator } from "@/components/ui/separator"

// Define types for session data
interface BookingSession {
  id: number
  learnerFirstName: string
  learnerLastName: string
  learnerProfilePicture: string
  skillName: string
  scheduledDate: string
  durationMinutes: number
  earnedCredits: number
  status: string
  sessionNotes: string
}

export default function MentorSessionsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState<BookingSession[]>([])
  const [error, setError] = useState<string | null>(null)
  const [processingSessionId, setProcessingSessionId] = useState<number | null>(null)

  const formatSessionDate = (dateString: string) => {
     return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }).format(new Date(dateString))
  }

  const fetchMentorSessions = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/mentor/sessions", { cache: "no-store" })
      if (!res.ok) {
        if (res.status === 401) {
          toast.error("Unauthorized", {
            description: "Please log in to view your sessions.",
          })
          router.push("/login")
          return
        }
        throw new Error("Failed to fetch sessions")
      }
      const data = await res.json()
      setSessions(data.sessions)
    } catch (err: any) {
      console.error("Error fetching mentor sessions:", err)
      setError(err.message || "Failed to load sessions.")
      toast.error("Error", {
        description: err.message || "Failed to load your sessions. Please try again.",
      })
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchMentorSessions()
  }, [fetchMentorSessions])

  const handleSessionAction = async (sessionId: number, action: "accept" | "reject") => {
    setProcessingSessionId(sessionId)
    try {
      const res = await fetch(`/api/bookings/${action}/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || `Failed to ${action} session.`)
      }

      toast.success(`Session ${action === "accept" ? "confirmed" : "rejected"} successfully!`, {
        description: data.message,
      })
      fetchMentorSessions() // Re-fetch sessions to update UI
    } catch (err: any) {
      console.error(`Error ${action}ing session:`, err)
      toast.error("Action Failed", {
        description: err.message || `Could not ${action} the session. Please try again.`,
      })
    } finally {
      setProcessingSessionId(null)
    }
  }

  const pendingSessions = sessions.filter((session) => session.status === "pending")
  const otherSessions = sessions.filter((session) => session.status !== "pending")

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <MentorHeader />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-600 text-lg">Loading sessions...</div>
        </main>
        <Footer />
      </div>
    )
  }

  

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <MentorHeader />
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">My Sessions</h1>

        {pendingSessions.length > 0 && (
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Pending Sessions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pendingSessions.map((session) => (
                <Card key={session.id} className="shadow-md border-yellow-500 bg-yellow-50">
                  <CardHeader className="flex flex-row items-center space-x-4 pb-2">
                    <img
                      src={session.learnerProfilePicture || "/default-avatar.png"}
                      alt={session.learnerFirstName}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div>
                      <CardTitle className="text-lg font-semibold">
                        {session.learnerFirstName} {session.learnerLastName}
                      </CardTitle>
                      <CardDescription className="text-sm text-gray-700">{session.skillName}</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center text-sm text-gray-700">
                      <Calendar className="mr-2 h-4 w-4 text-blue-600" />
                       <span>{formatSessionDate(session.scheduledDate)}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-700">
                      <Clock className="mr-2 h-4 w-4 text-purple-600" />
                      <span>{session.durationMinutes} minutes</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-700">
                      <DollarSign className="mr-2 h-4 w-4 text-green-600" />
                      <span>Earn: {session.earnedCredits} credits</span>
                    </div>
                    <p className="text-sm text-gray-700 mt-2">
                      <span className="font-medium">Notes:</span> {session.sessionNotes}
                    </p>
                    <div className="flex gap-2 mt-4">
                      <Button
                        onClick={() => handleSessionAction(session.id, "accept")}
                        disabled={processingSessionId === session.id}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      >
                        {processingSessionId === session.id ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <CheckCircle className="w-4 h-4 mr-2" />
                        )}
                        Accept
                      </Button>
                      <Button
                        onClick={() => handleSessionAction(session.id, "reject")}
                        disabled={processingSessionId === session.id}
                        variant="outline"
                        className="flex-1 border-red-500 text-red-500 hover:bg-red-50 hover:text-red-600"
                      >
                        {processingSessionId === session.id ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <XCircle className="w-4 h-4 mr-2" />
                        )}
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {sessions.length === 0 ? (
          <Card className="shadow-lg border-0 bg-white p-6 text-center">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-900">No Sessions Yet</CardTitle>
              <CardDescription className="text-gray-600">
                You don't have any upcoming or past mentoring sessions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => router.push("/mentor/settings")} className="gradient-bg text-white">
                Update Your Availability to Get Bookings!
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {pendingSessions.length > 0 && otherSessions.length > 0 && <Separator className="my-8" />}
            <h2 className="text-2xl font-bold text-gray-800 mb-6">All Sessions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {otherSessions.map((session) => (
                <Card key={session.id} className="shadow-md hover:shadow-lg transition-shadow duration-300">
                  <CardHeader className="flex flex-row items-center space-x-4 pb-2">
                    <img
                      src={session.learnerProfilePicture || "/default-avatar.png"}
                      alt={session.learnerFirstName}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div>
                      <CardTitle className="text-lg font-semibold">{session.learnerFirstName} {session.learnerLastName}</CardTitle>
                      <CardDescription className="text-sm text-gray-600">{session.skillName}</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center text-sm text-gray-700">
                      <Calendar className="mr-2 h-4 w-4 text-blue-600" />
                      <span>{new Date(session.scheduledDate).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-700">
                      <Clock className="mr-2 h-4 w-4 text-purple-600" />
                      <span>{session.durationMinutes} minutes</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-700">
                      <DollarSign className="mr-2 h-4 w-4 text-green-600" />
                      <span>Earned: {session.earnedCredits} credits</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-700">
                      <User className="mr-2 h-4 w-4 text-orange-600" />
                      <span>Status: {session.status}</span>
                    </div>
                    <Button size="sm" className="mt-4 w-full">
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  )
}
