"use client"

import { useState } from "react"
import { SessionCard } from "@/components/mentor/SessionCard"
import { SessionStats } from "@/components/mentor/SessionStats"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Filter } from "lucide-react"

interface SessionData {
  id: number
  status: string | null
  scheduledDate: Date
  durationMinutes: number
  totalCostCredits: number
  sessionNotes: string
  archived: boolean | null
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

interface SessionsClientProps {
  sessions: SessionData[]
}

export function SessionsClient({ sessions }: SessionsClientProps) {
  const [activeFilter, setActiveFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")

  // Group sessions by status - properly separated
  const pendingSessions = sessions.filter(s => s.status === "pending")
  const upcomingSessions = sessions.filter(s => ["confirmed"].includes(s.status || ""))
  const activeSessions = sessions.filter(s => s.status === "ongoing")
  const completedSessions = sessions.filter(s => s.status === "completed")
  const cancelledSessions = sessions.filter(s => ["cancelled"].includes(s.status || ""))
  const rejectedSessions = sessions.filter(s => s.status === "rejected")
  const noShowSessions = sessions.filter(s => ["no_show"].includes(s.status || ""))
  const technicalIssuesSessions = sessions.filter(s => s.status === "technical_issues")

  // Filter and search logic
  const getFilteredSessions = () => {
    let filtered = sessions
    
    // Apply status filter
    switch (activeFilter) {
      case "pending":
        filtered = pendingSessions
        break
      case "upcoming":
        filtered = upcomingSessions
        break
      case "active":
        filtered = activeSessions
        break
      case "completed":
        filtered = completedSessions
        break
      case "cancelled":
        filtered = cancelledSessions
        break
      case "rejected":
        filtered = rejectedSessions
        break
      case "no_show":
        filtered = noShowSessions
        break
      case "technical_issues":
        filtered = technicalIssuesSessions
        break
      default:
        filtered = sessions
    }

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(session => {
        const learnerName = `${session.learnerUser?.firstName || ""} ${session.learnerUser?.lastName || ""}`.toLowerCase()
        const skillName = (session.skill?.skillName || "").toLowerCase()
        const notes = (session.sessionNotes || "").toLowerCase()
        const query = searchQuery.toLowerCase()
        
        return learnerName.includes(query) || skillName.includes(query) || notes.includes(query)
      })
    }

    return filtered
  }

  const filteredSessions = getFilteredSessions()

  // Filter options for the filter bar
  const filterOptions = [
    { key: "all", label: "All", count: sessions.length },
    { key: "pending", label: "Requests", count: pendingSessions.length },
    { key: "upcoming", label: "Upcoming", count: upcomingSessions.length },
    { key: "active", label: "Ongoing", count: activeSessions.length },
    { key: "completed", label: "Completed", count: completedSessions.length },
    { key: "cancelled", label: "Cancelled", count: cancelledSessions.length },
    { key: "rejected", label: "Rejected", count: rejectedSessions.length },
    { key: "no_show", label: "No Show", count: noShowSessions.length },
    { key: "technical_issues", label: "Tech Issues", count: technicalIssuesSessions.length }
  ]

  const getStatusColor = (status: string | null): string => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "confirmed":
        return "bg-blue-100 text-blue-800"
      case "ongoing":
        return "bg-purple-100 text-purple-800"
      case "completed":
        return "bg-green-100 text-green-800"
      case "cancelled":
        return "bg-gray-100 text-gray-800"
      case "rejected":
        return "bg-red-100 text-red-800"
      case "no_show":
        return "bg-orange-100 text-orange-800"
      case "technical_issues":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatStatus = (status: string | null): string => {
    switch (status) {
      case "pending":
        return "Pending Your Approval"
      case "confirmed":
        return "Confirmed"
      case "ongoing":
        return "In Progress"
      case "completed":
        return "Completed"
      case "cancelled":
        return "Cancelled"
      case "rejected":
        return "Declined"
      case "no_show":
        return "No Show"
      case "technical_issues":
        return "Technical Issues"
      default:
        return status ? status.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase()) : "Unknown"
    }
  }

  return (
    <>
      {/* Modern Stats Cards */}
      <div className="mb-8">
        <SessionStats 
          total={sessions.length}
          pending={pendingSessions.length}
          upcoming={upcomingSessions.length}
          completed={completedSessions.length}
          cancelled={cancelledSessions.length}
        />
      </div>

      {/* Action Required Alert */}
      {pendingSessions.length > 0 && (
        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl p-6 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-1">Action Required</h3>
                <p className="text-yellow-100">You have {pendingSessions.length} session request{pendingSessions.length > 1 ? 's' : ''} waiting for your response</p>
              </div>
            </div>
            <div className="bg-white/20 px-4 py-2 rounded-xl">
              <span className="font-bold text-lg">{pendingSessions.length}</span>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filter Bar */}
      <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search by learner name, skill, or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 text-base"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2">
          {filterOptions.map((filter) => (
            <Button
              key={filter.key}
              variant={activeFilter === filter.key ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter(filter.key)}
              className={`flex items-center space-x-2 ${
                activeFilter === filter.key
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "hover:bg-gray-50"
              }`}
            >
              <span>{filter.label}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                activeFilter === filter.key 
                  ? "bg-white/20 text-white" 
                  : "bg-gray-100 text-gray-600"
              }`}>
                {filter.count}
              </span>
              {filter.key === "pending" && filter.count > 0 && (
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse ml-1"></div>
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* Filtered Sessions Display */}
      <div className="mt-6">
        <div className="space-y-4">
          {filteredSessions.length === 0 ? (
            <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50">
              <CardHeader className="text-center py-12">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <CardTitle className="text-2xl mb-2">
                  {searchQuery.trim() ? "No matching sessions found" : 
                   activeFilter === "all" ? "Welcome to Mentoring" : 
                   `No ${filterOptions.find(f => f.key === activeFilter)?.label.toLowerCase()} sessions`}
                </CardTitle>
                <CardDescription className="text-lg">
                  {searchQuery.trim() ? `No sessions match your search "${searchQuery}"` :
                   activeFilter === "all" ? "You haven't received any session requests yet. Make sure your profile is complete and visible to learners." :
                   `You don't have any ${filterOptions.find(f => f.key === activeFilter)?.label.toLowerCase()} sessions.`}
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <>
              {/* Action Required Alert for Pending Sessions */}
              {activeFilter === "pending" && pendingSessions.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-yellow-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h4 className="text-sm font-medium text-yellow-800">Action Required</h4>
                      <p className="text-sm text-yellow-700">You have {pendingSessions.length} session request(s) that require your response. Please accept or decline them before they expire.</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Session Cards */}
              {filteredSessions.map((session) => (
                <SessionCard 
                  key={session.id} 
                  session={session} 
                  getStatusColor={getStatusColor}
                  formatStatus={formatStatus}
                  userType="mentor"
                />
              ))}
            </>
          )}
        </div>
      </div>
    </>
  )
}