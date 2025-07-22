"use client"

import { useEffect, useState } from "react"
import type { PendingMentor } from "./pending-mentors/types"
import { MentorApplicationHeader } from "./pending-mentors/MentorApplicationHeader"
import { MentorApplicationCard } from "./pending-mentors/MentorApplicationCard"
import { LoadingState } from "./pending-mentors/LoadingState"
import { EmptyState } from "./pending-mentors/EmptyState"


export default function PendingMentorApprovals() {
  const [mentors, setMentors] = useState<PendingMentor[]>([])
  const [isLoading, setIsLoading] = useState(true)

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
      await fetch("/api/admin/pending-mentors/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, notes }),
      })
      setMentors((prev) => prev.filter((m) => m.id !== id))
    } catch (error) {
      console.error("Failed to approve mentor:", error)
    }
  }

  const handleReject = async (id: number, notes: string) => {
    try {
      await fetch("/api/admin/pending-mentors/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, notes }),
      })
      setMentors((prev) => prev.filter((m) => m.id !== id))
    } catch (error) {
      console.error("Failed to reject mentor:", error)
    }
  }

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
          mentors.map((mentor) => (
            <MentorApplicationCard key={mentor.id} mentor={mentor} onApprove={handleApprove} onReject={handleReject} />
          ))
        )}
      </div>
    </div>
  )
}
