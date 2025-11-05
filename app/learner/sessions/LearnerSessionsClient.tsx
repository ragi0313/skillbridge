"use client"

import { useState, useMemo, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
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
  MessageCircle,
  Search,
  MoreVertical,
  Eye,
  EyeOff,
  Archive,
  ArchiveRestore
} from "lucide-react"
import { CreditsIcon } from "@/components/ui/credits-icon"
import { format, isPast, isFuture, isToday } from "date-fns"
import { SessionRatingModal } from "@/components/session/SessionRatingModal"
import { RefundRequestModal } from "@/components/learner/RefundRequestModal"
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
  const searchParams = useSearchParams()
  const [selectedTab, setSelectedTab] = useState("all")
  const [ratingModalOpen, setRatingModalOpen] = useState(false)
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null)
  const [refundModalOpen, setRefundModalOpen] = useState(false)
  const [refundSessionId, setRefundSessionId] = useState<number | null>(null)
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [cancelSessionId, setCancelSessionId] = useState<number | null>(null)
  const [cancellationReason, setCancellationReason] = useState("")

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("")
  const [dateRangeFilter, setDateRangeFilter] = useState("all")
  const [compactView, setCompactView] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [showArchived, setShowArchived] = useState(false)
  const sessionsPerPage = 10

  // Archive functionality - sessions older than 6 months are eligible for archiving
  const [archivedSessions, setArchivedSessions] = useState<Set<number>>(new Set())

  // Check for feedback query parameter and open rating modal
  useEffect(() => {
    const feedbackSessionId = searchParams.get('feedback')
    if (feedbackSessionId) {
      const sessionId = parseInt(feedbackSessionId, 10)
      const session = sessions.find(s => s.id === sessionId)

      // Only open modal if session exists, is completed, and hasn't been reviewed yet
      if (session && session.status === 'completed' && !session.reviewId) {
        setSelectedSessionId(sessionId)
        setRatingModalOpen(true)
        setSelectedTab('completed') // Switch to completed tab
      }
    }
  }, [searchParams, sessions])

  const isSessionArchivable = (session: Session) => {
    const sessionDate = new Date(session.startTime || session.scheduledDate)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    return sessionDate < sixMonthsAgo && ['completed', 'cancelled', 'rejected', 'mentor_no_response'].includes(session.status)
  }

  const handleArchiveSession = (sessionId: number) => {
    setArchivedSessions(prev => new Set([...prev, sessionId]))
    toast.success('Session archived', {
      description: 'You can find it in the archived sessions view.',
      duration: 3000,
    })
  }

  const handleUnarchiveSession = (sessionId: number) => {
    setArchivedSessions(prev => {
      const newSet = new Set(prev)
      newSet.delete(sessionId)
      return newSet
    })
    toast.success('Session unarchived', {
      description: 'Session moved back to main view.',
      duration: 3000,
    })
  }

  // Filter and search sessions
  const filteredSessions = useMemo(() => {
    let filtered = sessions

    // Apply archive filter first
    if (showArchived) {
      filtered = filtered.filter(session => archivedSessions.has(session.id))
    } else {
      filtered = filtered.filter(session => !archivedSessions.has(session.id))
    }

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(session =>
        `${session.mentorFirstName} ${session.mentorLastName}`.toLowerCase().includes(term) ||
        session.skillName?.toLowerCase().includes(term) ||
        session.sessionNotes?.toLowerCase().includes(term) ||
        session.mentorProfessionalTitle?.toLowerCase().includes(term)
      )
    }


    // Apply date range filter
    if (dateRangeFilter !== "all") {
      const now = new Date()
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

      filtered = filtered.filter(session => {
        const sessionDate = new Date(session.startTime || session.scheduledDate)
        switch (dateRangeFilter) {
          case "week":
            return sessionDate >= oneWeekAgo
          case "month":
            return sessionDate >= oneMonthAgo
          case "quarter":
            return sessionDate >= threeMonthsAgo
          default:
            return true
        }
      })
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => {
      const aDate = new Date(a.startTime || a.scheduledDate)
      const bDate = new Date(b.startTime || b.scheduledDate)
      return bDate.getTime() - aDate.getTime()
    })

    return filtered
  }, [sessions, searchTerm, dateRangeFilter, showArchived, archivedSessions])

  // Categorize filtered sessions
  const categorizedSessions = useMemo(() => {
    return {
      all: filteredSessions,
      upcoming: filteredSessions.filter(session =>
        ['confirmed', 'upcoming'].includes(session.status)
      ),
      ongoing: filteredSessions.filter(session => session.status === 'ongoing'),
      pending: filteredSessions.filter(session => session.status === 'pending'),
      completed: filteredSessions.filter(session =>
        ['completed', 'technical_issues'].includes(session.status)
      ),
      declined: filteredSessions.filter(session =>
        ['rejected', 'mentor_no_response'].includes(session.status)
      ),
      no_shows: filteredSessions.filter(session =>
        ['both_no_show', 'learner_no_show', 'mentor_no_show'].includes(session.status)
      ),
      cancelled: filteredSessions.filter(session => session.status === 'cancelled'),
    }
  }, [filteredSessions])

  // Paginate sessions
  const paginatedSessions = useMemo(() => {
    const currentSessions = categorizedSessions[selectedTab as keyof typeof categorizedSessions] || []
    const startIndex = (currentPage - 1) * sessionsPerPage
    const endIndex = startIndex + sessionsPerPage
    return {
      sessions: currentSessions.slice(startIndex, endIndex),
      totalPages: Math.ceil(currentSessions.length / sessionsPerPage),
      totalSessions: currentSessions.length
    }
  }, [categorizedSessions, selectedTab, currentPage, sessionsPerPage])

  // Reset pagination when filters change
  const resetPagination = () => setCurrentPage(1)

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

  const renderSession = (session: Session) => {
    if (compactView) {
      return (
        <div key={session.id} className="p-4 border border-gray-200 rounded-lg bg-white hover:shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="w-8 h-8">
                <AvatarImage src={session.mentorProfilePictureUrl || undefined} />
                <AvatarFallback className="text-xs">
                  {session.mentorFirstName?.[0]}{session.mentorLastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium text-sm">
                  {session.mentorFirstName} {session.mentorLastName}
                </div>
                <div className="text-xs text-gray-500 flex items-center gap-2">
                  <span>{session.skillName}</span>
                  <span>•</span>
                  <span>
                    {session.startTime
                      ? format(new Date(session.startTime), "MMM dd, h:mm a")
                      : format(new Date(session.scheduledDate), "MMM dd, yyyy")}
                  </span>
                  <span>•</span>
                  <span>{session.totalCostCredits} credits</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {getStatusBadge(session.status)}
              {canJoinSession(session) && (
                <Button size="sm" onClick={() => handleJoinSession(session.id)} className="bg-green-600 hover:bg-green-700">
                  <Video className="w-3 h-3 mr-1" />
                  Join
                </Button>
              )}
              {canReconnectSession(session) && (
                <Button size="sm" onClick={() => handleJoinSession(session.id)} className="bg-blue-600 hover:bg-blue-700">
                  <Video className="w-3 h-3 mr-1" />
                  Reconnect
                </Button>
              )}
              {/* Archive/Unarchive button in compact view */}
              {showArchived ? (
                <Button size="sm" variant="outline" onClick={() => handleUnarchiveSession(session.id)}>
                  <ArchiveRestore className="w-3 h-3" />
                </Button>
              ) : (
                isSessionArchivable(session) && (
                  <Button size="sm" variant="outline" onClick={() => handleArchiveSession(session.id)}>
                    <Archive className="w-3 h-3" />
                  </Button>
                )
              )}
            </div>
          </div>
        </div>
      )
    }

    return (
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
          <div className="text-right space-y-2">
            {getStatusBadge(session.status)}
            {session.refundAmount !== 0 && session.refundAmount != null && (
              <div className="flex items-center justify-end space-x-1 text-green-600">
                <CreditsIcon className="w-4 h-4" />
                <span className="text-sm font-medium">
                  +{session.refundAmount} refunded
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
            <CreditsIcon className="w-4 h-4 text-gray-500" />
            <span>Cost: {session.totalCostCredits} credits</span>
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

        {/* No-Show Status Indicators */}
        {session.status === 'learner_no_show' && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm font-semibold text-red-800">You Missed This Session</span>
            </div>
            <p className="text-sm text-red-700">
              You didn't join this session. No refund was issued.
            </p>
          </div>
        )}

        {session.status === 'mentor_no_show' && (
          <div className="bg-green-50 border border-green-200 rounded-md p-3">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-sm font-semibold text-green-800">Mentor No-Show - Full Refund</span>
            </div>
            <p className="text-sm text-green-700">
              The mentor didn't attend. You received a full refund of {session.totalCostCredits} credits.
            </p>
          </div>
        )}

        {session.status === 'both_no_show' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-semibold text-yellow-800">Session Not Attended</span>
            </div>
            <p className="text-sm text-yellow-700">
              Neither party joined this session.
            </p>
          </div>
        )}

        {/* Technical Issues Indicator */}
        {session.status === 'technical_issues' && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-semibold text-blue-800">Technical Issues Encountered</span>
            </div>
            <p className="text-sm text-blue-700">
              This session experienced technical difficulties. Please contact support if you have concerns.
            </p>
          </div>
        )}

        {/* Rejection/Cancellation Reason */}
        {(session.rejectionReason || session.cancellationReason) && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm font-semibold text-red-800">
                {session.rejectionReason ? "Session Rejected" : "Session Cancelled"}
              </span>
            </div>
            <p className="text-sm text-red-700">
              <strong>Reason: </strong>
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
            <>
              {session.reviewId ? (
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
              )}
              {/* Request Refund button - only show if not already refunded */}
              {!session.refundAmount && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setRefundSessionId(session.id)
                    setRefundModalOpen(true)
                  }}
                >
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Request Refund
                </Button>
              )}
            </>
          )}

          {session.status === 'pending' && (
            <div className="text-xs text-gray-500">
              Expires: {format(new Date(session.expiresAt), "MMM dd 'at' h:mm a")}
            </div>
          )}

          {/* Archive/Unarchive button in detailed view */}
          {showArchived ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleUnarchiveSession(session.id)}
              className="flex items-center gap-2"
            >
              <ArchiveRestore className="w-4 h-4" />
              Unarchive
            </Button>
          ) : (
            isSessionArchivable(session) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleArchiveSession(session.id)}
                className="flex items-center gap-2"
              >
                <Archive className="w-4 h-4" />
                Archive
              </Button>
            )
          )}
        </div>
      </CardContent>
    </Card>
    )
  }

  return (
    <>
      {/* Search and Filter Controls */}
      <div className="mb-6 space-y-4">
        {/* Date Range Filter */}
        <div className="flex flex-wrap gap-3">
          <Select value={dateRangeFilter} onValueChange={(value) => { setDateRangeFilter(value); resetPagination() }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="week">Past Week</SelectItem>
              <SelectItem value="month">Past Month</SelectItem>
              <SelectItem value="quarter">Past 3 Months</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Search Bar and Options Menu Row */}
        <div className="flex gap-3 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search by mentor name, skill, or notes..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                resetPagination()
              }}
              className="pl-10 pr-4 h-11"
            />
          </div>

          {/* Options Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="default" className="h-11 px-3">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setShowArchived(!showArchived)
                  resetPagination()
                }}
                className="flex items-center gap-2"
              >
                {showArchived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                {showArchived ? "Show Active" : "Show Archived"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setCompactView(!compactView)}
                className="flex items-center gap-2"
              >
                {compactView ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                {compactView ? "Detailed" : "Compact"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={(value) => { setSelectedTab(value); resetPagination() }}>
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

              {paginatedSessions.totalSessions === 0 ? (
                <Card className="border-2 border-dashed border-gray-200">
                  <CardContent className="text-center py-16">
                    <div className="text-4xl mb-4">🔍</div>
                    <p className="text-gray-500 text-lg font-medium mb-2">
                      No {category.replace('_', ' ')} sessions found
                    </p>
                    <p className="text-gray-400 text-sm">
                      {showArchived
                        ? 'No archived sessions found. Sessions older than 6 months can be archived.'
                        : searchTerm || dateRangeFilter !== "all"
                        ? 'Try adjusting your search or filters'
                        : category === 'all'
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
                <>
                  <div className="space-y-4">
                    {paginatedSessions.sessions.map(renderSession)}
                  </div>

                  {/* Pagination */}
                  {paginatedSessions.totalPages > 1 && (
                    <div className="mt-8 flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        Showing {((currentPage - 1) * sessionsPerPage) + 1} to {Math.min(currentPage * sessionsPerPage, paginatedSessions.totalSessions)} of {paginatedSessions.totalSessions} sessions
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                        >
                          Previous
                        </Button>
                        <div className="flex space-x-1">
                          {Array.from({ length: Math.min(5, paginatedSessions.totalPages) }, (_, i) => {
                            const page = i + 1
                            return (
                              <Button
                                key={page}
                                variant={currentPage === page ? "default" : "outline"}
                                size="sm"
                                onClick={() => setCurrentPage(page)}
                                className="w-8 h-8 p-0"
                              >
                                {page}
                              </Button>
                            )
                          })}
                          {paginatedSessions.totalPages > 5 && (
                            <>
                              <span className="px-2">...</span>
                              <Button
                                variant={currentPage === paginatedSessions.totalPages ? "default" : "outline"}
                                size="sm"
                                onClick={() => setCurrentPage(paginatedSessions.totalPages)}
                                className="w-8 h-8 p-0"
                              >
                                {paginatedSessions.totalPages}
                              </Button>
                            </>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(Math.min(paginatedSessions.totalPages, currentPage + 1))}
                          disabled={currentPage === paginatedSessions.totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
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

      {/* Refund Request Modal */}
      {refundModalOpen && refundSessionId && (
        <RefundRequestModal
          sessionId={refundSessionId}
          isOpen={refundModalOpen}
          onClose={() => {
            setRefundModalOpen(false)
            setRefundSessionId(null)
          }}
          onSuccess={() => {
            // Refresh the page to show updated session data
            window.location.reload()
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