"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { LearnerHeader } from "@/components/learner/Header"
import Footer  from "@/components/landing/Footer"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Loader2, Video, MessageSquare, X, AlertTriangle, FileText } from "lucide-react"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface BookingSession {
  id: number
  mentorFirstName: string
  mentorLastName: string
  mentorProfilePicture: string
  mentorProfessionalTitle: string
  skillName: string
  scheduledDate: string
  durationMinutes: number
  totalCostCredits: number
  status: string
  sessionNotes: string
  cancellationReason?: string
  cancelledBy: string
  refundAmount?: number
  rejectionReason?: string
  archived?: boolean
}

type SessionFilter = "all" | "upcoming" | "pending" | "cancelled" | "rejected"

export default function LearnerSessionsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState<BookingSession[]>([])
  const [activeFilter, setActiveFilter] = useState<SessionFilter>("all")
  const [cancellingSessionId, setCancellingSessionId] = useState<number | null>(null)
  const [cancellationReason, setCancellationReason] = useState("")

  const fetchLearnerSessions = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/learner/sessions", { cache: "no-store" })
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/login")
          return
        }
        throw new Error("Failed to fetch sessions")
      }
      const data = await res.json()
      setSessions(data.sessions)
    } catch (err: any) {
      toast.error("Failed to load sessions")
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchLearnerSessions()
  }, [fetchLearnerSessions])

  const canJoinSession = (session: BookingSession) => {
    if (session.status !== "confirmed") return false
    const now = new Date()
    const sessionDate = new Date(session.scheduledDate)
    const minutesUntilSession = (sessionDate.getTime() - now.getTime()) / (1000 * 60)
    const sessionEndTime = new Date(sessionDate.getTime() + session.durationMinutes * 60 * 1000)
    const minutesAfterEnd = (now.getTime() - sessionEndTime.getTime()) / (1000 * 60)
    return minutesUntilSession <= 10 && minutesAfterEnd <= 10
  }

  const handleCancelSession = async (sessionId: number) => {
    if (!cancellationReason.trim()) {
      toast.error("Please provide a cancellation reason")
      return
    }

    setCancellingSessionId(sessionId)
    try {
      const res = await fetch(`/api/bookings/cancel/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancellationReason.trim() }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to cancel session")
      }

      toast.success("Session cancelled successfully", {
        description: `${data.refundType} refund processed. ${data.refundAmount || 0} credits refunded.`,
      })

      setCancellationReason("")
      fetchLearnerSessions()
    } catch (err: any) {
      toast.error("Cancellation failed", {
        description: err.message,
      })
    } finally {
      setCancellingSessionId(null)
    }
  }

  const handleJoinSession = (sessionId: number) => {
    router.push(`/sessions/${sessionId}/video`)
  }

  const filterSessions = (filter: SessionFilter) => {
    const now = new Date()
    return sessions.filter((session) => {
      if (session.archived) return false
      const sessionDate = new Date(session.scheduledDate)

      switch (filter) {
        case "all":
          return true
        case "pending":
          return session.status === "pending"
        case "upcoming":
          return session.status === "confirmed" && sessionDate > now
        case "cancelled":
          return session.status === "cancelled"
        case "rejected":
          return session.status === "rejected"
        default:
          return true
      }
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "confirmed":
        return "bg-green-100 text-green-800"
      case "completed":
        return "bg-blue-100 text-blue-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      case "rejected":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const formatEndTime = (dateString: string, duration: number) => {
    const endTime = new Date(new Date(dateString).getTime() + duration * 60 * 1000)
    return endTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const filteredSessions = filterSessions(activeFilter)
  const filters = [
    { key: "all" as const, label: "All Sessions", count: filterSessions("all").length },
    { key: "upcoming" as const, label: "Upcoming", count: filterSessions("upcoming").length },
    { key: "pending" as const, label: "Pending", count: filterSessions("pending").length },
    { key: "cancelled" as const, label: "Cancelled", count: filterSessions("cancelled").length },
    { key: "rejected" as const, label: "Rejected", count: filterSessions("rejected").length },
  ]

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <LearnerHeader />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin" />
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <LearnerHeader />
      <main className="flex-1 container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Sessions</h1>
          <p className="text-gray-600">Manage your mentoring sessions and track your progress</p>
        </div>

        <div className="flex gap-2 mb-8">
          {filters.map((filter) => (
            <Button
              key={filter.key}
              variant={activeFilter === filter.key ? "default" : "outline"}
              onClick={() => setActiveFilter(filter.key)}
              className={`rounded-full ${
                activeFilter === filter.key
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {filter.label}
              {filter.count > 0 && (
                <Badge variant="secondary" className="ml-2 bg-gray-100 text-gray-800">
                  {filter.count}
                </Badge>
              )}
            </Button>
          ))}
        </div>

        {filteredSessions.length === 0 ? (
          <div className="text-center py-16">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No sessions found</h3>
            <p className="text-gray-600 mb-6">
              {activeFilter === "all"
                ? "You haven't booked any sessions yet. Find a mentor to get started!"
                : `No ${activeFilter} sessions to display.`}
            </p>
            {activeFilter === "all" && <Button onClick={() => router.push("/find-mentors")}>Find a Mentor</Button>}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredSessions.map((session) => {
              const canJoin = canJoinSession(session)
              const canCancel =
                ["pending", "confirmed"].includes(session.status) && new Date(session.scheduledDate) > new Date()

              return (
                <Card key={session.id} className="bg-white shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-6 pt-2">
                    <div className="flex items-center justify-left mb-4">
                      <Avatar className="h-24 w-24">
                        <AvatarImage src={session.mentorProfilePicture || "/placeholder.svg"} />
                      </Avatar>
                      <div className="ml-4 mb-4">
                        <h3 className="font-semibold text-gray-900 text-lg">
                          {session.mentorFirstName} {session.mentorLastName}
                        </h3>
                        <p className="text-gray-600 text-sm">{session.mentorProfessionalTitle}</p>

                      </div>
                    </div>


                    <div className="space-y-2 mb-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Skill/Service:</span>
                        <span className="font-medium">{session.skillName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Date:</span>
                        <span className="font-medium">{new Date(session.scheduledDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Time:</span>
                        <span className="font-medium">
                          {formatTime(session.scheduledDate)} -{" "}
                          {formatEndTime(session.scheduledDate, session.durationMinutes)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Duration:</span>
                        <span className="font-medium">{session.durationMinutes} min</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Credits:</span>
                        <span className="font-medium">{session.totalCostCredits}</span>
                      </div>
                    </div>

                    {/* Session Notes */}
                    {session.sessionNotes && (
                      <div className="mb-4 p-3 border rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-lg font-medium text-gray600">Session Notes</span>
                        </div>
                        <p className="text-sm text-gray-800">{session.sessionNotes}</p>
                      </div>
                    )}

                    {/* Cancellation Reason */}
                    {session.cancellationReason && session.status === "cancelled" && (
                      <div className="mb-4 p-3 bg-red-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-red-800">Cancellation Details</span>
                        </div>

                        {/* Reason */}
                        <p className="text-sm text-red-700">
                          Reason: {session.cancellationReason}
                        </p>

                        {/* Cancelled By */}
                        <p className="text-sm text-red-700 mt-1">
                          Cancelled By:{" "}
                          {session.cancelledBy}
                        </p>

                        {/* Refund */}
                        {session.refundAmount !== undefined && (
                          <p className="text-sm text-red-600 mt-1 font-medium">
                            Refund: {session.refundAmount} credits
                          </p>
                        )}
                      </div>
                    )}

                    {/* Rejection Reason */}
                    {session.rejectionReason && session.status === "rejected" && (
                      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <X className="w-4 h-4 text-gray-600" />
                          <span className="text-sm font-medium text-gray-800">Rejection Reason</span>
                        </div>
                        <p className="text-sm text-gray-700">{session.rejectionReason}</p>
                        <p className="text-sm text-gray-600 mt-1 font-medium">Full refund processed</p>
                      </div>
                    )}

                    <div className="flex justify-center mb-4">
                      <Badge className={`${getStatusColor(session.status)} border-0`}>
                        {session.status === "confirmed"
                          ? "Confirmed"
                          : session.status === "pending"
                            ? "Pending"
                            : session.status === "cancelled"
                              ? "Cancelled"
                              : session.status === "rejected"
                                ? "Rejected"
                                : "Completed"}
                      </Badge>
                    </div>

                    <div className="flex gap-2">
                      {canJoin && (
                        <Button
                          onClick={() => handleJoinSession(session.id)}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          size="sm"
                        >
                          <Video className="w-4 h-4 mr-2" />
                          Join
                        </Button>
                      )}

                      <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Message
                      </Button>

                      {canCancel && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700 bg-transparent"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                                Cancel Session
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to cancel this session? Please provide a reason for cancellation.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="py-4">
                              <Label htmlFor="cancellation-reason" className="text-sm font-medium">
                                Cancellation Reason *
                              </Label>
                              <Textarea
                                id="cancellation-reason"
                                value={cancellationReason}
                                onChange={(e) => setCancellationReason(e.target.value)}
                                placeholder="Please explain why you're cancelling this session..."
                                className="mt-2"
                                required
                              />
                            </div>
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={() => setCancellationReason("")}>
                                Keep Session
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleCancelSession(session.id)}
                                disabled={cancellingSessionId === session.id || !cancellationReason.trim()}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                {cancellingSessionId === session.id ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : null}
                                Cancel Session
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}
