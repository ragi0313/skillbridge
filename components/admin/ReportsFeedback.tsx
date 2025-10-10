"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Clock,
  User,
  FileText,
  Search,
  Filter
} from "lucide-react"
import { format } from "date-fns"

interface UserReport {
  id: number
  reporterName: string
  reportedUserName: string
  reportedUserRole: string
  category: string
  description: string
  status: "pending" | "under_review" | "resolved" | "dismissed"
  sessionId?: number
  evidence?: any
  adminNotes?: string
  reviewedBy?: string
  reviewedAt?: string
  resolution?: string
  createdAt: string
}

interface ReportsFeedbackProps {
  onReportUpdate?: () => void
}

export default function ReportsFeedback({ onReportUpdate }: ReportsFeedbackProps) {
  const [reports, setReports] = useState<UserReport[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("pending")
  const [selectedReport, setSelectedReport] = useState<UserReport | null>(null)
  const [adminNotes, setAdminNotes] = useState("")
  const [resolution, setResolution] = useState("")
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    fetchReports()
  }, [statusFilter])

  const fetchReports = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/reports?status=${statusFilter}`)
      if (response.ok) {
        const data = await response.json()
        setReports(data.reports)
      }
    } catch (error) {
      console.error("Failed to fetch reports:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleReportAction = async (reportId: number, action: "resolve" | "dismiss") => {
    try {
      setActionLoading(true)
      const response = await fetch(`/api/admin/reports/${reportId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          adminNotes,
          resolution: action === "resolve" ? resolution : "Report dismissed by admin",
        }),
      })

      if (response.ok) {
        fetchReports()
        onReportUpdate?.() // Refresh sidebar counts
        setSelectedReport(null)
        setAdminNotes("")
        setResolution("")
      }
    } catch (error) {
      console.error("Failed to update report:", error)
    } finally {
      setActionLoading(false)
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "harassment":
        return <AlertTriangle className="w-4 h-4 text-red-500" />
      case "inappropriate_content":
        return <FileText className="w-4 h-4 text-orange-500" />
      case "fraud":
        return <XCircle className="w-4 h-4 text-red-600" />
      default:
        return <MessageSquare className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: "bg-yellow-100 text-yellow-800",
      under_review: "bg-blue-100 text-blue-800",
      resolved: "bg-green-100 text-green-800",
      dismissed: "bg-gray-100 text-gray-800",
    }

    const icons = {
      pending: <Clock className="w-3 h-3" />,
      under_review: <Eye className="w-3 h-3" />,
      resolved: <CheckCircle className="w-3 h-3" />,
      dismissed: <XCircle className="w-3 h-3" />,
    }

    return (
      <Badge className={`flex items-center space-x-1 ${variants[status as keyof typeof variants]}`}>
        {icons[status as keyof typeof icons]}
        <span>{status.replace("_", " ").toUpperCase()}</span>
      </Badge>
    )
  }

  const getPriorityColor = (category: string) => {
    switch (category) {
      case "harassment":
      case "fraud":
        return "border-l-red-500"
      case "inappropriate_content":
        return "border-l-orange-500"
      default:
        return "border-l-blue-500"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-6 h-6 text-gray-600" />
          <h1 className="text-2xl font-bold text-gray-900">Reports & Feedback</h1>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending Reports</SelectItem>
            <SelectItem value="under_review">Under Review</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="dismissed">Dismissed</SelectItem>
            <SelectItem value="all">All Reports</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Reports List */}
      <Card>
        <CardHeader>
          <CardTitle>User Reports</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse p-4 border rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-64"></div>
                      <div className="h-3 bg-gray-200 rounded w-48"></div>
                    </div>
                    <div className="h-6 bg-gray-200 rounded w-20"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No reports found for the selected status.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className={`p-4 border-l-4 border rounded-lg hover:bg-gray-50 transition-colors ${getPriorityColor(report.category)}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        {getCategoryIcon(report.category)}
                        <h3 className="font-semibold text-gray-900 capitalize">
                          {report.category.replace("_", " ")} Report
                        </h3>
                        {getStatusBadge(report.status)}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        <strong>Reporter:</strong> {report.reporterName} →{" "}
                        <strong>Reported:</strong> {report.reportedUserName} ({report.reportedUserRole})
                      </p>
                      <p className="text-gray-700 mb-2 line-clamp-2">{report.description}</p>
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>Reported {format(new Date(report.createdAt), "MMM dd, yyyy")}</span>
                        {report.sessionId && <span>Session #{report.sessionId}</span>}
                      </div>
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedReport(report)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Report Details - #{report.id}</DialogTitle>
                        </DialogHeader>
                        {selectedReport && (
                          <div className="space-y-6">
                            {/* Report Info */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <h4 className="font-semibold mb-2">Report Information</h4>
                                <p><strong>Category:</strong> {selectedReport.category.replace("_", " ")}</p>
                                <p><strong>Status:</strong> {getStatusBadge(selectedReport.status)}</p>
                                <p><strong>Date:</strong> {format(new Date(selectedReport.createdAt), "MMM dd, yyyy HH:mm")}</p>
                                {selectedReport.sessionId && (
                                  <p><strong>Session:</strong> #{selectedReport.sessionId}</p>
                                )}
                              </div>
                              <div>
                                <h4 className="font-semibold mb-2">Involved Users</h4>
                                <p><strong>Reporter:</strong> {selectedReport.reporterName}</p>
                                <p><strong>Reported User:</strong> {selectedReport.reportedUserName}</p>
                                <p><strong>Role:</strong> {selectedReport.reportedUserRole}</p>
                              </div>
                            </div>

                            {/* Description */}
                            <div>
                              <h4 className="font-semibold mb-2">Description</h4>
                              <p className="bg-gray-50 p-3 rounded text-sm">{selectedReport.description}</p>
                            </div>

                            {/* Evidence */}
                            {selectedReport.evidence && (
                              <div>
                                <h4 className="font-semibold mb-2">Evidence</h4>
                                <div className="bg-gray-50 p-3 rounded text-sm">
                                  <pre>{JSON.stringify(selectedReport.evidence, null, 2)}</pre>
                                </div>
                              </div>
                            )}

                            {/* Admin Notes */}
                            {selectedReport.status !== "pending" && selectedReport.adminNotes && (
                              <div>
                                <h4 className="font-semibold mb-2">Admin Notes</h4>
                                <p className="bg-blue-50 p-3 rounded text-sm">{selectedReport.adminNotes}</p>
                              </div>
                            )}

                            {/* Resolution */}
                            {selectedReport.resolution && (
                              <div>
                                <h4 className="font-semibold mb-2">Resolution</h4>
                                <p className="bg-green-50 p-3 rounded text-sm">{selectedReport.resolution}</p>
                                <p className="text-xs text-gray-500 mt-2">
                                  Resolved by {selectedReport.reviewedBy} on{" "}
                                  {selectedReport.reviewedAt && format(new Date(selectedReport.reviewedAt), "MMM dd, yyyy HH:mm")}
                                </p>
                              </div>
                            )}

                            {/* Action Form for Pending Reports */}
                            {selectedReport.status === "pending" && (
                              <div className="space-y-4 border-t pt-4">
                                <h4 className="font-semibold">Take Action</h4>
                                <div>
                                  <label className="block text-sm font-medium mb-2">Admin Notes</label>
                                  <Textarea
                                    value={adminNotes}
                                    onChange={(e) => setAdminNotes(e.target.value)}
                                    placeholder="Add your notes about this report..."
                                    rows={3}
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-2">Resolution (if resolving)</label>
                                  <Textarea
                                    value={resolution}
                                    onChange={(e) => setResolution(e.target.value)}
                                    placeholder="Describe how this issue was resolved..."
                                    rows={3}
                                  />
                                </div>
                                <div className="flex space-x-3">
                                  <Button
                                    onClick={() => handleReportAction(selectedReport.id, "resolve")}
                                    disabled={actionLoading || !resolution.trim()}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Resolve Report
                                  </Button>
                                  <Button
                                    onClick={() => handleReportAction(selectedReport.id, "dismiss")}
                                    disabled={actionLoading}
                                    variant="destructive"
                                  >
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Dismiss Report
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}