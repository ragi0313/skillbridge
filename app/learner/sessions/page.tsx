"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import UnifiedHeader from "@/components/UnifiedHeader"
import  Footer  from "@/components/landing/Footer"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage } from "@/components/ui/avatar"
import { Calendar, Clock, DollarSign, User, Loader2 } from 'lucide-react'
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"

// Define types for session data
interface BookingSession {
  id: number
  mentorFirstName: string
  mentorLastName: string
  mentorProfilePicture: string
  skillName: string
  scheduledDate: string
  durationMinutes: number
  totalCostCredits: number
  status: string
}

type SessionStatus = "all" | "pending" | "upcoming" | "completed" | "cancelled" | "rejected"

export default function LearnerSessionsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState<BookingSession[]>([])
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<SessionStatus>("upcoming")

  const formatSessionDate = (dateString: string) => {
     return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }).format(new Date(dateString))
  }

  const fetchLearnerSessions = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/learner/sessions", { cache: "no-store" })
      if (!res.ok) {
        if (res.status === 401) {
          toast.error("Unauthorized", {
            description: "Please log in to view your sessions.",
          })
          router.push("/login")
          return
        }
        throw new Error("Failed to fetch sessions")
      }
      const data = await res.json()
      setSessions(data.sessions)
    } catch (err: any) {
      console.error("Error fetching learner sessions:", err)
      setError(err.message || "Failed to load sessions.")
      toast.error("Error", {
        description: err.message || "Failed to load your sessions. Please try again.",
      })
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchLearnerSessions()
  }, [fetchLearnerSessions])

  const filterSessions = (status: SessionStatus) => {
    const now = new Date()
    return sessions.filter((session) => {
      const sessionDate = new Date(session.scheduledDate)
      switch (status) {
        case "all":
          return true
        case "pending":
          return session.status === "pending"
        case "upcoming":
          return session.status === "confirmed" && sessionDate > now
        case "completed":
          return session.status === "completed" || (session.status === "confirmed" && sessionDate <= now)
        case "cancelled":
          return session.status === "cancelled"
        case "rejected":
          return session.status === "rejected"
        default:
          return false
      }
    })
  }

  const renderSessionCards = (filteredSessions: BookingSession[]) => {
    if (filteredSessions.length === 0) {
      return (
        <div className="text-center py-10 text-gray-500">
          <p className="text-lg">No sessions found for this status.</p>
          {activeTab === "upcoming" && (
            <Button onClick={() => router.push("/find-mentors")} className="mt-4 gradient-bg text-white">
              Find a Mentor
            </Button>
          )}
        </div>
      )
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSessions.map((session) => (
          <Card key={session.id} className="shadow-md hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center space-x-4 pb-2">
               <Avatar className="h-20 w-20 border-4 border-white/20">
                <AvatarImage src={session.mentorProfilePicture || "/default-avatar.png"} />
              </Avatar>
              <div>
                <CardTitle className="text-lg font-semibold">{session.mentorFirstName} {session.mentorLastName}</CardTitle>
                <CardDescription className="text-sm text-gray-600">{session.skillName}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center text-sm text-gray-700">
                <Calendar className="mr-2 h-4 w-4 text-blue-600" />
                <span>{formatSessionDate(session.scheduledDate)}</span>
              </div>
              <div className="flex items-center text-sm text-gray-700">
                <Clock className="mr-2 h-4 w-4 text-purple-600" />
                <span>{session.durationMinutes} minutes</span>
              </div>
              <div className="flex items-center text-sm text-gray-700">
                <DollarSign className="mr-2 h-4 w-4 text-green-600" />
                <span>Cost: {session.totalCostCredits} credits</span>
              </div>
              <div className="flex items-center text-sm text-gray-700">
                <User className="mr-2 h-4 w-4 text-orange-600" />
                <span>Status: {session.status}</span>
              </div>
              <Button size="sm" className="mt-4 w-full">
                View Details
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <UnifiedHeader />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-600 text-lg">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            Loading sessions...
          </div>
        </main>
        <Footer />
      </div>
    )
  }


  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <UnifiedHeader />
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">My Sessions</h1>

        {sessions.length === 0 ? (
          <Card className="shadow-lg border-0 bg-white p-6 text-center">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-900">No Sessions Yet</CardTitle>
              <CardDescription className="text-gray-600">
                You haven't booked any mentoring sessions yet. Find a mentor to get started!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => router.push("/find-mentors")} className="gradient-bg text-white">
                Find a Mentor
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as SessionStatus)} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
            <Separator className="my-4" />
            <TabsContent value="upcoming">{renderSessionCards(filterSessions("upcoming"))}</TabsContent>
            <TabsContent value="pending">{renderSessionCards(filterSessions("pending"))}</TabsContent>
            <TabsContent value="completed">{renderSessionCards(filterSessions("completed"))}</TabsContent>
            <TabsContent value="cancelled">{renderSessionCards(filterSessions("cancelled"))}</TabsContent>
            <TabsContent value="all">{renderSessionCards(filterSessions("all"))}</TabsContent>
          </Tabs>
        )}
      </main>
      <Footer />
    </div>
  )
}
