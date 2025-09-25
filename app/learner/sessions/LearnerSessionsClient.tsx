"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { 
  Calendar, 
  Clock, 
  User, 
  Video, 
  Star,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Timer,
  CreditCard,
  MessageCircle
} from "lucide-react"
import { format, isPast, isFuture, isToday } from "date-fns"
import { SessionRatingModal } from "@/components/session/SessionRatingModal"
import { toast } from "sonner"

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
  expiresAt: string
  createdAt: string
  mentorFirstName: string | null
  mentorLastName: string | null
  mentorProfilePictureUrl: string | null
  mentorProfessionalTitle: string | null
  skillName: string | null
  skillRatePerHour: number | null
  // Review information
  reviewId: number | null
  reviewRating: number | null
  reviewText: string | null
  reviewCreatedAt: string | null
}

interface LearnerSessionsClientProps {
  sessions: Session[]
}

export function LearnerSessionsClient({ sessions }: LearnerSessionsClientProps) {
  const [selectedTab, setSelectedTab] = useState("all")
  const [ratingModalOpen, setRatingModalOpen] = useState(false)
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null)
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [cancelSessionId, setCancelSessionId] = useState<number | null>(null)
  const [cancellationReason, setCancellationReason] = useState("")

  // Categorize sessions
  const categorizedSessions = useMemo(() => {
    const now = new Date()
    
    return {
      all: sessions,
      upcoming: sessions.filter(session => 
        ['confirmed', 'upcoming'].includes(session.status)
      ),
      ongoing: sessions.filter(session => session.status === 'ongoing'),
      pending: sessions.filter(session => session.status === 'pending'),
      completed: sessions.filter(session => 
        ['completed', 'technical_issues'].includes(session.status)
      ),
      declined: sessions.filter(session => 
        ['rejected', 'mentor_no_response'].includes(session.status)
      ),
      no_shows: sessions.filter(session => 
        ['both_no_show', 'learner_no_show', 'mentor_no_show'].includes(session.status)
      ),
      cancelled: sessions.filter(session => session.status === 'cancelled'),
    }
  }, [sessions])

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: "secondary" as const, icon: Timer, label: "Pending", color: "text-yellow-600" },
      confirmed: { variant: "default" as const, icon: CheckCircle2, label: "Confirmed", color: "text-blue-600" },
      upcoming: { variant: "default" as const, icon: Calendar, label: "Upcoming", color: "text-blue-600" },
      ongoing: { variant: "default" as const, icon: Video, label: "Ongoing", color: "text-green-600" },
      completed: { variant: "default" as const, icon: CheckCircle2, label: "Completed", color: "text-green-600" },
      cancelled: { variant: "destructive" as const, icon: XCircle, label: "Cancelled", color: "text-red-600" },
      rejected: { variant: "destructive" as const, icon: XCircle, label: "Rejected", color: "text-red-600" },
      both_no_show: { variant: "destructive" as const, icon: AlertCircle, label: "Both No-Show", color: "text-red-600" },
      learner_no_show: { variant: "destructive" as const, icon: AlertCircle, label: "You No-Show", color: "text-red-600" },
      mentor_no_show: { variant: "secondary" as const, icon: AlertCircle, label: "Mentor No-Show", color: "text-yellow-600" },
      mentor_no_response: { variant: "destructive" as const, icon: AlertCircle, label: "No Response", color: "text-red-600" },
      technical_issues: { variant: "secondary" as const, icon: AlertCircle, label: "Technical Issues", color: "text-yellow-600" },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="flex items-center space-x-1">
        <Icon className="w-3 h-3" />
        <span>{config.label}</span>
      </Badge>
    )
  }

  const canJoinSession = (session: Session) => {
    if (!session.startTime) return false
    
    const now = new Date()
    const startTime = new Date(session.startTime)
    const endTime = new Date(session.endTime!)
    const joinWindow = new Date(startTime.getTime() - 30 * 60 * 1000) // 30 minutes before
    
    // Check if this session is already open in another tab
    const activeSessionKey = `activeSession_${session.id}`
    const isActiveInAnotherTab = localStorage.getItem(activeSessionKey) === 'true'
    
    // Can join if session is in valid status, within time window, user hasn't left, and not already active
    return ['confirmed', 'upcoming', 'ongoing'].includes(session.status) &&
           now >= joinWindow && 
           now <= endTime &&
           !session.learnerLeftAt && // User hasn't left the session
           !isActiveInAnotherTab // Not already active in another tab
  }

  const canReconnectSession = (session: Session) => {
    if (!session.startTime) return false
    
    const now = new Date()
    const startTime = new Date(session.startTime)
    const endTime = new Date(session.endTime!)
    
    // Check if this session is already open in another tab
    const activeSessionKey = `activeSession_${session.id}`
    const isActiveInAnotherTab = localStorage.getItem(activeSessionKey) === 'true'
    
    // Can reconnect if session is ongoing, user has joined before but left, session hasn't ended, and not already active
    return session.status === 'ongoing' &&
           session.learnerJoinedAt && // User has joined before
           session.learnerLeftAt && // User has left
           now >= startTime && 
           now <= endTime &&
           !isActiveInAnotherTab // Not already active in another tab
  }

  const handleJoinSession = (sessionId: number) => {
    // Open session in new window/tab
    window.open(`/sessions/${sessionId}`, '_blank', 'noopener,noreferrer')
  }

  const handleCancelSession = (sessionId: number) => {
    setCancelSessionId(sessionId)
    setCancellationReason("")
    setCancelModalOpen(true)
  }

  const submitCancellation = async () => {
    if (!cancelSessionId || !cancellationReason.trim()) {
      toast.error('Please provide a cancellation reason', {
        description: "A reason is required to cancel your session.",
        duration: 3000,
      })
      return
    }

    try {
      const response = await fetch(`/api/bookings/cancel/${cancelSessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancellationReason })
      })

      if (!response.ok) {
        throw new Error('Failed to cancel session')
      }

      toast.success('Session cancelled successfully!', {
        description: "Your mentor has been notified and any credits will be refunded according to our policy.",
        duration: 4000,
      })
      setCancelModalOpen(false)
      // Refresh page to show updated status
      window.location.reload()
    } catch (error) {
      console.error('Error cancelling session:', error)
      toast.error('Failed to cancel session', {
        description: "Please try again. If the problem persists, contact support.",
        duration: 5000,
      })
    }
  }

  const getCategoryHeader = (category: string, count: number) => {
    const headers = {
      all: {
        title: "All Sessions",
        description: "Your complete session history",
        color: "text-gray-700"
      },
      upcoming: {
        title: "Upcoming Sessions", 
        description: "Sessions you have scheduled with mentors",
        color: "text-blue-700"
      },
      ongoing: {
        title: "Active Sessions",
        description: "Sessions currently in progress", 
        color: "text-green-700"
      },
      pending: {
        title: "Pending Approval",
        description: "Waiting for mentor to accept your session requests",
        color: "text-yellow-700"
      },
      completed: {
        title: "Completed Sessions",
        description: "Successfully finished mentoring sessions",
        color: "text-green-700"
      },
      declined: {
        title: "Declined Sessions",
        description: "Sessions that were rejected or where mentor didn't respond",
        color: "text-red-700"
      },
      no_shows: {
        title: "No-Show Sessions",
        description: "Sessions where someone didn't attend",
        color: "text-orange-700"
      },
      cancelled: {
        title: "Cancelled Sessions", 
        description: "Sessions that were cancelled before they started",
        color: "text-gray-700"
      }
    }

    const header = headers[category as keyof typeof headers] || headers.all

    return (
      <div className="mb-6 p-4 bg-white border rounded-lg shadow-sm">
        <div>
          <h2 className={`text-xl font-semibold ${header.color}`}>
            {header.title} ({count})
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {header.description}
          </p>
        </div>
      </div>
    )
  }

  const getSessionCardClass = (status: string) => {
    return "border border-gray-200 bg-white"
  }

  const renderSession = (session: Session) => (
    <Card key={session.id} className={`mb-4 ${getSessionCardClass(session.status)} transition-all hover:shadow-md`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <Avatar>
              <AvatarImage src={session.mentorProfilePictureUrl || undefined} />
              <AvatarFallback>
                {session.mentorFirstName?.[0]}{session.mentorLastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">
                {session.mentorFirstName} {session.mentorLastName}
              </CardTitle>
              <p className="text-sm text-gray-600">{session.mentorProfessionalTitle}</p>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="outline">{session.skillName}</Badge>
              </div>
            </div>
          </div>
          {getStatusBadge(session.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Session Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span>
              {session.startTime 
                ? `Date: ${format(new Date(session.startTime), "MMM dd, yyyy")}`
                : `Date: ${format(new Date(session.scheduledDate), "MMM dd, yyyy")}`}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <span>
              {session.startTime && session.endTime
                ? `Time: ${format(new Date(session.startTime), "h:mm a")} - ${format(new Date(session.endTime), "h:mm a")}`
                : session.startTime
                ? `Start Time: ${format(new Date(session.startTime), "h:mm a")}`
                : `Duration: ${session.durationMinutes} minutes`}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <CreditCard className="w-4 h-4 text-gray-500" />
            <span>Total Cost: {session.totalCostCredits} credits</span>
            {session.refundAmount !== 0 && session.refundAmount != null && (
              <Badge variant="secondary" className="ml-2">
                Refunded: {session.refundAmount} credits
              </Badge>
            )}
          </div>
          {(session.learnerJoinedAt || session.mentorJoinedAt) && (
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-gray-500" />
              <span>
                {session.learnerJoinedAt && session.mentorJoinedAt 
                  ? "Both joined"
                  : session.learnerJoinedAt 
                  ? "You joined"
                  : "Mentor joined"}
              </span>
            </div>
          )}
        </div>

        {/* Session Notes */}
        {session.sessionNotes && (
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <MessageCircle className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium">Your Notes:</span>
            </div>
            <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
              {session.sessionNotes}
            </p>
          </div>
        )}

        {/* Rejection/Cancellation Reason */}
        {(session.rejectionReason || session.cancellationReason) && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-800">
              <strong>
                {session.rejectionReason ? "Rejection Reason: " : "Cancellation Reason: "}
              </strong>
              {session.rejectionReason || session.cancellationReason}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          {canJoinSession(session) && (
            <Button 
              onClick={() => handleJoinSession(session.id)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Video className="w-4 h-4 mr-2" />
              Join Session
            </Button>
          )}
          
          {canReconnectSession(session) && (
            <Button 
              onClick={() => handleJoinSession(session.id)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Video className="w-4 h-4 mr-2" />
              Reconnect
            </Button>
          )}
          
          {session.status === 'pending' && (
            <Button 
              variant="outline"
              onClick={() => handleCancelSession(session.id)}
            >
              Cancel Request
            </Button>
          )}

          {session.status === 'confirmed' && session.startTime && 
           isFuture(new Date(session.startTime)) && (
            <Button 
              variant="outline"
              onClick={() => handleCancelSession(session.id)}
            >
              Cancel Session
            </Button>
          )}

          {session.status === 'completed' && (
            session.reviewId ? (
              // Already reviewed - show review complete with stars
              <div className="flex items-center space-x-2 py-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">Review Complete</span>
                <div className="flex items-center ml-2">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star
                      key={i}
                      className={`w-3 h-3 ${
                        i < (session.reviewRating || 0)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                  <span className="text-xs text-green-700 ml-1">
                    ({session.reviewRating}/5)
                  </span>
                </div>
              </div>
            ) : (
              // Not reviewed yet - show rate mentor button
              <Button 
                variant="outline"
                onClick={() => {
                  setSelectedSessionId(session.id)
                  setRatingModalOpen(true)
                }}
              >
                <Star className="w-4 h-4 mr-2" />
                Rate Mentor
              </Button>
            )
          )}

          {session.status === 'pending' && (
            <div className="text-xs text-gray-500">
              Expires: {format(new Date(session.expiresAt), "MMM dd 'at' h:mm a")}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )

  return (
    <>
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 gap-1">
          <TabsTrigger value="all" className="text-xs">
            All ({categorizedSessions.all.length})
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="text-xs">
            Upcoming ({categorizedSessions.upcoming.length})
          </TabsTrigger>
          <TabsTrigger value="ongoing" className="text-xs">
            Ongoing ({categorizedSessions.ongoing.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="text-xs">
            Pending ({categorizedSessions.pending.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="text-xs">
            Completed ({categorizedSessions.completed.length})
          </TabsTrigger>
          <TabsTrigger value="declined" className="text-xs">
            Declined ({categorizedSessions.declined.length})
          </TabsTrigger>
          <TabsTrigger value="no_shows" className="text-xs">
            No Shows ({categorizedSessions.no_shows.length})
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="text-xs">
            Cancelled ({categorizedSessions.cancelled.length})
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          {Object.entries(categorizedSessions).map(([category, sessionList]) => (
            <TabsContent key={category} value={category}>
              {getCategoryHeader(category, sessionList.length)}
              
              {sessionList.length === 0 ? (
                <Card className="border-2 border-dashed border-gray-200">
                  <CardContent className="text-center py-16">
                    <div className="text-4xl mb-4">🔍</div>
                    <p className="text-gray-500 text-lg font-medium mb-2">
                      No {category.replace('_', ' ')} sessions found
                    </p>
                    <p className="text-gray-400 text-sm">
                      {category === 'all' 
                        ? 'You haven\'t booked any sessions yet. Start by finding a mentor!'
                        : category === 'pending'
                        ? 'No sessions waiting for mentor approval'
                        : category === 'upcoming'
                        ? 'You have no upcoming sessions scheduled'
                        : category === 'ongoing'
                        ? 'No active sessions at the moment'
                        : category === 'completed'
                        ? 'You haven\'t completed any sessions yet'
                        : category === 'declined'
                        ? 'No declined sessions - that\'s great!'
                        : category === 'no_shows'
                        ? 'No no-show sessions - excellent attendance!'
                        : 'No cancelled sessions found'}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {sessionList.map(renderSession)}
                </div>
              )}
            </TabsContent>
          ))}
        </div>
      </Tabs>

      {/* Rating Modal */}
      {ratingModalOpen && selectedSessionId && (
        <SessionRatingModal
          sessionId={selectedSessionId}
          onClose={() => {
            setRatingModalOpen(false)
            setSelectedSessionId(null)
          }}
        />
      )}

      {/* Cancellation Modal */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Session</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Please provide a reason for cancelling this session. This will help us improve our service and will be shared with the mentor.
            </p>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Cancellation Reason *
              </label>
              <Textarea
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="Please explain why you need to cancel this session..."
                rows={4}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setCancelModalOpen(false)}
            >
              Keep Session
            </Button>
            <Button 
              onClick={submitCancellation}
              variant="destructive"
              disabled={!cancellationReason.trim()}
            >
              Cancel Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}