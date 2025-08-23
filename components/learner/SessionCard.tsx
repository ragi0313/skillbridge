"use client"

import { useState } from "react"
import { formatDistanceToNow, format, isBefore, isAfter } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Clock, Calendar, CreditCard, MessageCircle, Video, AlertTriangle, CheckCircle, XCircle, Flag, WrenchIcon, RefreshCw, EyeOff, Eye, FileText, Download } from "lucide-react"
import { SessionCountdown } from "@/components/session/SessionCountdown"
import { toast } from "sonner"

interface SessionProps {
  session: {
    id: number
    status: string | null
    scheduledDate: Date
    durationMinutes: number
    totalCostCredits: number
    sessionNotes: string
    refundAmount?: number | null
    cancelledBy?: string | null
    cancellationReason?: string | null
    mentorResponseAt?: Date | null
    mentorResponseMessage?: string | null
    rejectionReason?: string | null
    createdAt: Date | null
    mentorJoinedAt?: Date | null
    mentorLeftAt?: Date | null
    learnerJoinedAt?: Date | null
    learnerLeftAt?: Date | null
    mentor: {
      id: number
      profilePictureUrl?: string | null
      professionalTitle: string
    } | null
    mentorUser: {
      firstName: string
      lastName: string
    } | null
    skill: {
      skillName: string
      ratePerHour: number
    } | null
  }
  getStatusColor: (status: string | null) => string
  formatStatus: (status: string | null) => string
  userType: "learner"
}

