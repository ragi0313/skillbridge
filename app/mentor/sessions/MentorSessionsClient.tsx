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
  Check,
  X,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Timer,
  CreditCard,
  MessageCircle,
  DollarSign
} from "lucide-react"
import { format, isPast, isFuture, isToday } from "date-fns"
import { toast } from "@/lib/toast"

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

interface MentorSessionsClientProps {
  sessions: Session[]
}

export function MentorSessionsClient({ sessions }: MentorSessionsClientProps) {
  const [selectedTab, setSelectedTab] = useState("all")
  const [responseModalOpen, setResponseModalOpen] = useState(false)
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [responseMessage, setResponseMessage] = useState("")
  const [isAccepting, setIsAccepting] = useState(true)
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [cancelSessionId, setCancelSessionId] = useState<number | null>(null)
  const [cancellationReason, setCancellationReason] = useState("")

  // Categorize sessions
  const categorizedSessions = useMemo(() => {
    return {
      all: sessions,
      pending: sessions.filter(session => session.status === 'pending'),
      upcoming: sessions.filter(session => {
        if (!['confirmed', 'upcoming'].includes(session.status)) return false
        const dateToCheck = session.startTime || session.scheduledDate
        return dateToCheck && isFuture(new Date(dateToCheck))
      }),
      ongoing: sessions.filter(session => session.status === 'ongoing'),
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

  // Calculate earnings
  const earnings = useMemo(() => {
    const completedSessions = sessions.filter(s => s.status === 'completed')
    const noShowCompensation = sessions.filter(s => s.status === 'learner_no_show')
    
    const totalCompleted = completedSessions.reduce((sum, session) => 
      sum + Math.floor(session.totalCostCredits * 0.8), 0
    )
    
    const totalNoShow = noShowCompensation.reduce((sum, session) => 
      sum + session.totalCostCredits, 0
    )
    
    return {
      total: totalCompleted + totalNoShow,
      fromCompleted: totalCompleted,
      fromNoShow: totalNoShow,
      sessionCount: completedSessions.length + noShowCompensation.length
    }
  }, [sessions])

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: "secondary" as const, icon: Timer, label: "Pending Response", color: "text-yellow-600" },
      confirmed: { variant: "default" as const, icon: CheckCircle2, label: "Confirmed", color: "text-blue-600" },
      upcoming: { variant: "default" as const, icon: Calendar, label: "Upcoming", color: "text-blue-600" },
      ongoing: { variant: "default" as const, icon: Video, label: "Ongoing", color: "text-green-600" },
      completed: { variant: "default" as const, icon: CheckCircle2, label: "Completed", color: "text-green-600" },
      cancelled: { variant: "destructive" as const, icon: XCircle, label: "Cancelled", color: "text-red-600" },
      rejected: { variant: "destructive" as const, icon: XCircle, label: "Rejected", color: "text-red-600" },
      both_no_show: { variant: "secondary" as const, icon: AlertCircle, label: "Both No-Show", color: "text-yellow-600" },
      learner_no_show: { variant: "default" as const, icon: CheckCircle2, label: "Learner No-Show (Paid)", color: "text-green-600" },
      mentor_no_show: { variant: "destructive" as const, icon: AlertCircle, label: "You No-Show", color: "text-red-600" },
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
    
    // Can join if session is in valid status, within time window, mentor hasn't left, and not already active
    return ['confirmed', 'upcoming', 'ongoing'].includes(session.status) &&
           now >= joinWindow && 
           now <= endTime &&
           !session.mentorLeftAt && // Mentor hasn't left the session
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
    
    // Can reconnect if session is ongoing, mentor has joined before but left, session hasn't ended, and not already active
    return session.status === 'ongoing' &&
           session.mentorJoinedAt && // Mentor has joined before
           session.mentorLeftAt && // Mentor has left
           now >= startTime && 
           now <= endTime &&
           !isActiveInAnotherTab // Not already active in another tab
  }

  const handleJoinSession = (sessionId: number) => {
    // Open session in new window/tab
    window.open(`/sessions/${sessionId}`, '_blank', 'noopener,noreferrer')
  }

  const handleSessionResponse = (session: Session, accepting: boolean) => {
    setSelectedSession(session)
    setIsAccepting(accepting)
    setResponseMessage("")
    setResponseModalOpen(true)
  }

  const submitResponse = async () => {
    if (!selectedSession) return

    try {
      const endpoint = isAccepting 
        ? `/api/bookings/accept/${selectedSession.id}`
        : `/api/bookings/reject/${selectedSession.id}`
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: responseMessage })
      })

      if (!response.ok) {
        throw new Error(`Failed to ${isAccepting ? 'accept' : 'reject'} session`)
      }

      toast.success(`Session ${isAccepting ? 'accepted' : 'rejected'} successfully`)
      setResponseModalOpen(false)
      // Refresh page to show updated status
      window.location.reload()
    } catch (error) {
      console.error('Error responding to session:', error)
      toast.error(`Failed to ${isAccepting ? 'accept' : 'reject'} session`)
    }
  }

  const handleCancelSession = (sessionId: number) => {
    setCancelSessionId(sessionId)
    setCancellationReason("")
    setCancelModalOpen(true)
  }

  const submitCancellation = async () => {
    if (!cancelSessionId || !cancellationReason.trim()) {
      toast.error('Please provide a cancellation reason')
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

      toast.success('Session cancelled successfully')
      setCancelModalOpen(false)
      // Refresh page to show updated status
      window.location.reload()
    } catch (error) {
      console.error('Error cancelling session:', error)
      toast.error('Failed to cancel session')
    }
  }

  const calculateEarnings = (session: Session) => {
    if (session.status === 'completed') {
      return Math.floor(session.totalCostCredits * 0.8) // 80% after platform fee
    } else if (session.status === 'learner_no_show') {
      return session.totalCostCredits // 100% compensation
    }
    return 0
  }

  const getCategoryHeader = (category: string, count: number) => {
    const headers = {
      all: {
        title: "All Sessions",
        description: "Your complete mentoring history",
        color: "text-gray-700"
      },
      pending: {
        title: "Pending Requests",
        description: "New session requests waiting for your response",
        color: "text-yellow-700"
      },
      upcoming: {
        title: "Upcoming Sessions",
        description: "Confirmed sessions you'll be mentoring",
        color: "text-blue-700"
      },
      ongoing: {
        title: "Active Sessions",
        description: "Sessions currently in progress",
        color: "text-green-700"
      },
      completed: {
        title: "Completed Sessions",
        description: "Successfully finished mentoring sessions",
        color: "text-green-700"
      },
      declined: {
        title: "Declined Requests",
        description: "Sessions you declined or didn't respond to",
        color: "text-red-700"
      },
      no_shows: {
        title: "No-Show Sessions",
        description: "Sessions where someone didn't attend",
        color: "text-orange-700"
      },
      cancelled: {
        title: "Cancelled Sessions",
        description: "Sessions that were cancelled",
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
              <AvatarImage src={session.learnerProfilePictureUrl || undefined} />
              <AvatarFallback>
                {session.learnerFirstName?.[0]}{session.learnerLastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">
                {session.learnerFirstName} {session.learnerLastName}
              </CardTitle>
              <p className="text-sm text-gray-600">
                Experience: {session.learnerExperienceLevel}
              </p>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="outline">{session.skillName}</Badge>
              </div>
            </div>
          </div>
          <div className="text-right space-y-2">
            {getStatusBadge(session.status)}
            {['completed', 'learner_no_show'].includes(session.status) && (
              <div className="flex items-center space-x-1 text-green-600">
                <DollarSign className="w-4 h-4" />
                <span className="text-sm font-medium">
                  +{calculateEarnings(session)} credits
                </span>
              </div>
            )}
          </div>
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
                  ? "Learner joined"
                  : "You joined"}
              </span>
            </div>
          )}
        </div>

        {/* Learner's Session Notes */}
        {session.sessionNotes && (
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <MessageCircle className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium">Learner's Notes:</span>
            </div>
            <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
              {session.sessionNotes}
            </p>
          </div>
        )}

        {/* Your Response Message */}
        {session.mentorResponseMessage && (
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <MessageCircle className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium">Your Response:</span>
            </div>
            <p className="text-sm text-blue-600 bg-blue-50 p-3 rounded-md">
              {session.mentorResponseMessage}
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
          {session.status === 'pending' && (
            <>
              <Button 
                onClick={() => handleSessionResponse(session, true)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Check className="w-4 h-4 mr-2" />
                Accept
              </Button>
              <Button 
                variant="outline"
                onClick={() => handleSessionResponse(session, false)}
              >
                <X className="w-4 h-4 mr-2" />
                Decline
              </Button>
              <div className="text-xs text-gray-500 self-center">
                Expires: {format(new Date(session.expiresAt), "MMM dd 'at' h:mm a")}
              </div>
            </>
          )}

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

          {session.status === 'confirmed' && session.startTime && 
           isFuture(new Date(session.startTime)) && (
            <Button 
              variant="outline"
              onClick={() => handleCancelSession(session.id)}
            >
              Cancel Session
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )

  return (
    <>
      {/* Earnings Summary */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DollarSign className="w-5 h-5" />
            <span>Earnings Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">
                {earnings.total}
              </div>
              <div className="text-sm text-gray-600">Total Credits Earned</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {earnings.fromCompleted}
              </div>
              <div className="text-sm text-gray-600">From Completed Sessions</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">
                {earnings.fromNoShow}
              </div>
              <div className="text-sm text-gray-600">No-Show Compensation</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-700">
                {earnings.sessionCount}
              </div>
              <div className="text-sm text-gray-600">Paid Sessions</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 gap-1">
          <TabsTrigger value="all" className="text-xs">
            All ({categorizedSessions.all.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="text-xs">
            Pending ({categorizedSessions.pending.length})
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="text-xs">
            Upcoming ({categorizedSessions.upcoming.length})
          </TabsTrigger>
          <TabsTrigger value="ongoing" className="text-xs">
            Ongoing ({categorizedSessions.ongoing.length})
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
                        ? 'No sessions have been booked with you yet. Optimize your profile to attract learners!'
                        : category === 'pending'
                        ? 'No new session requests at the moment'
                        : category === 'upcoming'
                        ? 'You have no upcoming mentoring sessions'
                        : category === 'ongoing'
                        ? 'No active mentoring sessions right now'
                        : category === 'completed'
                        ? 'You haven\'t completed any sessions yet'
                        : category === 'declined'
                        ? 'No declined sessions - you\'re very responsive!'
                        : category === 'no_shows'
                        ? 'No no-show sessions - excellent reliability!'
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

      {/* Response Modal */}
      <Dialog open={responseModalOpen} onOpenChange={setResponseModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isAccepting ? 'Accept' : 'Decline'} Session Request
            </DialogTitle>
          </DialogHeader>
          
          {selectedSession && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Session with {selectedSession.learnerFirstName} {selectedSession.learnerLastName}
                </p>
                <p className="text-sm font-medium">
                  {format(new Date(selectedSession.scheduledDate), "MMM dd, yyyy 'at' h:mm a")} 
                  ({selectedSession.durationMinutes} minutes)
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  {isAccepting ? 'Welcome message (optional)' : 'Reason for declining (optional)'}
                </label>
                <Textarea
                  value={responseMessage}
                  onChange={(e) => setResponseMessage(e.target.value)}
                  placeholder={
                    isAccepting 
                      ? "Looking forward to our session! Let me know if you have any questions."
                      : "Please explain why you're declining this session request."
                  }
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setResponseModalOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={submitResponse}
              className={isAccepting ? "bg-green-600 hover:bg-green-700" : ""}
              variant={isAccepting ? "default" : "destructive"}
            >
              {isAccepting ? 'Accept Session' : 'Decline Session'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancellation Modal */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Session</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Please provide a reason for cancelling this session. This will help us improve our service and will be shared with the learner.
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