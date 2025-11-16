"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  Video,
  Search,
  Filter,
  Eye,
  Clock,
  Users,
  Star,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Play,
  Pause,
  StopCircle,
  Download
} from "lucide-react"
import { format } from "date-fns"

interface SessionLog {
  id: number
  mentorName: string
  learnerName: string
  skillName: string
  status: string
  scheduledDate: string
  startTime?: string
  endTime?: string
  durationMinutes: number
  actualDurationMs?: number
  totalCostCredits: number
  mentorRating?: number
  learnerRating?: number
  sessionNotes: string
  agoraChannelName?: string
  learnerJoinedAt?: string
  mentorJoinedAt?: string
  learnerLeftAt?: string
  mentorLeftAt?: string
  learnerConnectionDurationMs?: number
  mentorConnectionDurationMs?: number
  createdAt: string
  refundRequestId?: number
  refundStatus?: string
  refundReason?: string
  refundAmount?: number
  refundRequestedAt?: string
}

export default function SessionLogs() {
  const [sessions, setSessions] = useState<SessionLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateRange, setDateRange] = useState("7")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedSession, setSelectedSession] = useState<SessionLog | null>(null)

  useEffect(() => {
    fetchSessionLogs()
  }, [currentPage, statusFilter, dateRange])

  const fetchSessionLogs = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        status: statusFilter,
        days: dateRange,
        search: searchTerm,
      })

      const response = await fetch(`/api/admin/session-logs?${params}`)
      if (response.ok) {
        const data = await response.json()
        setSessions(data.sessions)
        setTotalPages(data.totalPages)
      }
    } catch (error) {
      console.error("Failed to fetch session logs:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setCurrentPage(1)
    fetchSessionLogs()
  }

  const forceEndSession = async (sessionId: number) => {
    try {
      const response = await fetch(`/api/admin/force-disconnect/${sessionId}`, {
        method: "POST",
      })
      if (response.ok) {
        fetchSessionLogs() // Refresh the list
      }
    } catch (error) {
      console.error("Failed to force end session:", error)
    }
  }

  const exportSessions = async () => {
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        days: dateRange,
        search: searchTerm,
        export: "true",
      })

      const response = await fetch(`/api/admin/session-logs?${params}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `session-logs-${format(new Date(), "yyyy-MM-dd")}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error("Failed to export sessions:", error)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: "bg-yellow-100 text-yellow-800",
      confirmed: "bg-blue-100 text-blue-800",
      ongoing: "bg-green-100 text-green-800",
      completed: "bg-gray-100 text-gray-800",
      cancelled: "bg-red-100 text-red-800",
      both_no_show: "bg-red-100 text-red-800",
      learner_no_show: "bg-orange-100 text-orange-800",
      mentor_no_show: "bg-orange-100 text-orange-800",
      rejected: "bg-red-100 text-red-800",
    }

    const icons = {
      pending: <Clock className="w-3 h-3" />,
      confirmed: <CheckCircle className="w-3 h-3" />,
      ongoing: <Play className="w-3 h-3" />,
      completed: <CheckCircle className="w-3 h-3" />,
      cancelled: <XCircle className="w-3 h-3" />,
      both_no_show: <XCircle className="w-3 h-3" />,
      learner_no_show: <AlertTriangle className="w-3 h-3" />,
      mentor_no_show: <AlertTriangle className="w-3 h-3" />,
      rejected: <XCircle className="w-3 h-3" />,
    }

    return (
      <Badge className={`flex items-center space-x-1 ${variants[status as keyof typeof variants] || variants.pending}`}>
        {icons[status as keyof typeof icons]}
        <span>{status.replace(/_/g, " ").toUpperCase()}</span>
      </Badge>
    )
  }

  const formatDuration = (durationMs?: number, fallbackMinutes?: number) => {
    if (durationMs) {
      const minutes = Math.floor(durationMs / (1000 * 60))
      const hours = Math.floor(minutes / 60)
      if (hours > 0) {
        return `${hours}h ${minutes % 60}m`
      }
      return `${minutes}m`
    }
    if (fallbackMinutes) {
      const hours = Math.floor(fallbackMinutes / 60)
      if (hours > 0) {
        return `${hours}h ${fallbackMinutes % 60}m`
      }
      return `${fallbackMinutes}m`
    }
    return "N/A"
  }

  const getRatingStars = (rating?: number) => {
    if (!rating) return "No rating"
    return (
      <div className="flex items-center">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${
              i < rating ? "text-yellow-400 fill-current" : "text-gray-300"
            }`}
          />
        ))}
        <span className="ml-1 text-sm">({rating})</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Video className="w-6 h-6 text-gray-600" />
          <h1 className="text-2xl font-bold text-gray-900">Session Logs</h1>
        </div>
        <Button onClick={exportSessions} variant="outline" className="flex items-center space-x-2">
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div className="flex items-center gap-2 text-gray-700 font-medium min-w-fit">
          <Filter className="w-4 h-4" />
          <span className="text-sm">Filters:</span>
        </div>

        <div className="flex flex-wrap items-center gap-3 flex-1 w-full md:w-auto">
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search mentor, learner, or skill..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              className="pl-10 h-10"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] h-10">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="ongoing">Ongoing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="both_no_show">No Shows</SelectItem>
            </SelectContent>
          </Select>

          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[160px] h-10">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last 24 hours</SelectItem>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={handleSearch} className="flex items-center gap-2 h-10 px-4">
            <Search className="w-4 h-4" />
            <span>Search</span>
          </Button>
        </div>
      </div>

      {/* Sessions List */}
      <Card>
        <CardHeader>
          <CardTitle>Session History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse p-4 border rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-48"></div>
                      <div className="h-3 bg-gray-200 rounded w-32"></div>
                    </div>
                    <div className="h-6 bg-gray-200 rounded w-20"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8">
              <Video className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No sessions found matching your criteria.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {session.mentorName} → {session.learnerName}
                      </h3>
                      <p className="text-sm text-gray-600">{session.skillName}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(session.status)}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedSession(session)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Session Details - #{session.id}</DialogTitle>
                          </DialogHeader>
                          {selectedSession && (
                            <div className="space-y-6">
                              <div className="grid grid-cols-2 gap-6">
                                <div>
                                  <h4 className="font-semibold mb-2">Participants</h4>
                                  <p><strong>Mentor:</strong> {selectedSession.mentorName}</p>
                                  <p><strong>Learner:</strong> {selectedSession.learnerName}</p>
                                  <p><strong>Skill:</strong> {selectedSession.skillName}</p>
                                </div>
                                <div>
                                  <h4 className="font-semibold mb-2">Session Info</h4>
                                  <p><strong>Status:</strong> {getStatusBadge(selectedSession.status)}</p>
                                  <p><strong>Scheduled:</strong> {format(new Date(selectedSession.scheduledDate), "MMM dd, yyyy HH:mm")}</p>
                                  <p><strong>Duration:</strong> {formatDuration(selectedSession.actualDurationMs, selectedSession.durationMinutes)}</p>
                                  <p><strong>Cost:</strong> {selectedSession.totalCostCredits} credits</p>
                                </div>
                              </div>

                              {(selectedSession.learnerJoinedAt || selectedSession.mentorJoinedAt) && (
                                <div>
                                  <h4 className="font-semibold mb-2">Connection Timeline</h4>
                                  <div className="space-y-2 text-sm">
                                    {selectedSession.mentorJoinedAt && (
                                      <div>
                                        <p>✅ Mentor joined: {format(new Date(selectedSession.mentorJoinedAt), "HH:mm:ss")}</p>
                                        {selectedSession.mentorConnectionDurationMs && (
                                          <p className="ml-6 text-gray-600">Duration in session: {formatDuration(selectedSession.mentorConnectionDurationMs)}</p>
                                        )}
                                      </div>
                                    )}
                                    {selectedSession.learnerJoinedAt && (
                                      <div>
                                        <p>✅ Learner joined: {format(new Date(selectedSession.learnerJoinedAt), "HH:mm:ss")}</p>
                                        {selectedSession.learnerConnectionDurationMs && (
                                          <p className="ml-6 text-gray-600">Duration in session: {formatDuration(selectedSession.learnerConnectionDurationMs)}</p>
                                        )}
                                      </div>
                                    )}
                                    {selectedSession.mentorLeftAt && (
                                      <p>⏹️ Mentor left: {format(new Date(selectedSession.mentorLeftAt), "HH:mm:ss")}</p>
                                    )}
                                    {selectedSession.learnerLeftAt && (
                                      <p>⏹️ Learner left: {format(new Date(selectedSession.learnerLeftAt), "HH:mm:ss")}</p>
                                    )}
                                  </div>
                                </div>
                              )}

                              {(selectedSession.mentorRating || selectedSession.learnerRating) && (
                                <div>
                                  <h4 className="font-semibold mb-2">Ratings</h4>
                                  <div className="space-y-2">
                                    <div>
                                      <span className="text-sm text-gray-600">Mentor Rating:</span>
                                      <div>{getRatingStars(selectedSession.mentorRating)}</div>
                                    </div>
                                    <div>
                                      <span className="text-sm text-gray-600">Learner Rating:</span>
                                      <div>{getRatingStars(selectedSession.learnerRating)}</div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {selectedSession.sessionNotes && (
                                <div>
                                  <h4 className="font-semibold mb-2">Session Notes</h4>
                                  <p className="text-sm bg-gray-50 p-3 rounded">{selectedSession.sessionNotes}</p>
                                </div>
                              )}

                              {selectedSession.refundRequestId && (
                                <div>
                                  <h4 className="font-semibold mb-2">Refund Request</h4>
                                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm font-medium">Status:</span>
                                      <Badge className={
                                        selectedSession.refundStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                        selectedSession.refundStatus === 'approved' ? 'bg-green-100 text-green-800' :
                                        'bg-red-100 text-red-800'
                                      }>
                                        {selectedSession.refundStatus}
                                      </Badge>
                                    </div>
                                    <div>
                                      <span className="text-sm font-medium">Reason:</span>
                                      <p className="text-sm text-gray-700 mt-1">{selectedSession.refundReason}</p>
                                    </div>
                                    {selectedSession.refundAmount && (
                                      <div>
                                        <span className="text-sm font-medium">Amount:</span>
                                        <p className="text-sm text-gray-700">{selectedSession.refundAmount} credits</p>
                                      </div>
                                    )}
                                    <div>
                                      <span className="text-sm font-medium">Requested At:</span>
                                      <p className="text-sm text-gray-700">
                                        {selectedSession.refundRequestedAt && format(new Date(selectedSession.refundRequestedAt), "MMM dd, yyyy HH:mm")}
                                      </p>
                                    </div>
                                    {selectedSession.refundStatus === 'pending' && (
                                      <div className="pt-2">
                                        <Button
                                          size="sm"
                                          onClick={() => window.open(`/admin/dashboard?section=reports-feedback`, '_blank')}
                                          variant="outline"
                                        >
                                          Review Request
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {selectedSession.status === "ongoing" && (
                                <div className="flex justify-end">
                                  <Button
                                    onClick={() => forceEndSession(selectedSession.id)}
                                    variant="destructive"
                                    className="flex items-center space-x-2"
                                  >
                                    <StopCircle className="w-4 h-4" />
                                    <span>Force End Session</span>
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Scheduled:</span>
                      <br />
                      {format(new Date(session.scheduledDate), "MMM dd, HH:mm")}
                    </div>
                    <div>
                      <span className="font-medium">Duration:</span>
                      <br />
                      {formatDuration(session.actualDurationMs, session.durationMinutes)}
                    </div>
                    <div>
                      <span className="font-medium">Cost:</span>
                      <br />
                      {session.totalCostCredits} credits
                    </div>
                    <div>
                      <span className="font-medium">Ratings:</span>
                      <br />
                      <div className="flex space-x-2">
                        <span>M: {session.mentorRating || "N/A"}</span>
                        <span>L: {session.learnerRating || "N/A"}</span>
                      </div>
                    </div>
                  </div>

                  {session.status === "ongoing" && (
                    <div className="mt-3 pt-3 border-t">
                      <Button
                        onClick={() => forceEndSession(session.id)}
                        variant="destructive"
                        size="sm"
                        className="flex items-center space-x-2"
                      >
                        <StopCircle className="w-4 h-4" />
                        <span>Force End Session</span>
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}