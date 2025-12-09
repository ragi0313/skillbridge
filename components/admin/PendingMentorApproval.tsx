"use client"

import { useEffect, useState, useMemo } from "react"
import { toast } from "sonner"
import type { PendingMentor } from "./pending-mentors/types"
import { MentorApplicationHeader } from "./pending-mentors/MentorApplicationHeader"
import { MentorApplicationCard } from "./pending-mentors/MentorApplicationCard"
import { LoadingState } from "./pending-mentors/LoadingState"
import { EmptyState } from "./pending-mentors/EmptyState"
import { Button } from "@/components/ui/button"


interface PendingMentorApprovalsProps {
  onMentorUpdate?: () => void
}

export default function PendingMentorApprovals({ onMentorUpdate }: PendingMentorApprovalsProps) {
  const [mentors, setMentors] = useState<PendingMentor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    const fetchMentors = async () => {
      try {
        const res = await fetch("/api/admin/pending-mentors")
        const data = await res.json()
        setMentors(data)
      } catch (error) {
        console.error("Failed to fetch mentors:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchMentors()
  }, [])

  const handleApprove = async (id: number, notes: string) => {
    try {
      const response = await fetch(`/api/admin/pending-mentors/approve/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        toast.error(error.message || "Failed to approve mentor")
        return
      }
      
      setMentors((prev) => prev.filter((m) => m.id !== id))
      toast.success("Mentor approved successfully!")
      onMentorUpdate?.() // Refresh sidebar counts
    } catch (error) {
      console.error("Failed to approve mentor:", error)
      toast.error("Error approving mentor")
    }
  }


  const handleReject = async (id: number, notes: string) => {
    try {
      const response = await fetch(`/api/admin/pending-mentors/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, notes }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        toast.error(error.message || "Failed to reject mentor")
        return
      }
      
      setMentors((prev) => prev.filter((m) => m.id !== id))
      toast.success("Mentor application rejected. Email sent to applicant.")
      onMentorUpdate?.() // Refresh sidebar counts
    } catch (error) {
      console.error("Failed to reject mentor:", error)
      toast.error("Error rejecting mentor")
    }
  }

  // Pagination logic
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const totalPages = Math.ceil(mentors.length / itemsPerPage)

    return {
      items: mentors.slice(startIndex, endIndex),
      totalPages,
      startIndex,
      endIndex
    }
  }, [mentors, currentPage, itemsPerPage])

  if (isLoading) {
    return <LoadingState />
  }

  return (
    <div className="space-y-8">
      <MentorApplicationHeader pendingCount={mentors.length} />

      <div className="grid gap-6">
        {mentors.length === 0 ? (
          <EmptyState />
        ) : (
          paginatedData.items.map((mentor) => (
            <MentorApplicationCard key={mentor.id} mentor={mentor} onApprove={handleApprove} onReject={handleReject} />
          ))
        )}
      </div>

      {/* Pagination */}
      {paginatedData.totalPages > 1 && (
        <div className="flex items-center justify-between border-t pt-4">
          <div className="text-sm text-gray-600">
            Showing {paginatedData.startIndex + 1} to {Math.min(paginatedData.endIndex, mentors.length)} of {mentors.length} applications
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
              {Array.from({ length: Math.min(5, paginatedData.totalPages) }, (_, i) => {
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
              {paginatedData.totalPages > 5 && (
                <>
                  <span className="px-2">...</span>
                  <Button
                    variant={currentPage === paginatedData.totalPages ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(paginatedData.totalPages)}
                    className="w-8 h-8 p-0"
                  >
                    {paginatedData.totalPages}
                  </Button>
                </>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(paginatedData.totalPages, currentPage + 1))}
              disabled={currentPage === paginatedData.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
