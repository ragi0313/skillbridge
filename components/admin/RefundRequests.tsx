"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { AlertCircle, CheckCircle, XCircle, Clock, DollarSign, Eye, User, Calendar } from "lucide-react"
import { format } from "date-fns"

interface RefundRequest {
  id: number
  sessionId: number
  requestedBy: number
  requestReason: string
  detailedReason: string
  evidenceUrls: string | null
  requestedAmount: number
  status: string
  reviewedBy: number | null
  adminNotes: string | null
  approvedAmount: number | null
  rejectionReason: string | null
  createdAt: string
  reviewedAt: string | null
  requesterEmail: string
  requesterName: string
}

export default function RefundRequests() {
  const [requests, setRequests] = useState<RefundRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("pending")
  const [selectedRequest, setSelectedRequest] = useState<RefundRequest | null>(null)
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [reviewAction, setReviewAction] = useState<"approve" | "reject">("approve")
  const [adminNotes, setAdminNotes] = useState("")
  const [approvedAmount, setApprovedAmount] = useState<number>(0)
  const [rejectionReason, setRejectionReason] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    fetchRefundRequests()
  }, [statusFilter, currentPage])

  const fetchRefundRequests = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        status: statusFilter,
        page: currentPage.toString(),
      })

      const response = await fetch(`/api/admin/refund-requests?${params}`)
      if (response.ok) {
        const data = await response.json()
        setRequests(data.refundRequests.map((item: any) => ({
          ...item.refundRequest,
          requesterEmail: item.requester?.email || 'Unknown',
          requesterName: `${item.requester?.firstName || ''} ${item.requester?.lastName || ''}`.trim() || 'Unknown',
        })))
        setTotalPages(data.pagination.totalPages)
      }
    } catch (error) {
      console.error("Failed to fetch refund requests:", error)
      toast.error("Failed to load refund requests")
    } finally {
      setLoading(false)
    }
  }

  const openReviewDialog = (request: RefundRequest, action: "approve" | "reject") => {
    setSelectedRequest(request)
    setReviewAction(action)
    setAdminNotes("")
    setApprovedAmount(request.requestedAmount)
    setRejectionReason("")
    setReviewDialogOpen(true)
  }

  const handleReview = async () => {
    if (!selectedRequest) return

    if (reviewAction === "reject" && !rejectionReason.trim()) {
      toast.error("Please provide a rejection reason")
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch(`/api/admin/refund-requests/${selectedRequest.id}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: reviewAction,
          adminNotes: adminNotes.trim() || null,
          approvedAmount: reviewAction === "approve" ? approvedAmount : null,
          rejectionReason: reviewAction === "reject" ? rejectionReason.trim() : null,
        }),
      })

      if (response.ok) {
        toast.success(
          reviewAction === "approve"
            ? "Refund request approved successfully"
            : "Refund request rejected successfully"
        )
        setReviewDialogOpen(false)
        fetchRefundRequests()
      } else {
        const error = await response.json()
        throw new Error(error.error || "Failed to process refund request")
      }
    } catch (error: any) {
      console.error("Error reviewing refund request:", error)
      toast.error(error.message || "Failed to process refund request")
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { variant: "secondary" as const, icon: Clock, label: "Pending", color: "text-yellow-600" },
      approved: { variant: "default" as const, icon: CheckCircle, label: "Approved", color: "text-green-600" },
      rejected: { variant: "destructive" as const, icon: XCircle, label: "Rejected", color: "text-red-600" },
    }

    const statusConfig = config[status as keyof typeof config] || config.pending
    const Icon = statusConfig.icon

    return (
      <Badge variant={statusConfig.variant} className="flex items-center space-x-1">
        <Icon className="w-3 h-3" />
        <span>{statusConfig.label}</span>
      </Badge>
    )
  }

  const getReasonLabel = (reason: string) => {
    const labels: Record<string, string> = {
      technical_issues: "Technical Issues",
      mentor_no_show: "Mentor Didn't Show Up",
      quality_issues: "Quality/Content Issues",
      other: "Other",
    }
    return labels[reason] || reason
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Refund Requests</h2>
        <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setCurrentPage(1) }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Requests</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading refund requests...</p>
          </CardContent>
        </Card>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No refund requests found</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            {requests.map((request) => (
              <Card key={request.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">
                        Refund Request #{request.id}
                      </CardTitle>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <User className="w-4 h-4" />
                          <span>{request.requesterName}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>{format(new Date(request.createdAt), "MMM dd, yyyy 'at' h:mm a")}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(request.status)}
                      <div className="flex items-center space-x-1 text-sm font-medium">
                        <DollarSign className="w-4 h-4 text-blue-600" />
                        <span>{request.requestedAmount} credits</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-gray-500">Reason</Label>
                      <p className="font-medium">{getReasonLabel(request.requestReason)}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Session ID</Label>
                      <p className="font-medium">#{request.sessionId}</p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-gray-500">Detailed Explanation</Label>
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md mt-1 break-words whitespace-pre-wrap">
                      {request.detailedReason}
                    </p>
                  </div>

                  {request.status === "approved" && (
                    <div className="bg-green-50 border border-green-200 rounded-md p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-semibold text-green-800">Approved</span>
                      </div>
                      <p className="text-sm text-green-700">
                        Amount: {request.approvedAmount} credits
                      </p>
                      {request.adminNotes && (
                        <p className="text-sm text-green-700 mt-1 break-words whitespace-pre-wrap">
                          <strong>Admin Notes:</strong> {request.adminNotes}
                        </p>
                      )}
                    </div>
                  )}

                  {request.status === "rejected" && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <XCircle className="w-4 h-4 text-red-600" />
                        <span className="text-sm font-semibold text-red-800">Rejected</span>
                      </div>
                      {request.rejectionReason && (
                        <p className="text-sm text-red-700 break-words whitespace-pre-wrap">
                          <strong>Reason:</strong> {request.rejectionReason}
                        </p>
                      )}
                    </div>
                  )}

                  {request.status === "pending" && (
                    <div className="flex gap-2 pt-2 border-t">
                      <Button
                        onClick={() => openReviewDialog(request, "approve")}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => openReviewDialog(request, "reject")}
                        variant="destructive"
                        className="flex-1"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <div className="flex space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
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
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {reviewAction === "approve" ? "Approve Refund Request" : "Reject Refund Request"}
            </DialogTitle>
            <DialogDescription>
              {reviewAction === "approve"
                ? "Review and approve this refund request. The credits will be returned to the learner."
                : "Provide a reason for rejecting this refund request."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {reviewAction === "approve" && (
              <div className="space-y-2">
                <Label htmlFor="approved-amount">Approved Amount (Credits)</Label>
                <input
                  id="approved-amount"
                  type="number"
                  value={approvedAmount}
                  onChange={(e) => setApprovedAmount(Number(e.target.value))}
                  className="w-full p-2 border rounded-md"
                  min="0"
                  max={selectedRequest?.requestedAmount || 0}
                />
                <p className="text-xs text-gray-500">
                  Requested: {selectedRequest?.requestedAmount} credits
                </p>
              </div>
            )}

            {reviewAction === "reject" && (
              <div className="space-y-2">
                <Label htmlFor="rejection-reason">Rejection Reason *</Label>
                <Textarea
                  id="rejection-reason"
                  placeholder="Explain why this refund request is being rejected..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="admin-notes">Admin Notes (Optional)</Label>
              <Textarea
                id="admin-notes"
                placeholder="Add any internal notes about this decision..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              onClick={handleReview}
              disabled={submitting || (reviewAction === "reject" && !rejectionReason.trim())}
              className={reviewAction === "approve" ? "bg-green-600 hover:bg-green-700" : ""}
            >
              {submitting ? "Processing..." : reviewAction === "approve" ? "Approve Refund" : "Reject Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
