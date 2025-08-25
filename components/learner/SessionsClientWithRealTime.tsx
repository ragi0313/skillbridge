"use client"

import { useState, useEffect, useCallback } from "react"
import { SessionCard } from "@/components/learner/SessionCard"
import { SessionStats } from "@/components/learner/SessionStats"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, Filter, Wifi, WifiOff, RefreshCw } from "lucide-react"
import { useSessionUpdates, SessionUpdateData } from "@/lib/hooks/useSessionUpdates"
import { SessionData } from "@/types/session"
import { toast } from "@/lib/toast"

interface SessionsClientProps {
  initialSessions: SessionData[]
}

export function SessionsClientWithRealTime({ initialSessions }: SessionsClientProps) {
  const [sessions, setSessions] = useState<SessionData[]>(initialSessions)
  const [activeFilter, setActiveFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null)
  const [isClient, setIsClient] = useState(false)

  // Handle real-time session updates
  const handleSessionUpdate = useCallback((data: SessionUpdateData) => {
    if (data.type === 'session_update' && data.session && data.sessionId) {
      console.log("Received session update:", data)
      
      setSessions(prevSessions => {
        const updatedSessions = prevSessions.map(session => {
          if (session.id === data.sessionId) {
            // Update the session with new data from the server
            return {
              ...session,
              ...data.session,
              // Ensure Date objects are properly handled
              scheduledDate: new Date(data.session.scheduledDate),
              createdAt: data.session.createdAt ? new Date(data.session.createdAt) : session.createdAt,
              mentorResponseAt: data.session.mentorResponseAt ? new Date(data.session.mentorResponseAt) : session.mentorResponseAt,
            }
          }
          return session
        })
        
        setLastUpdateTime(new Date())
        return updatedSessions
      })

      // Show specific updates based on the change type
      if (data.updateType === 'status_change') {
        const sessionInfo = data.session.mentorUser ? 
          `Session with ${data.session.mentorUser.firstName}` : 
          'Your session'
        
        if (data.newStatus === 'confirmed') {
          toast.success(`🎉 ${sessionInfo} has been confirmed!`)
        } else if (data.newStatus === 'rejected') {
          toast.error(`❌ ${sessionInfo} was declined`)
        } else if (data.newStatus === 'upcoming') {
          toast.info(`⏰ ${sessionInfo} is starting soon`)
        }
      }
    }
  }, [])

  // Set up real-time connection
  const { isConnected, reconnect } = useSessionUpdates({
    onSessionUpdate: handleSessionUpdate,
    enableToasts: true
  })

  // Initialize client-side timestamp to prevent hydration errors
  useEffect(() => {
    setIsClient(true)
    setLastUpdateTime(new Date())
  }, [])

  // Group sessions by status - properly separated
  const pendingSessions = sessions.filter(s => s.status === "pending")
  const upcomingSessions = sessions.filter(s => ["confirmed", "upcoming"].includes(s.status || ""))
  const activeSessions = sessions.filter(s => s.status === "ongoing")
  const completedSessions = sessions.filter(s => s.status === "completed")
  const cancelledSessions = sessions.filter(s => ["cancelled"].includes(s.status || ""))
  const rejectedSessions = sessions.filter(s => s.status === "rejected")
  const noShowSessions = sessions.filter(s => ["both_no_show", "learner_no_show", "mentor_no_show"].includes(s.status || ""))
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
        const mentorName = `${session.mentorUser?.firstName || ""} ${session.mentorUser?.lastName || ""}`.toLowerCase()
        const skillName = (session.skill?.skillName || "").toLowerCase()
        const notes = (session.sessionNotes || "").toLowerCase()
        const query = searchQuery.toLowerCase()
        
        return mentorName.includes(query) || skillName.includes(query) || notes.includes(query)
      })
    }

    return filtered
  }

  const filteredSessions = getFilteredSessions()

  // Filter options for the filter bar
  const filterOptions = [
    { key: "all", label: "All", count: sessions.length },
    { key: "pending", label: "Pending", count: pendingSessions.length },
    { key: "upcoming", label: "Upcoming", count: upcomingSessions.length },
    { key: "active", label: "Ongoing", count: activeSessions.length },
    { key: "completed", label: "Completed", count: completedSessions.length },
    { key: "cancelled", label: "Cancelled", count: cancelledSessions.length },
    { key: "rejected", label: "Declined", count: rejectedSessions.length },
    { key: "no_show", label: "No Show", count: noShowSessions.length },
    { key: "technical_issues", label: "Tech Issues", count: technicalIssuesSessions.length }
  ]

  const getStatusColor = (status: string | null): string => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "confirmed":
        return "bg-blue-100 text-blue-800"
      case "upcoming":
        return "bg-indigo-100 text-indigo-800"
      case "ongoing":
        return "bg-purple-100 text-purple-800"
      case "completed":
        return "bg-green-100 text-green-800"
      case "cancelled":
        return "bg-gray-100 text-gray-800"
      case "rejected":
        return "bg-red-100 text-red-800"
      case "both_no_show":
      case "learner_no_show":
      case "mentor_no_show":
        return "bg-orange-100 text-orange-800"
      case "technical_issues":
        return "bg-purple-100 text-purple-800"
      case "mentor_no_response":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatStatus = (status: string | null): string => {
    switch (status) {
      case "pending":
        return "Pending Approval"
      case "confirmed":
        return "Confirmed"
      case "upcoming":
        return "Starting Soon"
      case "ongoing":
        return "In Progress"
      case "completed":
        return "Completed"
      case "cancelled":
        return "Cancelled"
      case "rejected":
        return "Declined"
      case "both_no_show":
        return "Both No Show"
      case "learner_no_show":
        return "Learner No Show"
      case "mentor_no_show":
        return "Mentor No Show"
      case "technical_issues":
        return "Technical Issues"
      case "mentor_no_response":
        return "No Response"
      default:
        return status ? status.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase()) : "Unknown"
    }
  }

  // Force refresh sessions
  const handleRefresh = () => {
    window.location.reload()
  }

  return (
    <>
      {/* Real-time Connection Status */}
      <div className="mb-4">
        <div className="flex items-center justify-between bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center space-x-3">
            <div className={`flex items-center space-x-2 ${isConnected ? 'text-green-600' : 'text-orange-600'}`}>
              {isConnected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
              <span className="text-sm font-medium">
                {isConnected ? 'Real-time updates active' : 'Real-time updates disconnected'}
              </span>
            </div>
            {isConnected && (
              <Badge variant="secondary" className="bg-green-50 text-green-700 text-xs">
                Live
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">
              Last updated: {isClient && lastUpdateTime ? lastUpdateTime.toLocaleTimeString() : '--:--:--'}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="text-xs"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

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

      {/* Quick Actions */}
      {pendingSessions.length === 0 && upcomingSessions.length === 0 && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold mb-2">Ready to Learn?</h3>
              <p className="text-blue-100">Find experienced mentors to guide your learning journey</p>
            </div>
            <a 
              href="/find-mentors" 
              className="bg-white text-blue-600 px-6 py-3 rounded-xl font-semibold hover:bg-blue-50 transition-colors"
            >
              Find Mentors
            </a>
          </div>
        </div>
      )}

      {/* Search and Filter Bar */}
      <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search by mentor name, skill, or notes..."
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
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
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
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <CardTitle className="text-2xl mb-2">
                  {searchQuery.trim() ? "No matching sessions found" : 
                   activeFilter === "all" ? "Start Your Learning Journey" : 
                   `No ${filterOptions.find(f => f.key === activeFilter)?.label.toLowerCase()} sessions`}
                </CardTitle>
                <CardDescription className="text-lg">
                  {searchQuery.trim() ? `No sessions match your search "${searchQuery}"` :
                   activeFilter === "all" ? <>You haven't booked any sessions yet. <a href="/find-mentors" className="text-blue-600 hover:underline font-semibold">Find a mentor</a> to get started!</> :
                   `You don't have any ${filterOptions.find(f => f.key === activeFilter)?.label.toLowerCase()} sessions.`}
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            filteredSessions.map((session) => (
              <SessionCard 
                key={session.id} 
                session={session} 
                getStatusColor={getStatusColor}
                formatStatus={formatStatus}
                userType="learner"
              />
            ))
          )}
        </div>
      </div>
    </>
  )
}