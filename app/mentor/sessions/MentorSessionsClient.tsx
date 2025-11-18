"use client"

import { useState, useMemo } from "react"
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
  Check,
  X,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Timer,
  CreditCard,
  MessageCircle,
  DollarSign,
  Search,
  MoreVertical,
  Eye,
  EyeOff,
  Archive,
  ArchiveRestore
} from "lucide-react"
import { CreditsIcon } from "@/components/ui/credits-icon"
import { format, isPast, isFuture, isToday } from "date-fns"
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

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("")
  const [dateRangeFilter, setDateRangeFilter] = useState("all")
  const [compactView, setCompactView] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [showArchived, setShowArchived] = useState(false)
  const sessionsPerPage = 6

  // Archive functionality - sessions older than 6 months are eligible for archiving
  const [archivedSessions, setArchivedSessions] = useState<Set<number>>(new Set())

  const isSessionArchivable = (session: Session) => {
    const sessionDate = new Date(session.startTime || session.scheduledDate)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    // Allow archiving for all non-active sessions older than 6 months
    const archivableStatuses = [
      'completed',
      'cancelled',
      'rejected',
      'mentor_no_response',
      'both_no_show',
      'learner_no_show',
      'mentor_no_show',
      'technical_issues'
    ]
    return sessionDate < sixMonthsAgo && archivableStatuses.includes(session.status)
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
        `${session.learnerFirstName} ${session.learnerLastName}`.toLowerCase().includes(term) ||
        session.skillName?.toLowerCase().includes(term) ||
        session.sessionNotes?.toLowerCase().includes(term) ||
        session.learnerExperienceLevel?.toLowerCase().includes(term)
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

    // Sort by status priority first, then by date
    filtered.sort((a, b) => {
      // Define status priority (lower number = higher priority)
      const statusPriority: Record<string, number> = {
        'upcoming': 1,
        'pending': 2,
        'ongoing': 3,
        'confirmed': 4,
        'completed': 5,
        'cancelled': 6,
        'rejected': 7,
        'mentor_no_response': 7,
        'both_no_show': 8,
        'learner_no_show': 8,
        'mentor_no_show': 8,
        'technical_issues': 9,
      }

      const aPriority = statusPriority[a.status] || 10
      const bPriority = statusPriority[b.status] || 10

      // First sort by priority
      if (aPriority !== bPriority) {
        return aPriority - bPriority
      }

      // Then sort by date (for same priority, upcoming sessions show earliest first, others show newest first)
      const aDate = new Date(a.startTime || a.scheduledDate)
      const bDate = new Date(b.startTime || b.scheduledDate)

      if (aPriority <= 3) {
        // For upcoming/pending/ongoing, show earliest first
        return aDate.getTime() - bDate.getTime()
      } else {
        // For completed/cancelled, show newest first
        return bDate.getTime() - aDate.getTime()
      }
    })

    return filtered
  }, [sessions, searchTerm, dateRangeFilter, showArchived, archivedSessions])

  // Categorize filtered sessions
  const categorizedSessions = useMemo(() => {
    return {
      all: filteredSessions,
      pending: filteredSessions.filter(session => session.status === 'pending'),
      upcoming: filteredSessions.filter(session =>
        ['confirmed', 'upcoming'].includes(session.status)
      ),
      ongoing: filteredSessions.filter(session => session.status === 'ongoing'),
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

  // Calculate earnings for individual session
  const calculateEarnings = (session: Session) => {
    if (session.status === 'completed') {
      return Math.floor(session.totalCostCredits * 0.8) // 80% after platform fee
    } else if (session.status === 'learner_no_show') {
      return session.totalCostCredits // 100% compensation
    }
    return 0
  }

  // Calculate total earnings
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
        body: JSON.stringify({ 
          message: isAccepting ? "" : responseMessage 
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to ${isAccepting ? 'accept' : 'reject'} session`)
      }

      toast.success(`Session ${isAccepting ? 'accepted' : 'rejected'} successfully!`, {
        description: isAccepting
          ? "The learner has been notified and the session is now scheduled."
          : "The learner has been notified about the rejection.",
        duration: 4000,
      })
      setResponseModalOpen(false)
      // Refresh page to show updated status
      window.location.reload()
    } catch (error) {
      console.error('Error responding to session:', error)
      toast.error(`Failed to ${isAccepting ? 'accept' : 'reject'} session`, {
        description: "Please try again. If the problem persists, contact support.",
        duration: 5000,
      })
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

  const renderSession = (session: Session) => {
    if (compactView) {
      return (
        <div key={session.id} className="p-4 border border-gray-200 rounded-lg bg-white hover:shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="w-8 h-8">
                <AvatarImage src={session.learnerProfilePictureUrl || undefined} />
                <AvatarFallback className="text-xs">
                  {session.learnerFirstName?.[0]}{session.learnerLastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium text-sm">
                  {session.learnerFirstName} {session.learnerLastName}
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
                  <span>+{calculateEarnings(session)} credits</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {getStatusBadge(session.status)}
              {session.status === 'pending' && (
                <div className="flex gap-1">
                  <Button size="sm" onClick={() => handleSessionResponse(session, true)} className="bg-green-600 hover:bg-green-700">
                    <Check className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleSessionResponse(session, false)}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )}
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
              <div className="flex items-center justify-end space-x-1 text-green-600">
                <CreditsIcon className="w-4 h-4" />
                <span className="text-sm font-medium">
                  +{calculateEarnings(session)} credits
                </span>
              </div>
            )}
            {session.refundAmount !== 0 && session.refundAmount != null && (
              <div className="flex items-center justify-end space-x-1 text-orange-600">
                <CreditsIcon className="w-4 h-4" />
                <span className="text-sm font-medium">
                  -{session.refundAmount} refunded
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
            <span>Value: {session.totalCostCredits} credits</span>
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
            <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md break-words whitespace-pre-wrap">
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
            <p className="text-sm text-blue-600 bg-blue-50 p-3 rounded-md break-words whitespace-pre-wrap">
              {session.mentorResponseMessage}
            </p>
          </div>
        )}

        {/* No-Show Status Indicators */}
        {session.status === 'learner_no_show' && (
          <div className="bg-green-50 border border-green-200 rounded-md p-3">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-sm font-semibold text-green-800">Learner No-Show - Full Compensation</span>
            </div>
            <p className="text-sm text-green-700">
              The learner didn't attend. You received full compensation of {session.totalCostCredits} credits.
            </p>
          </div>
        )}

        {session.status === 'mentor_no_show' && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm font-semibold text-red-800">You Missed This Session</span>
            </div>
            <p className="text-sm text-red-700">
              You didn't join this session. The learner received a full refund.
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
              This session experienced technical difficulties. Your earnings were processed normally.
            </p>
          </div>
        )}

        {/* Rejection/Cancellation Reason */}
        {(session.rejectionReason || session.cancellationReason) && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm font-semibold text-red-800">
                {session.rejectionReason ? "You Declined This Request" : "Session Cancelled"}
              </span>
            </div>
            <p className="text-sm text-red-700 break-words whitespace-pre-wrap">
              <strong>Reason: </strong>
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
              placeholder="Search by learner name, skill, or notes..."
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

      {/* Earnings Summary */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditsIcon className="w-5 h-5" />
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
              <div className="text-2xl font-bold text-purple-600">
                {earnings.sessionCount}
              </div>
              <div className="text-sm text-gray-600">Total Paid Sessions</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={selectedTab} onValueChange={(value) => { setSelectedTab(value); resetPagination() }}>
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

      {/* Response Modal */}
      <Dialog open={responseModalOpen} onOpenChange={setResponseModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader className="space-y-3">
            <DialogTitle className={`text-xl font-semibold ${isAccepting ? 'text-green-700' : 'text-red-700'}`}>
              {isAccepting ? '✓ Accept Session Request' : '✗ Decline Session Request'}
            </DialogTitle>
          </DialogHeader>
          
          {selectedSession && (
            <div className="space-y-6">
              <div className="bg-gray-50 border rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedSession.learnerProfilePictureUrl || undefined} />
                    <AvatarFallback>
                      {selectedSession.learnerFirstName?.[0]}{selectedSession.learnerLastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {selectedSession.learnerFirstName} {selectedSession.learnerLastName}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {selectedSession.learnerExperienceLevel} • {selectedSession.skillName}
                    </p>
                  </div>
                </div>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Date:</span> {format(new Date(selectedSession.scheduledDate), "MMM dd, yyyy")}
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Time:</span> {selectedSession.startTime && selectedSession.endTime 
                      ? `${format(new Date(selectedSession.startTime), "h:mm a")} - ${format(new Date(selectedSession.endTime), "h:mm a")}`
                      : `${format(new Date(selectedSession.scheduledDate), "h:mm a")} (${selectedSession.durationMinutes}min)`}
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Credits:</span> {selectedSession.totalCostCredits} credits
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Your earnings:</span> +{Math.floor(selectedSession.totalCostCredits * 0.8)} credits
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">What you'll teach:</span> {selectedSession.skillName}
                  </div>
                </div>
                {selectedSession.sessionNotes && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs font-medium text-gray-700 mb-1">Learner's Notes:</p>
                    <p className="text-sm text-gray-600 italic break-words whitespace-pre-wrap">"{selectedSession.sessionNotes}"</p>
                  </div>
                )}
              </div>

              {!isAccepting && (
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Reason for declining (optional)
                  </label>
                  <Textarea
                    value={responseMessage}
                    onChange={(e) => setResponseMessage(e.target.value)}
                    placeholder="Please explain why you're declining this session request."
                    rows={3}
                    className="break-words"
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-3 pt-6 border-t">
            <Button 
              variant="outline" 
              onClick={() => setResponseModalOpen(false)}
              className="px-6"
            >
              Cancel
            </Button>
            <Button 
              onClick={submitResponse}
              className={
                isAccepting 
                  ? "bg-green-600 hover:bg-green-700 text-white px-6" 
                  : "bg-red-600 hover:bg-red-700 text-white px-6"
              }
            >
              {isAccepting ? '✓ Accept Session' : '✗ Decline Session'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancellation Modal */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-xl font-semibold text-red-700">
              ⚠️ Cancel Session
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-yellow-800 mb-1">Important Notice</h4>
                  <p className="text-sm text-yellow-700">
                    Cancelling this session will notify the learner and may affect your mentor rating. 
                    Please provide a clear reason to help maintain trust and improve our service.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-3 block text-gray-900">
                Cancellation Reason <span className="text-red-500">*</span>
              </label>
              <Textarea
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="Please explain why you need to cancel this session. This message will be shared with the learner."
                rows={4}
                required
                className="resize-none break-words"
              />
              <p className="text-xs text-gray-500 mt-2">
                {cancellationReason.length}/500 characters
              </p>
            </div>
          </div>

          <DialogFooter className="gap-3 pt-6 border-t">
            <Button 
              variant="outline" 
              onClick={() => setCancelModalOpen(false)}
              className="px-6"
            >
              Keep Session
            </Button>
            <Button 
              onClick={submitCancellation}
              className="bg-red-600 hover:bg-red-700 text-white px-6"
              disabled={!cancellationReason.trim()}
            >
              ⚠️ Cancel Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}