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
import { Clock, Calendar, CreditCard, MessageCircle, Video, AlertTriangle, CheckCircle, XCircle, Flag, User, WrenchIcon, RefreshCw } from "lucide-react"
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
    archived?: boolean | null
    refundAmount?: number | null
    cancelledBy?: string | null
    cancellationReason?: string | null
    mentorResponseAt?: Date | null
    mentorResponseMessage?: string | null
    rejectionReason?: string | null
    expiresAt: Date | null
    createdAt: Date | null
    learner: {
      id: number
      profilePictureUrl?: string | null
      experienceLevel: string
    } | null
    learnerUser: {
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
  userType: "mentor"
}

export function SessionCard({ session, getStatusColor, formatStatus, userType }: SessionProps) {
  const [responseDialogOpen, setResponseDialogOpen] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [reportDialogOpen, setReportDialogOpen] = useState(false)
  const [responding, setResponding] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [reporting, setReporting] = useState(false)
  const [technicalIssuesDialogOpen, setTechnicalIssuesDialogOpen] = useState(false)

  const now = new Date()
  const sessionStart = new Date(session.scheduledDate)
  const sessionEnd = new Date(sessionStart.getTime() + session.durationMinutes * 60 * 1000)
  const joinWindowStart = new Date(sessionStart.getTime() - 30 * 60 * 1000)
  const canJoin = ["confirmed", "upcoming", "ongoing"].includes(session.status || "")
  const canJoinNow = now >= joinWindowStart && now <= sessionEnd && canJoin
  const isOngoing = session.status === "ongoing"
  const isExpired = session.expiresAt ? new Date(session.expiresAt) < now : false

  const handleAccept = async (message?: string) => {
    setResponding(true)
    try {
      const response = await fetch(`/api/bookings/accept/${session.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to accept session")
      }

      toast.success("Session accepted successfully!")
      window.location.reload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to accept session")
    } finally {
      setResponding(false)
      setResponseDialogOpen(false)
    }
  }

  const handleReject = async (reason: string) => {
    setResponding(true)
    try {
      const response = await fetch(`/api/bookings/reject/${session.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to reject session")
      }

      toast.success("Session rejected. The learner has been refunded.")
      window.location.reload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reject session")
    } finally {
      setResponding(false)
      setResponseDialogOpen(false)
    }
  }

  const handleCancel = async () => {
    setCancelling(true)
    try {
      const response = await fetch(`/api/bookings/cancel/${session.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to cancel session")
      }

      toast.success("Session cancelled successfully.")
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

      toast.success(action === 'resolve' ? "Technical issues resolved successfully!" : "Session ended due to technical issues. Learner will be refunded.")
      window.location.reload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to handle technical issues")
    } finally {
      setReporting(false)
      setTechnicalIssuesDialogOpen(false)
    }
  }

  return (
    <Card className="relative">
      {session.status === "pending" && isExpired && (
        <div className="absolute top-2 right-2 bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
          Expired
        </div>
      )}
      
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={session.learner?.profilePictureUrl || undefined} />
              <AvatarFallback>
                {session.learnerUser?.firstName?.[0]}{session.learnerUser?.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">
                {session.skill?.skillName || "Session"} with {session.learnerUser?.firstName} {session.learnerUser?.lastName}
              </CardTitle>
              <CardDescription>
                {session.learner?.experienceLevel} level • {session.durationMinutes} minutes
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
            {session.totalCostCredits} credits ({Math.floor(session.totalCostCredits * 0.8)} for you)
          </div>
          <div className="flex items-center text-gray-600">
            <MessageCircle className="h-4 w-4 mr-2" />
            Requested {session.createdAt ? formatDistanceToNow(session.createdAt) : 'recently'} ago
          </div>
        </div>

        {/* Real-time countdown for upcoming sessions */}
        {["confirmed", "upcoming", "ongoing"].includes(session.status || "") && (
          <div className="mt-4 p-3 bg-emerald-50 rounded-lg">
            <SessionCountdown
              sessionDate={session.scheduledDate}
              status={session.status || ""}
              showJoinButton={canJoinNow}
              className="justify-center"
            />
          </div>
        )}

        {session.status === "pending" && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center text-yellow-700">
              <AlertTriangle className="h-4 w-4 mr-2" />
              <span className="text-sm">
                {session.expiresAt ? (
                  <>
                    Expires {formatDistanceToNow(session.expiresAt, { addSuffix: true })}
                    {isExpired && " (Expired)"}
                  </>
                ) : (
                  "Expiration time not set"
                )}
              </span>
            </div>
          </div>
        )}

        {session.sessionNotes && (
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-700">
              <strong>Learner's request:</strong> {session.sessionNotes}
            </p>
          </div>
        )}

        {session.mentorResponseMessage && (
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-sm text-blue-700">
              <strong>Your response:</strong> {session.mentorResponseMessage}
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
                <strong>Learner refunded:</strong> {session.refundAmount} credits
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
                <strong>Cancelled by:</strong> {session.cancelledBy === "learner" ? "Learner" : session.cancelledBy === "mentor" ? "You" : session.cancelledBy}
              </p>
            )}
            {session.refundAmount && (
              <p className="text-sm text-yellow-700 mt-1">
                <strong>Learner refunded:</strong> {session.refundAmount} credits
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
                  {isOngoing ? "Reconnect" : "Join Session"}
                </a>
              </Button>
            )}

            {session.status === "pending" && !isExpired && (
              <MentorResponseDialog
                session={session}
                onAccept={handleAccept}
                onReject={handleReject}
                isResponding={responding}
                open={responseDialogOpen}
                onOpenChange={setResponseDialogOpen}
              />
            )}

            {(session.status === "confirmed" || session.status === "upcoming") && isBefore(now, sessionStart) && (
              <>
                {/* 24-hour cancellation warning */}
                {(() => {
                  const hoursUntilSession = (sessionStart.getTime() - now.getTime()) / (1000 * 60 * 60)
                  const isWithin24Hours = hoursUntilSession < 24 && hoursUntilSession > 0
                  return isWithin24Hours && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-2">
                      <div className="flex items-center text-red-700">
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        <span className="text-sm">
                          Cannot cancel sessions within 24 hours of start time per platform policy.
                        </span>
                      </div>
                    </div>
                  )
                })()}
                <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={(() => {
                        const hoursUntilSession = (sessionStart.getTime() - now.getTime()) / (1000 * 60 * 60)
                        return hoursUntilSession < 24 && hoursUntilSession > 0
                      })()}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancel Session
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel Session?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will cancel the session and fully refund the learner. You may face penalties for short-notice cancellations.
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
          </div>

          <div className="flex space-x-2">
            {/* Technical Issues Actions */}
            {session.status === "ongoing" && (
              <TechnicalIssuesDialog
                session={session}
                onSubmit={handleTechnicalIssues}
                isSubmitting={reporting}
                open={technicalIssuesDialogOpen}
                onOpenChange={setTechnicalIssuesDialogOpen}
                userType="mentor"
              />
            )}
            
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
    </Card>
  )
}

interface MentorResponseDialogProps {
  session: any
  onAccept: (message?: string) => void
  onReject: (reason: string) => void
  isResponding: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}

function MentorResponseDialog({ session, onAccept, onReject, isResponding, open, onOpenChange }: MentorResponseDialogProps) {
  const [action, setAction] = useState<"accept" | "reject">("accept")
  const [message, setMessage] = useState("")
  const [reason, setReason] = useState("")

  const handleSubmit = () => {
    if (action === "accept") {
      onAccept(message.trim() || undefined)
    } else {
      if (!reason.trim()) {
        toast.error("Please provide a reason for rejecting")
        return
      }
      onReject(reason)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <CheckCircle className="h-4 w-4 mr-2" />
          Respond
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Respond to Session Request</DialogTitle>
          <DialogDescription>
            Review the session details and provide your response to {session.learnerUser?.firstName}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium mb-2">Session Details</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Date:</strong> {format(session.scheduledDate, "MMM d, yyyy")}
              </div>
              <div>
                <strong>Time:</strong> {format(session.scheduledDate, "h:mm a")}
              </div>
              <div>
                <strong>Duration:</strong> {session.durationMinutes} minutes
              </div>
              <div>
                <strong>Payment:</strong> {session.totalCostCredits} credits
              </div>
            </div>
            {session.sessionNotes && (
              <div className="mt-3 pt-3 border-t">
                <strong>Learner's request:</strong>
                <p className="text-gray-600 mt-1">{session.sessionNotes}</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Your Response</label>
            <div className="space-y-3">
              <div className="flex space-x-4">
                <button
                  onClick={() => setAction("accept")}
                  className={`flex-1 p-3 border rounded-lg text-left ${
                    action === "accept" ? "border-green-500 bg-green-50" : "border-gray-200"
                  }`}
                >
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    <div>
                      <div className="font-medium">Accept Session</div>
                      <div className="text-sm text-gray-600">Confirm and schedule this session</div>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => setAction("reject")}
                  className={`flex-1 p-3 border rounded-lg text-left ${
                    action === "reject" ? "border-red-500 bg-red-50" : "border-gray-200"
                  }`}
                >
                  <div className="flex items-center">
                    <XCircle className="h-5 w-5 text-red-500 mr-3" />
                    <div>
                      <div className="font-medium">Reject Session</div>
                      <div className="text-sm text-gray-600">Decline and refund learner</div>
                    </div>
                  </div>
                </button>
              </div>

              {action === "accept" ? (
                <div>
                  <label className="block text-sm font-medium mb-2">Welcome Message (Optional)</label>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Send a welcome message to the learner..."
                    rows={3}
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium mb-2">Rejection Reason *</label>
                  <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Please explain why you're rejecting this session..."
                    rows={3}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isResponding}>
            {isResponding ? "Processing..." : (action === "accept" ? "Accept Session" : "Reject Session")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
                    <div className="text-sm text-gray-600">Full refund to learner</div>
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
            Report any issues with this session or the learner's conduct.
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