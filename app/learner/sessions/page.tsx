"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Header from "@/components/learner/Header"
import Footer from "@/components/landing/Footer"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Calendar, Clock, DollarSign, Loader2, Video, X, AlertTriangle } from 'lucide-react'
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog"
import { Textarea } from "@/components/ui/textarea"

// Define types for session data
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
  cancelledAt?: string
  cancelledBy?: number
  cancellationReason?: string
  refundAmount?: number
}

type SessionStatus = "all" | "pending" | "upcoming" | "completed" | "cancelled" | "rejected"

export default function LearnerSessionsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState<BookingSession[]>([])
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<SessionStatus>("upcoming")
  const [cancellingSessionId, setCancellingSessionId] = useState<number | null>(null)
  const [cancellationReason, setCancellationReason] = useState("")

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

  const getRefundPolicy = (scheduledDate: string) => {
    const now = new Date()
    const sessionDate = new Date(scheduledDate)
    const hoursUntilSession = (sessionDate.getTime() - now.getTime()) / (1000 * 60 * 60)

    if (hoursUntilSession >= 24) {
      return { type: "full", message: "Full refund (100%)", color: "text-green-600" }
    } else if (hoursUntilSession >= 2) {
      return { type: "partial", message: "Partial refund (50%)", color: "text-yellow-600" }
    } else {
      return { type: "none", message: "No refund", color: "text-red-600" }
    }
  }

  const fetchLearnerSessions = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/learner/sessions", { cache: "no-store" })
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
      console.error("Error fetching learner sessions:", err)
      setError(err.message || "Failed to load sessions.")
      toast.error("Error", {
        description: err.message || "Failed to load your sessions. Please try again.",
      })
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchLearnerSessions()
  }, [fetchLearnerSessions])

  const handleCancelSession = async (sessionId: number) => {
    setCancellingSessionId(sessionId)
    try {
      const res = await fetch(`/api/bookings/cancel/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancellationReason }),
      })
      
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to cancel session")
      }

      toast.success("Session cancelled successfully!", {
        description: `${data.refundType} refund processed. ${data.refundAmount || 0} credits refunded.`,
      })

      setCancellationReason("")
      fetchLearnerSessions() // Refresh sessions
    } catch (err: any) {
      toast.error("Cancellation failed", {
        description: err.message,
      })
    } finally {
      setCancellingSessionId(null)
    }
  }

  const getJoinSessionUrl = async (sessionId: number) => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}/join`)
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to get session join URL")
      }
      const data = await res.json()
      return data.joinUrl
    } catch (err: any) {
      toast.error("Error joining session", { description: err.message })
      return null
    }
  }

  const filterSessions = (status: SessionStatus) => {
    const now = new Date()
    return sessions.filter((session) => {
      const sessionDate = new Date(session.scheduledDate)
      switch (status) {
        case "all":
          return true
        case "pending":
          return session.status === "pending"
        case "upcoming":
          return session.status === "confirmed" && sessionDate > now
        case "completed":
          return session.status === "completed" || (session.status === "confirmed" && sessionDate <= now)
        case "cancelled":
          return session.status === "cancelled"
        case "rejected":
          return session.status === "rejected"
        default:
          return false
      }
    })
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: "secondary" as const, label: "Pending" },
      confirmed: { variant: "default" as const, label: "Confirmed" },
      completed: { variant: "outline" as const, label: "Completed" },
      cancelled: { variant: "destructive" as const, label: "Cancelled" },
      rejected: { variant: "destructive" as const, label: "Rejected" },
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || { variant: "secondary" as const, label: status }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const renderSessionCards = (filteredSessions: BookingSession[]) => {
    if (filteredSessions.length === 0) {
      return (
        <div className="text-center py-10 text-gray-500">
          <p className="text-lg">No sessions found for this status.</p>
          {activeTab === "upcoming" && (
            <Button onClick={() => router.push("/find-mentors")} className="mt-4 gradient-bg text-white">
              Find a Mentor
            </Button>
          )}
        </div>
      )
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSessions.map((session) => {
          const sessionDate = new Date(session.scheduledDate)
          const now = new Date()
          const canJoin = session.status === "confirmed" && Math.abs(sessionDate.getTime() - now.getTime()) <= 10 * 60 * 1000 // 10 minutes window
          const canCancel = ['pending', 'confirmed'].includes(session.status) && sessionDate > now
          const refundPolicy = getRefundPolicy(session.scheduledDate)
          
          return (
            <Card key={session.id} className="shadow-md hover:shadow-lg transition-shadow duration-300">
              <CardHeader className="flex flex-row items-center space-x-4 pb-2">
                <Avatar className="h-16 w-16 border-2 border-white/20">
                  <AvatarImage src={session.mentorProfilePicture || "/default-avatar.png"} />
                  <AvatarFallback>{session.mentorFirstName[0]}{session.mentorLastName[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold">{session.mentorFirstName} {session.mentorLastName}</CardTitle>
                    {getStatusBadge(session.status)}
                  </div>
                  <CardDescription className="text-sm text-gray-600">
                    {session.mentorProfessionalTitle} • {session.skillName}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
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
                  <span>Cost: {session.totalCostCredits} credits</span>
                </div>
                
                {session.sessionNotes && (
                  <p className="text-sm text-gray-700 mt-2 line-clamp-2">
                    <span className="font-medium">Notes:</span> {session.sessionNotes}
                  </p>
                )}

                {/* Cancellation info */}
                {session.status === 'cancelled' && session.refundAmount !== undefined && (
                  <div className="bg-gray-50 p-2 rounded text-sm">
                    <p className="font-medium text-gray-700">Cancelled</p>
                    <p className="text-gray-600">Refund: {session.refundAmount} credits</p>
                    {session.cancellationReason && (
                      <p className="text-gray-600">Reason: {session.cancellationReason}</p>
                    )}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-2 mt-4">
                  {canJoin && (
                    <Button
                      size="sm"
                      className="gradient-bg text-white"
                      onClick={async () => {
                        const joinUrl = await getJoinSessionUrl(session.id)
                        if (joinUrl) {
                          window.open(joinUrl, "_blank")
                        }
                      }}
                    >
                      <Video className="mr-2 h-4 w-4" />
                      Join Session
                    </Button>
                  )}
                  
                  {canCancel && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
                          <X className="mr-2 h-4 w-4" />
                          Cancel
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-yellow-600" />
                            Cancel Session
                          </AlertDialogTitle>
                          <AlertDialogDescription className="space-y-2">
                            <p>Are you sure you want to cancel this session with {session.mentorFirstName} {session.mentorLastName}?</p>
                            <div className={`font-medium ${refundPolicy.color}`}>
                              {refundPolicy.message}
                            </div>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="py-4">
                          <label className="text-sm font-medium text-gray-700">
                            Reason for cancellation (optional):
                          </label>
                          <Textarea
                            value={cancellationReason}
                            onChange={(e) => setCancellationReason(e.target.value)}
                            placeholder="Please let us know why you're cancelling..."
                            className="mt-2"
                          />
                        </div>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Keep Session</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleCancelSession(session.id)}
                            disabled={cancellingSessionId === session.id}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            {cancellingSessionId === session.id ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Cancelling...
                              </>
                            ) : (
                              "Cancel Session"
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  
                  <Button size="sm" variant="outline" className="flex-1">
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-600 text-lg">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            Loading sessions...
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">My Sessions</h1>
        
        {sessions.length === 0 ? (
          <Card className="shadow-lg border-0 bg-white p-6 text-center">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-900">No Sessions Yet</CardTitle>
              <CardDescription className="text-gray-600">
                You haven't booked any mentoring sessions yet. Find a mentor to get started!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => router.push("/find-mentors")} className="gradient-bg text-white">
                Find a Mentor
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as SessionStatus)} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
            <Separator className="my-4" />
            <TabsContent value="upcoming">{renderSessionCards(filterSessions("upcoming"))}</TabsContent>
            <TabsContent value="pending">{renderSessionCards(filterSessions("pending"))}</TabsContent>
            <TabsContent value="completed">{renderSessionCards(filterSessions("completed"))}</TabsContent>
            <TabsContent value="cancelled">{renderSessionCards(filterSessions("cancelled"))}</TabsContent>
            <TabsContent value="all">{renderSessionCards(filterSessions("all"))}</TabsContent>
          </Tabs>
        )}
      </main>
      <Footer />
    </div>
  )
}
