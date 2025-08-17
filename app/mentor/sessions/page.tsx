"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import MentorHeader from "@/components/mentor/Header"
import Footer from "@/components/landing/Footer"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage } from "@/components/ui/avatar"
import { Loader2, Video, MessageSquare, CheckCircle, XCircle, AlertTriangle, FileText, X } from "lucide-react"
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

interface Session {
  id: number
  learnerFirstName: string
  learnerLastName: string
  learnerEmail: string
  learnerProfilePicture?: string
  skillName: string
  scheduledDate: string
  durationMinutes: number
  totalCostCredits: number
  sessionNotes: string
  status: string
  rejectionReason?: string
  earnedCredits?: number
  archived?: boolean
  cancellationReason?: string
}

type SessionFilter = "all" | "upcoming" | "pending" | "cancelled" | "rejected"

export default function MentorSessionsPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [cancelReason, setCancelReason] = useState("")
  const [rejectReason, setRejectReason] = useState("")
  const [activeFilter, setActiveFilter] = useState<SessionFilter>("all")

  useEffect(() => {
    fetchSessions()
  }, [])

  const fetchSessions = async () => {
    try {
      const response = await fetch("/api/mentor/sessions")
      if (response.ok) {
        const data = await response.json()
        setSessions(data.sessions)
      } else {
        toast.error("Failed to load sessions")
      }
    } catch (error) {
      toast.error("Error loading sessions")
    } finally {
      setLoading(false)
    }
  }

  const canJoinSession = (session: Session) => {
    if (session.status !== "confirmed") return false
    const now = new Date()
    const sessionDate = new Date(session.scheduledDate)
    const minutesUntilSession = (sessionDate.getTime() - now.getTime()) / (1000 * 60)
    const sessionEndTime = new Date(sessionDate.getTime() + session.durationMinutes * 60 * 1000)
    const minutesAfterEnd = (now.getTime() - sessionEndTime.getTime()) / (1000 * 60)
    return minutesUntilSession <= 10 && minutesAfterEnd <= 10
  }

  const handleAcceptSession = async (sessionId: number) => {
    setActionLoading(sessionId)
    try {
      const response = await fetch(`/api/bookings/accept/${sessionId}`, { method: "POST" })
      if (response.ok) {
        toast.success("Session accepted successfully")
        fetchSessions()
      } else {
        toast.error("Failed to accept session")
      }
    } catch (error) {
      toast.error("Error accepting session")
    } finally {
      setActionLoading(null)
    }
  }

  const handleRejectSession = async (sessionId: number, reason: string) => {
    if (!reason.trim()) {
      toast.error("Please provide a rejection reason")
      return
    }

    setActionLoading(sessionId)
    try {
      const response = await fetch(`/api/bookings/reject/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Failed to reject session")
      }

      toast.success("Session rejected successfully")
      fetchSessions()
      setRejectReason("")
    } catch (error: any) {
      toast.error("Error rejecting session", {
        description: error.message,
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleCancelSession = async (sessionId: number, reason: string) => {
    if (!reason.trim()) {
      toast.error("Please provide a cancellation reason")
      return
    }

    setActionLoading(sessionId)
    try {
      const response = await fetch(`/api/bookings/cancel/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Failed to cancel session")
      }

      toast.success("Session cancelled successfully", {
        description: `${data.refundType} refund processed for learner.`,
      })
      fetchSessions()
      setCancelReason("")
    } catch (error: any) {
      toast.error("Error cancelling session", {
        description: error.message,
      })
    } finally {
      setActionLoading(null)
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

  const canCancelSession = (status: string, scheduledDate: string) => {
    return status === "confirmed" && new Date(scheduledDate) > new Date()
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
        <MentorHeader />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin" />
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <MentorHeader />
      <main className="flex-1 container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Sessions</h1>
          <p className="text-gray-600">Manage your mentoring sessions and track your earnings</p>
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
            <p className="text-gray-600">
              {activeFilter === "pending"
                ? "No pending session requests at the moment."
                : `No ${activeFilter} sessions to display.`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredSessions.map((session) => {
              const canJoin = canJoinSession(session)
              const canCancel = canCancelSession(session.status, session.scheduledDate)

              return (
                <Card key={session.id} className="bg-white shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-left mb-4">
                      <Avatar className="h-24 w-24">
                        <AvatarImage src={session.learnerProfilePicture || "/placeholder.svg"} />
                      </Avatar>
                      <div className="ml-4 mb-4">
                        <h3 className="font-semibold text-gray-900 text-lg">
                          {session.learnerFirstName} {session.learnerLastName}
                        </h3>
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
                      {session.earnedCredits && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Earned:</span>
                          <span className="font-medium text-green-600">{session.earnedCredits}</span>
                        </div>
                      )}
                    </div>

                    {/* Session Notes */}
                    {session.sessionNotes && (
                      <div className="mb-4 p-3 border rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-gray-800">Session Notes</span>
                        </div>
                        <p className="text-sm text-gray-800">{session.sessionNotes}</p>
                      </div>
                    )}

                    {/* Cancellation Reason */}
                    {session.cancellationReason && session.status === "cancelled" && (
                      <div className="mb-4 p-3 bg-red-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                          <span className="text-sm font-medium text-red-800">Cancellation Reason</span>
                        </div>
                        <p className="text-sm text-red-700">{session.cancellationReason}</p>
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

                    <div className="space-y-2">
                      {session.status === "pending" && (
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleAcceptSession(session.id)}
                            disabled={actionLoading === session.id}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                            size="sm"
                          >
                            {actionLoading === session.id ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <CheckCircle className="h-4 w-4 mr-2" />
                            )}
                            Accept
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 text-red-600 hover:text-red-700 bg-transparent"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Reject
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Reject Session Request</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Please provide a reason for rejecting this session. The learner will receive a full
                                  refund.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <div className="py-4">
                                <Label htmlFor="rejection-reason" className="text-sm font-medium">
                                  Rejection Reason *
                                </Label>
                                <Textarea
                                  id="rejection-reason"
                                  placeholder="Please explain why you're rejecting this session..."
                                  value={rejectReason}
                                  onChange={(e) => setRejectReason(e.target.value)}
                                  className="mt-2"
                                  required
                                />
                              </div>
                              <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setRejectReason("")}>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleRejectSession(session.id, rejectReason)}
                                  className="bg-red-600 hover:bg-red-700"
                                  disabled={actionLoading === session.id || !rejectReason.trim()}
                                >
                                  {actionLoading === session.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  ) : null}
                                  Reject Session
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}

                      {canJoin && (
                        <Button
                          onClick={() => handleJoinSession(session.id)}
                          className="w-full bg-green-600 hover:bg-green-700"
                          size="sm"
                        >
                          <Video className="w-4 h-4 mr-2" />
                          Join Session
                        </Button>
                      )}

                      <div className="flex gap-2">
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
                                className="text-orange-600 hover:text-orange-700 bg-transparent"
                              >
                                <AlertTriangle className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Cancel Session</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to cancel this session? Please provide a reason for
                                  cancellation.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <div className="py-4">
                                <Label htmlFor="cancel-reason" className="text-sm font-medium">
                                  Cancellation Reason *
                                </Label>
                                <Textarea
                                  id="cancel-reason"
                                  placeholder="Please explain why you're cancelling this session..."
                                  value={cancelReason}
                                  onChange={(e) => setCancelReason(e.target.value)}
                                  className="mt-2"
                                  required
                                />
                              </div>
                              <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setCancelReason("")}>Keep Session</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleCancelSession(session.id, cancelReason)}
                                  className="bg-orange-600 hover:bg-orange-700"
                                  disabled={actionLoading === session.id || !cancelReason.trim()}
                                >
                                  {actionLoading === session.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  ) : null}
                                  Cancel Session
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
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
