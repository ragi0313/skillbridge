"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  Calendar,
  DollarSign,
  Star,
  Users,
  Clock,
  TrendingUp,
  MessageSquare,
  Settings,
  Eye,
  BookOpen,
  Award,
  Target,
  ChevronRight,
} from "lucide-react"
import MentorHeader from "@/components/mentor/Header"

type MentorStats = {
  totalSessions: number
  totalEarnings: number
  averageRating: number
  totalStudents: number
  hoursThisMonth: number
  completionRate: number
  responseTime: string
  upcomingSessions: number
}

type Mentor = {
  id: string
  firstName: string
  lastName: string
  email: string
  profilePictureUrl?: string | null
  skills: string[]
  hourlyRate: number
  bio: string
  isApproved: boolean
}

type RecentSession = {
  id: string
  studentName: string
  subject: string
  date: string
  duration: number
  rating?: number
  status: "completed" | "upcoming" | "cancelled"
}

export default function MentorDashboard() {
  const router = useRouter()
  const [mentor, setMentor] = useState<Mentor | null>(null)
  const [stats, setStats] = useState<MentorStats | null>(null)
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchMentorData() {
      try {
        // Fetch mentor profile
        const mentorRes = await fetch("/api/mentor/me")
        if (!mentorRes.ok) throw new Error("Unauthorized")
        const mentorData = await mentorRes.json()
        setMentor(mentorData.mentor)
        setStats({
          totalSessions: 47,
          totalEarnings: 2340,
          averageRating: 4.8,
          totalStudents: 23,
          hoursThisMonth: 32,
          completionRate: 96,
          responseTime: "< 2 hours",
          upcomingSessions: 5,
        })

        // Fetch recent sessions (mock data for now)
        setRecentSessions([
          {
            id: "1",
            studentName: "Alice Johnson",
            subject: "React Development",
            date: "2024-01-15T14:00:00Z",
            duration: 60,
            rating: 5,
            status: "completed",
          },
          {
            id: "2",
            studentName: "Bob Smith",
            subject: "JavaScript Fundamentals",
            date: "2024-01-16T10:00:00Z",
            duration: 45,
            status: "upcoming",
          },
          {
            id: "3",
            studentName: "Carol Davis",
            subject: "Node.js Backend",
            date: "2024-01-14T16:30:00Z",
            duration: 90,
            rating: 4,
            status: "completed",
          },
        ])
      } catch (err) {
        console.error("Failed to fetch mentor data", err)
        router.push("/login")
      } finally {
        setLoading(false)
      }
    }
    fetchMentorData()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <MentorHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!mentor || !stats) return null

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <MentorHeader />

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <Avatar className="h-20 w-20 border-4 border-white/20">
                <AvatarImage src={mentor.profilePictureUrl || "/default-avatar.png"} />
                <AvatarFallback className="text-2xl bg-white/20">
                  {getInitials(mentor.firstName, mentor.lastName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-3xl font-bold mb-2">Welcome back, {mentor.firstName}!</h1>
                <p className="text-blue-100 text-lg mb-3">Ready to inspire and guide your students today?</p>
                <div className="flex items-center space-x-4">
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                    ${mentor.hourlyRate}/hour
                  </Badge>
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold">{stats.averageRating}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="text-right">
                <p className="text-blue-100 mb-1">This Month</p>
                <p className="text-3xl font-bold">{stats.hoursThisMonth}h</p>
                <p className="text-blue-100">mentoring time</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-700">Total Earnings</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-800">${stats.totalEarnings}</div>
              <p className="text-xs text-green-600 mt-1">
                <TrendingUp className="h-3 w-3 inline mr-1" />
                +12% from last month
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-700">Total Sessions</CardTitle>
              <BookOpen className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-800">{stats.totalSessions}</div>
              <p className="text-xs text-blue-600 mt-1">{stats.upcomingSessions} upcoming</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-pink-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-700">Students Helped</CardTitle>
              <Users className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-800">{stats.totalStudents}</div>
              <p className="text-xs text-purple-600 mt-1">Across all sessions</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-red-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-700">Completion Rate</CardTitle>
              <Target className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-800">{stats.completionRate}%</div>
              <Progress value={stats.completionRate} className="mt-2 h-2" />
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Quick Actions</span>
              </CardTitle>
              <CardDescription>Manage your mentoring activities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start bg-transparent" variant="outline">
                <Calendar className="h-4 w-4 mr-2" />
                Set Availability
                <ChevronRight className="h-4 w-4 ml-auto" />
              </Button>
              <Button className="w-full justify-start bg-transparent" variant="outline">
                <Eye className="h-4 w-4 mr-2" />
                View All Sessions
                <ChevronRight className="h-4 w-4 ml-auto" />
              </Button>
              <Button className="w-full justify-start bg-transparent" variant="outline">
                <MessageSquare className="h-4 w-4 mr-2" />
                Messages
                <ChevronRight className="h-4 w-4 ml-auto" />
              </Button>
              <Button className="w-full justify-start bg-transparent" variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Profile Settings
                <ChevronRight className="h-4 w-4 ml-auto" />
              </Button>
            </CardContent>
          </Card>

          {/* Recent Sessions */}
          <Card className="border-0 shadow-lg lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="h-5 w-5" />
                    <span>Recent Sessions</span>
                  </CardTitle>
                  <CardDescription>Your latest mentoring activities</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentSessions.map((session, index) => (
                  <div key={session.id}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                            {session.studentName
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{session.studentName}</p>
                          <p className="text-sm text-gray-600">{session.subject}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center space-x-2">
                          <Badge
                            variant={
                              session.status === "completed"
                                ? "default"
                                : session.status === "upcoming"
                                  ? "secondary"
                                  : "destructive"
                            }
                            className="text-xs"
                          >
                            {session.status}
                          </Badge>
                          {session.rating && (
                            <div className="flex items-center space-x-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <span className="text-sm font-medium">{session.rating}</span>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(session.date)} • {session.duration}min
                        </p>
                      </div>
                    </div>
                    {index < recentSessions.length - 1 && <Separator className="mt-4" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Insights */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Award className="h-5 w-5" />
              <span>Performance Insights</span>
            </CardTitle>
            <CardDescription>Your mentoring impact and achievements</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 mb-2">{stats.averageRating}</div>
                <div className="flex justify-center mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${i < Math.floor(stats.averageRating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                    />
                  ))}
                </div>
                <p className="text-sm text-blue-700 font-medium">Average Rating</p>
              </div>

              <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600 mb-2">{stats.responseTime}</div>
                <MessageSquare className="h-6 w-6 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-green-700 font-medium">Response Time</p>
              </div>

              <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600 mb-2">{stats.completionRate}%</div>
                <Target className="h-6 w-6 text-purple-500 mx-auto mb-2" />
                <p className="text-sm text-purple-700 font-medium">Session Completion</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