export function SessionCard({ session, getStatusColor, formatStatus, userType }: SessionProps) {
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [reportDialogOpen, setReportDialogOpen] = useState(false)
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [reporting, setReporting] = useState(false)
  const [submittingReview, setSubmittingReview] = useState(false)
  const [technicalIssuesDialogOpen, setTechnicalIssuesDialogOpen] = useState(false)
  const [chatDialogOpen, setChatDialogOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [loadingChat, setLoadingChat] = useState(false)
  const [isHidden, setIsHidden] = useState(false)
  const [toggling, setToggling] = useState(false)

  const now = new Date()
  const sessionStart = new Date(session.scheduledDate)
  const sessionEnd = new Date(sessionStart.getTime() + session.durationMinutes * 60 * 1000)
  const joinWindowStart = new Date(sessionStart.getTime() - 30 * 60 * 1000)
  const canJoin = ["confirmed", "upcoming", "ongoing"].includes(session.status || "")
  const canJoinNow = now >= joinWindowStart && now <= sessionEnd && canJoin
  const isOngoing = session.status === "ongoing"
  const hasJoinedBefore = !!session.learnerJoinedAt
  const needsReconnection = hasJoinedBefore && (isOngoing || session.status === "confirmed" || session.status === "upcoming")
  
  // 24-hour cancellation restriction
  const hoursUntilSession = (sessionStart.getTime() - now.getTime()) / (1000 * 60 * 60)
  const canCancelWithoutRestriction = hoursUntilSession >= 24
  const isWithin24Hours = hoursUntilSession < 24 && hoursUntilSession > 0

  const handleCancel = async () => {
    setCancelling(true)
    try {
      const response = await fetch(`/api/bookings/cancel/${session.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Cancelled by learner" })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to cancel session")
      }

      const result = await response.json()
      toast.success(`Session cancelled successfully. ${result.refundAmount ? `${result.refundAmount} credits refunded.` : ""}`)
      window.location.reload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to cancel session")
    } finally {
      setCancelling(false)
      setCancelDialogOpen(false)
    }
  }

  const handleReport = async (reportData: { reportType: string; reason: string; description?: string }) => {
    setReporting(true)
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          reportType: reportData.reportType,
          reason: reportData.reason,
          description: reportData.description
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to submit report")
      }

      toast.success("Report submitted successfully. Our team will review it shortly.")
      setReportDialogOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit report")
    } finally {
      setReporting(false)
    }
  }

  const handleSubmitReview = async (reviewData: { rating: number; reviewText: string }) => {
    setSubmittingReview(true)
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          rating: reviewData.rating,
          reviewText: reviewData.reviewText
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to submit review")
      }

      toast.success("Review submitted successfully!")
      setReviewDialogOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit review")
    } finally {
      setSubmittingReview(false)
    }
  }

  const handleTechnicalIssues = async (action: 'resolve' | 'end_session', reason?: string) => {
    setReporting(true)
    try {
      const endpoint = action === 'resolve' ? `/api/sessions/${session.id}/resolve-technical-issues` : `/api/sessions/${session.id}/complete`
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endType: action === 'end_session' ? 'technical_issues' : undefined,
          reason
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to handle technical issues")
      }

      toast.success(action === 'resolve' ? "Technical issues resolved successfully!" : "Session ended due to technical issues. You will receive a full refund.")
      window.location.reload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to handle technical issues")
    } finally {
      setReporting(false)
      setTechnicalIssuesDialogOpen(false)
    }
  }

  const handleViewChatHistory = async () => {
    if (chatMessages.length === 0) {
      setLoadingChat(true)
      try {
        const response = await fetch(`/api/sessions/${session.id}/chat`)
        if (response.ok) {
          const data = await response.json()
          setChatMessages(data.messages || [])
        } else {
          toast.error("Failed to load chat history")
        }
      } catch (error) {
        toast.error("Failed to load chat history")
      } finally {
        setLoadingChat(false)
      }
    }
    setChatDialogOpen(true)
  }

  const handleToggleVisibility = async () => {
    setToggling(true)
    try {
      const response = await fetch(`/api/sessions/${session.id}/visibility`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isHidden: !isHidden })
      })

      if (response.ok) {
        setIsHidden(!isHidden)
        toast.success(isHidden ? "Session shown" : "Session hidden")
      } else {
        toast.error("Failed to update session visibility")
      }
    } catch (error) {
      toast.error("Failed to update session visibility")
    } finally {
      setToggling(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  return (
    <Card className="relative">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={session.mentor?.profilePictureUrl || undefined} />
              <AvatarFallback>
                {session.mentorUser?.firstName?.[0]}{session.mentorUser?.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">
                {session.skill?.skillName || "Session"} with {session.mentorUser?.firstName} {session.mentorUser?.lastName}
              </CardTitle>
              <CardDescription>
                {session.mentor?.professionalTitle} • {session.durationMinutes} minutes
              </CardDescription>
            </div>
          </div>
          <Badge className={getStatusColor(session.status)}>
            {formatStatus(session.status)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center text-gray-600">
            <Calendar className="h-4 w-4 mr-2" />
            {format(sessionStart, "MMM d, yyyy")}
          </div>
          <div className="flex items-center text-gray-600">
            <Clock className="h-4 w-4 mr-2" />
            {format(sessionStart, "h:mm a")} - {format(sessionEnd, "h:mm a")}
          </div>
          <div className="flex items-center text-gray-600">
            <CreditCard className="h-4 w-4 mr-2" />
            {session.totalCostCredits} credits
          </div>
          <div className="flex items-center text-gray-600">
            <MessageCircle className="h-4 w-4 mr-2" />
            Requested {session.createdAt ? formatDistanceToNow(session.createdAt) : 'recently'} ago
          </div>
        </div>

        {/* Real-time countdown for upcoming sessions */}
        {["confirmed", "upcoming", "ongoing"].includes(session.status || "") && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <SessionCountdown
              sessionDate={session.scheduledDate}
              status={session.status || ""}
              showJoinButton={canJoinNow}
              className="justify-center"
            />
          </div>
        )}

        {session.sessionNotes && (
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-700">
              <strong>Your notes:</strong> {session.sessionNotes}
            </p>
          </div>
        )}

        {session.mentorResponseMessage && (
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-sm text-blue-700">
              <strong>Mentor response:</strong> {session.mentorResponseMessage}
            </p>
          </div>
        )}

        {session.status === "rejected" && session.rejectionReason && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700">
              <strong>Rejection reason:</strong> {session.rejectionReason}
            </p>
            {session.refundAmount && (
              <p className="text-sm text-red-700 mt-1">
                <strong>Refunded:</strong> {session.refundAmount} credits
              </p>
            )}
          </div>
        )}

        {session.status === "cancelled" && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            {session.cancellationReason && (
              <p className="text-sm text-yellow-700">
                <strong>Cancellation reason:</strong> {session.cancellationReason}
              </p>
            )}
            {session.cancelledBy && (
              <p className="text-sm text-yellow-700 mt-1">
                <strong>Cancelled by:</strong> {session.cancelledBy === "learner" ? "You" : session.cancelledBy === "mentor" ? "Mentor" : session.cancelledBy}
              </p>
            )}
            {session.refundAmount && (
              <p className="text-sm text-yellow-700 mt-1">
                <strong>Refunded:</strong> {session.refundAmount} credits
              </p>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex space-x-2">
            {canJoinNow && (
              <Button asChild size="sm">
                <a href={`/sessions/${session.id}`}>
                  <Video className="h-4 w-4 mr-2" />
                  {needsReconnection ? "Reconnect" : "Join Session"}
                </a>
              </Button>
            )}

            {session.status === "pending" && (
              <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel Request
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel Session Request?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will cancel your session request. You will receive a full refund of {session.totalCostCredits} credits.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep Request</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCancel} disabled={cancelling}>
                      {cancelling ? "Cancelling..." : "Cancel Request"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {(session.status === "confirmed" || session.status === "upcoming") && isBefore(now, sessionStart) && (
              <>
                {isWithin24Hours && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-2">
                    <div className="flex items-center text-red-700">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      <span className="text-sm">
                        Cannot cancel sessions within 24 hours of start time per platform policy.
                      </span>
                    </div>
                  </div>
                )}
                <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" disabled={isWithin24Hours}>
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancel Session
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel Session?</AlertDialogTitle>
                      <AlertDialogDescription>
                        {canCancelWithoutRestriction 
                          ? "You can cancel this session with a full refund since it's more than 24 hours away."
                          : "Cancellation policy applies based on timing. Sessions within 24 hours cannot be cancelled."
                        }
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep Session</AlertDialogCancel>
                      <AlertDialogAction onClick={handleCancel} disabled={cancelling}>
                        {cancelling ? "Cancelling..." : "Cancel Session"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}

            {/* Technical Issues Actions */}
            {session.status === "ongoing" && (
              <TechnicalIssuesDialog
                session={session}
                onSubmit={handleTechnicalIssues}
                isSubmitting={reporting}
                open={technicalIssuesDialogOpen}
                onOpenChange={setTechnicalIssuesDialogOpen}
                userType="learner"
              />
            )}

            {session.status === "completed" && (
              <ReviewDialog 
                session={session}
                onSubmit={handleSubmitReview}
                isSubmitting={submittingReview}
                open={reviewDialogOpen}
                onOpenChange={setReviewDialogOpen}
              />
            )}
          </div>

          <div className="flex space-x-2">
            {/* Chat History Button */}
            {(session.status === "completed" || session.status === "ongoing" || 
              session.status === "cancelled" || session.status === "technical_issues") && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleViewChatHistory}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Chat History
              </Button>
            )}

            {/* Hide/Show Session Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleVisibility}
              disabled={toggling}
            >
              {isHidden ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
              {toggling ? "..." : (isHidden ? "Show" : "Hide")}
            </Button>

            {(session.status === "completed" || session.status === "cancelled" || 
              session.status === "both_no_show" || session.status === "learner_no_show" || 
              session.status === "mentor_no_show" || session.status === "technical_issues") && (
              <ReportDialog 
                session={session}
                onSubmit={handleReport}
                isSubmitting={reporting}
                open={reportDialogOpen}
                onOpenChange={setReportDialogOpen}
              />
            )}
          </div>
        </div>
      </CardContent>

      {/* Chat History Dialog */}
      <Dialog open={chatDialogOpen} onOpenChange={setChatDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Session Chat History</DialogTitle>
            <DialogDescription>
              Messages and files shared during this session
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto space-y-3 pr-2">
            {loadingChat ? (
              <div className="text-center py-4">Loading chat history...</div>
            ) : chatMessages.length === 0 ? (
              <div className="text-center py-4 text-gray-500">No messages in this session</div>
            ) : (
              chatMessages.slice().reverse().map((message) => (
                <div key={message.id} className="border rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-medium text-sm">
                      {message.user?.firstName} {message.user?.lastName}
                      <Badge variant="outline" className="ml-2 text-xs">
                        {message.user?.role}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-500">
                      {format(new Date(message.createdAt), "MMM d, h:mm a")}
                    </div>
                  </div>
                  
                  {message.messageType === 'file' && message.attachments?.[0] ? (
                    <div className="bg-gray-50 rounded p-2 space-y-2">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-gray-600" />
                        <span className="text-sm font-medium">{message.attachments[0].fileName}</span>
                        <Badge variant="secondary" className="text-xs">
                          {formatFileSize(message.attachments[0].fileSize)}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => window.open(message.attachments![0].fileUrl, '_blank')}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </Button>
                    </div>
                  ) : (
                    <div className="text-sm whitespace-pre-wrap break-words">
                      {message.message}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

interface TechnicalIssuesDialogProps {
  session: any
  onSubmit: (action: 'resolve' | 'end_session', reason?: string) => void
  isSubmitting: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  userType: 'mentor' | 'learner'
}

function TechnicalIssuesDialog({ session, onSubmit, isSubmitting, open, onOpenChange, userType }: TechnicalIssuesDialogProps) {
  const [action, setAction] = useState<'resolve' | 'end_session'>('resolve')
  const [reason, setReason] = useState('')

  const handleSubmit = () => {
    if (action === 'end_session' && !reason.trim()) {
      toast.error('Please provide a reason for ending the session')
      return
    }
    onSubmit(action, reason.trim() || undefined)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-orange-600 border-orange-600 hover:bg-orange-50">
          <WrenchIcon className="h-4 w-4 mr-2" />
          Tech Issues
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Technical Issues</DialogTitle>
          <DialogDescription>
            Are you experiencing technical difficulties? You can try to resolve them or end the session with a full refund.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex space-x-4">
              <button
                onClick={() => setAction('resolve')}
                className={`flex-1 p-3 border rounded-lg text-left ${
                  action === 'resolve' ? 'border-green-500 bg-green-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center">
                  <RefreshCw className="h-5 w-5 text-green-500 mr-3" />
                  <div>
                    <div className="font-medium">Try to Resolve</div>
                    <div className="text-sm text-gray-600">Continue with the session</div>
                  </div>
                </div>
              </button>
              <button
                onClick={() => setAction('end_session')}
                className={`flex-1 p-3 border rounded-lg text-left ${
                  action === 'end_session' ? 'border-red-500 bg-red-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center">
                  <XCircle className="h-5 w-5 text-red-500 mr-3" />
                  <div>
                    <div className="font-medium">End Session</div>
                    <div className="text-sm text-gray-600">Get full refund</div>
                  </div>
                </div>
              </button>
            </div>

            {action === 'end_session' && (
              <div>
                <label className="block text-sm font-medium mb-2">Reason for ending session *</label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Please describe the technical issues encountered..."
                  rows={3}
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Processing...' : (action === 'resolve' ? 'Mark as Resolved' : 'End Session')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface ReviewDialogProps {
  session: any
  onSubmit: (data: { rating: number; reviewText: string }) => void
  isSubmitting: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}

function ReviewDialog({ session, onSubmit, isSubmitting, open, onOpenChange }: ReviewDialogProps) {
  const [rating, setRating] = useState(5)
  const [reviewText, setReviewText] = useState("")

  const handleSubmit = () => {
    if (!reviewText.trim()) {
      toast.error("Please write a review")
      return
    }
    onSubmit({ rating, reviewText })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <CheckCircle className="h-4 w-4 mr-2" />
          Leave Review
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rate Your Session</DialogTitle>
          <DialogDescription>
            How was your session with {session.mentorUser?.firstName}?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Rating</label>
            <div className="flex space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className={`text-2xl ${star <= rating ? "text-yellow-400" : "text-gray-300"} hover:text-yellow-400`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Review</label>
            <Textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Share your experience with this mentor..."
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit Review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface ReportDialogProps {
  session: any
  onSubmit: (data: { reportType: string; reason: string; description?: string }) => void
  isSubmitting: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}

function ReportDialog({ session, onSubmit, isSubmitting, open, onOpenChange }: ReportDialogProps) {
  const [reportType, setReportType] = useState("abuse")
  const [reason, setReason] = useState("")
  const [description, setDescription] = useState("")

  const reportTypes = [
    { value: "abuse", label: "Abuse or harassment" },
    { value: "technical_misconduct", label: "Technical misconduct" },
    { value: "no_show", label: "No show" },
    { value: "other", label: "Other" }
  ]

  const handleSubmit = () => {
    if (!reason.trim()) {
      toast.error("Please provide a reason for the report")
      return
    }
    onSubmit({ reportType, reason, description })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Flag className="h-4 w-4 mr-2" />
          Report Issue
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report Issue</DialogTitle>
          <DialogDescription>
            Report any issues with this session or the mentor's conduct.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Report Type</label>
            <select 
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              {reportTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Reason *</label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Brief reason for the report..."
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Additional Details (Optional)</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide additional context or details..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}