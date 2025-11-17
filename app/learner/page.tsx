"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import HeroSection from "@/components/learner/HeroSection"
import RecommendedMentors from "@/components/learner/RecommendedMentors"
import FAQSection from "@/components/learner/FAQSection"
import { LearnerHeader } from "@/components/learner/Header"
import { Footer } from "@/components/landing/Footer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Video, Calendar, Clock, Star, BookOpen, TrendingUp, ChevronLeft, ChevronRight, MessageSquare, Users } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import Image from "next/image"
import { motion } from "framer-motion"
import { CreditsIcon } from "@/components/ui/credits-icon"
import { SessionRatingModal } from "@/components/session/SessionRatingModal"

interface DashboardStats {
  learner: {
    name: string
    firstName: string
    profilePicture?: string
    creditsBalance: number
    learningGoals?: string
    experienceLevel?: string
  }
  stats: {
    totalSessions: number
    monthlySessions: number
    totalCreditsSpent: number
    totalHours: number
    creditsBalance: number
    upcomingCount: number
    pendingCount?: number
    confirmedCount?: number
    totalBookedSessions?: number
  }
  upcomingSessions: any[]
  recentSessions: any[]
}

export default function LearnerDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [currentSessionIndex, setCurrentSessionIndex] = useState(0)
  const [ratingModalOpen, setRatingModalOpen] = useState(false)
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null)

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const res = await fetch("/api/learner/dashboard-stats")
        if (!res.ok) {
          if (res.status === 401) {
            toast.error("Unauthorized", {
              description: "Please log in to access the dashboard.",
            })
            router.push("/login")
            return
          }
          throw new Error("Failed to fetch dashboard stats")
        }
        const data = await res.json()
        setStats(data)
      } catch (error) {
        console.error("Dashboard data fetch failed:", error)
        toast.error("Error", {
          description: "Failed to load dashboard data.",
        })
      } finally {
        setLoading(false)
      }
    }
    fetchDashboardData()
  }, [router])

  const nextSession = () => {
    if (stats && stats.recentSessions) {
      setCurrentSessionIndex((prev) => (prev + 2 >= stats.recentSessions.length ? 0 : prev + 2))
    }
  }

  const prevSession = () => {
    if (stats && stats.recentSessions) {
      setCurrentSessionIndex((prev) => (prev - 2 < 0 ? Math.max(0, stats.recentSessions.length - 2) : prev - 2))
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-white">
        <LearnerHeader />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-white">
        <LearnerHeader />
        <main className="">
          <HeroSection />
          <div className="bg-white py-20">
            <div className="container mx-auto px-4">
              <RecommendedMentors />
            </div>
          </div>
          <FAQSection />
          <Footer />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <LearnerHeader />
      <main className="">
        <HeroSection />

        {/* Recommended Mentors */}
        <div className="bg-white py-20">
          <div className="container mx-auto px-4">
            <RecommendedMentors />
          </div>
        </div>

        {/* Dashboard Stats */}
        <div className="bg-gray-50 py-20">
          <div className="container mx-auto px-4">
            <section>
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Your Learning Journey</h2>
                <p className="text-gray-600">Track your progress and achievements</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="relative bg-white rounded-2xl p-8 shadow-xl border-2 border-purple-100 hover:border-purple-300 hover:shadow-2xl transition-all duration-300 overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
                  <div className="relative z-10">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                      <Calendar className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="text-5xl font-bold text-gray-900 mb-2">{stats.stats.totalBookedSessions || stats.stats.totalSessions}</div>
                    <div className="text-gray-600 font-medium">Total Sessions Booked</div>
                    <div className="mt-3 text-sm text-purple-600 font-semibold">{stats.stats.totalSessions} Completed, {(stats.stats.pendingCount || 0) + (stats.stats.confirmedCount || 0)} Active</div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="relative bg-white rounded-2xl p-8 shadow-xl border-2 border-blue-100 hover:border-blue-300 hover:shadow-2xl transition-all duration-300 overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
                  <div className="relative z-10">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                      <Clock className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="text-5xl font-bold text-gray-900 mb-2">{stats.stats.totalHours.toFixed(1)}h</div>
                    <div className="text-gray-600 font-medium">Hours Learned</div>
                    <div className="mt-3 text-sm text-blue-600 font-semibold">Time Invested</div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="relative bg-white rounded-2xl p-8 shadow-xl border-2 border-green-100 hover:border-green-300 hover:shadow-2xl transition-all duration-300 overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
                  <div className="relative z-10">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                      <Calendar className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="text-5xl font-bold text-gray-900 mb-2">{stats.stats.upcomingCount || 0}</div>
                    <div className="text-gray-600 font-medium">Upcoming Sessions</div>
                    <div className="mt-3 text-sm text-green-600 font-semibold">Scheduled Soon</div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="relative bg-white rounded-2xl p-8 shadow-xl border-2 border-orange-100 hover:border-orange-300 hover:shadow-2xl transition-all duration-300 overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
                  <div className="relative z-10">
                    <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4">
                      <CreditsIcon className="w-6 h-6 text-orange-600" />
                    </div>
                    <div className="text-5xl font-bold text-gray-900 mb-2">{stats.stats.totalCreditsSpent}</div>
                    <div className="text-gray-600 font-medium">Credits Invested</div>
                    <div className="mt-3 text-sm text-orange-600 font-semibold">Total Spent</div>
                  </div>
                </motion.div>
              </div>
            </section>
          </div>
        </div>

        {stats.upcomingSessions.length > 0 && (
          <div className="bg-white py-20">
            <div className="container mx-auto px-4">
              <section>
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h2 className="text-3xl font-bold text-gray-900 mb-2">Upcoming Sessions</h2>
                      <p className="text-gray-600">Get ready for your next learning experience</p>
                    </div>
                    <Link href="/learner/sessions">
                      <Button variant="outline" size="sm">
                        View All
                      </Button>
                    </Link>
                  </div>

                  <div className="space-y-4">
                    {stats.upcomingSessions.map((session) => (
                      <div
                        key={session.id}
                        className="flex items-center justify-between p-6 bg-white rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all"
                      >
                        <div className="flex items-center space-x-4">
                          <Avatar className="w-14 h-14 ring-2 ring-purple-100">
                            <AvatarImage src={session.mentorProfilePictureUrl || "/placeholder.svg"} />
                            <AvatarFallback className="bg-purple-100 text-purple-600 text-lg font-semibold">
                              {session.mentorFirstName?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-semibold text-gray-900 text-lg">
                              {session.mentorFirstName} {session.mentorLastName}
                            </h3>
                            <p className="text-sm text-gray-600">{session.skillName}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            {new Date(session.scheduledDate).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-gray-600">
                            {session.startTime} - {session.endTime}
                          </p>
                        </div>
                        <Link href={`/sessions/${session.id}`}>
                          <Button size="lg" className="bg-purple-600 hover:bg-purple-700">
                            <Video className="w-4 h-4 mr-2" />
                            Join Session
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
        )}

        {/* Recent Activity */}
        {stats.recentSessions && stats.recentSessions.length > 0 && (
          <div className="bg-gray-50 py-20">
            <div className="container mx-auto px-4">
              <section>
                  <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">Recent Activity</h2>
                    <p className="text-gray-600">Your completed learning sessions</p>
                  </div>

                  <div className="relative px-12">
                    {/* Navigation arrows */}
                    {stats.recentSessions.length > 2 && (
                      <>
                        <button
                          onClick={prevSession}
                          className="absolute left-0 top-[35%] -translate-y-1/2 z-10 p-3 rounded-full bg-white border border-gray-300 hover:bg-gray-50 shadow-lg transition-colors"
                        >
                          <ChevronLeft className="w-6 h-6 text-gray-600" />
                        </button>
                        <button
                          onClick={nextSession}
                          className="absolute right-0 top-[35%] -translate-y-1/2 z-10 p-3 rounded-full bg-white border border-gray-300 hover:bg-gray-50 shadow-lg transition-colors"
                        >
                          <ChevronRight className="w-6 h-6 text-gray-600" />
                        </button>
                      </>
                    )}

                    {/* Session cards carousel */}
                    <div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {stats.recentSessions.slice(currentSessionIndex, currentSessionIndex + 2).map((session, index) => (
                          <motion.div
                            key={session.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3, delay: index * 0.1 }}
                            className="bg-white rounded-2xl border border-gray-200 p-8 shadow-lg hover:shadow-xl transition-all duration-300"
                          >
                            {/* Header with mentor info */}
                            <div className="flex items-start justify-between mb-6 pb-6 border-b border-gray-100">
                              <div className="flex items-start space-x-4">
                                <Avatar className="w-16 h-16 border-2 border-gray-100">
                                  <AvatarImage src={session.mentorProfilePictureUrl || "/default-avatar.png"} alt={`${session.mentorFirstName} ${session.mentorLastName}`} />
                                  <AvatarFallback className="bg-purple-100 text-purple-600 text-lg font-semibold">
                                    {session.mentorFirstName?.charAt(0) || "M"}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <h3 className="text-2xl font-bold text-gray-900 mb-1">
                                    {session.mentorFirstName} {session.mentorLastName}
                                  </h3>
                                  <p className="text-sm text-gray-600 mb-2">
                                    {session.mentorProfessionalTitle || "Mentor"} • {session.skillName || "General Mentoring"}
                                  </p>
                                  <div className="flex items-center space-x-2">
                                    <Calendar className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm text-gray-500">
                                      {new Date(session.scheduledDate).toLocaleDateString("en-US", {
                                        month: "long",
                                        day: "numeric",
                                        year: "numeric",
                                      })}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right space-y-2">
                                <Badge
                                  variant={session.status === "completed" ? "default" : "secondary"}
                                  className={`text-sm px-4 py-2 ${
                                    session.status === "completed"
                                      ? "bg-green-100 text-green-800"
                                      : session.status === "confirmed"
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-gray-100 text-gray-800"
                                  }`}
                                >
                                  {session.status}
                                </Badge>
                                {session.status === "completed" && session.totalCostCredits && (
                                  <div className="flex items-center space-x-1 text-orange-600">
                                    <CreditsIcon className="w-4 h-4" />
                                    <span className="text-lg font-bold">-{session.totalCostCredits}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Session details grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                              <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                                <div className="flex items-center space-x-3 mb-2">
                                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                                    <MessageSquare className="w-5 h-5 text-purple-600" />
                                  </div>
                                  <p className="text-xs font-semibold text-purple-600 uppercase">Skill Learned</p>
                                </div>
                                <p className="text-sm font-semibold text-gray-900 pl-13">
                                  {session.skillName || "General Mentoring"}
                                </p>
                              </div>

                              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                                <div className="flex items-center space-x-3 mb-2">
                                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                    <Clock className="w-5 h-5 text-blue-600" />
                                  </div>
                                  <p className="text-xs font-semibold text-blue-600 uppercase">Duration</p>
                                </div>
                                <p className="text-sm font-semibold text-gray-900 pl-13">
                                  {session.durationMinutes ? `${session.durationMinutes} min` : "N/A"}
                                </p>
                              </div>

                              {session.status === "completed" && session.totalCostCredits && (
                                <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                                  <div className="flex items-center space-x-3 mb-2">
                                    <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                                      <CreditsIcon className="w-5 h-5 text-orange-600" />
                                    </div>
                                    <p className="text-xs font-semibold text-orange-600 uppercase">Credits</p>
                                  </div>
                                  <p className="text-sm font-bold text-orange-600 pl-13">
                                    -{session.totalCostCredits} spent
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Rating section if completed */}
                            {session.status === "completed" && (
                              <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-6">
                                <div className="flex items-start space-x-3">
                                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                                    <Star className="w-5 h-5 text-purple-600 fill-current" />
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between mb-3">
                                      <h4 className="text-sm font-semibold text-gray-900">Your Review</h4>
                                      {session.reviewRating && (
                                        <div className="flex items-center">
                                          {[...Array(5)].map((_, i) => (
                                            <Star
                                              key={i}
                                              className={`w-4 h-4 ${
                                                i < session.reviewRating ? "text-yellow-400 fill-current" : "text-gray-300"
                                              }`}
                                            />
                                          ))}
                                          <span className="ml-2 text-sm font-bold text-gray-900">{session.reviewRating}/5</span>
                                        </div>
                                      )}
                                    </div>
                                    {!session.reviewRating ? (
                                      <Button
                                        size="sm"
                                        className="w-full bg-purple-600 hover:bg-purple-700"
                                        onClick={() => {
                                          setSelectedSessionId(session.id)
                                          setRatingModalOpen(true)
                                        }}
                                      >
                                        Rate Mentor
                                      </Button>
                                    ) : session.reviewText && (
                                      <p className="text-sm text-gray-700 leading-relaxed italic">
                                        "{session.reviewText}"
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    {/* Dot navigation */}
                    {stats.recentSessions.length > 2 && (
                      <div className="flex justify-center mt-8">
                        <div className="flex space-x-2">
                          {Array.from({ length: Math.ceil(stats.recentSessions.length / 2) }).map((_, index) => (
                            <button
                              key={index}
                              onClick={() => setCurrentSessionIndex(index * 2)}
                              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                                Math.floor(currentSessionIndex / 2) === index
                                  ? "bg-purple-600 w-8"
                                  : "bg-gray-300 hover:bg-gray-400"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* View all button */}
                    <div className="text-center pt-8">
                      <Link href="/learner/sessions">
                        <Button variant="outline" className="border-purple-600 text-purple-600 hover:bg-purple-50">
                          View All Sessions
                        </Button>
                      </Link>
                    </div>
                  </div>
                </section>
              </div>
            </div>
        )}

        <div className="bg-white py-20">
          <div className="container mx-auto px-4">
            <section>
                <div className="text-center mb-12">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">Tips for Success</h2>
                  <p className="text-gray-600">Make the most of your mentorship experience</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="bg-white rounded-2xl overflow-hidden hover:shadow-xl transition-shadow">
                    <div className="relative h-48 w-full">
                      <Image src="/person-writing-goals-in-notebook-planning.jpg" alt="Set Clear Goals" fill className="object-cover" />
                    </div>
                    <div className="p-8">
                      <h3 className="font-bold text-gray-900 mb-3 text-xl">Set Clear Goals</h3>
                      <p className="text-gray-600 leading-relaxed">
                        Define what you want to achieve before each session. Having specific objectives helps you and
                        your mentor make the most of your time together.
                      </p>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl overflow-hidden hover:shadow-xl transition-shadow">
                    <div className="relative h-48 w-full">
                      <Image src="/student-studying-with-laptop-and-books-preparation.jpg" alt="Come Prepared" fill className="object-cover" />
                    </div>
                    <div className="p-8">
                      <h3 className="font-bold text-gray-900 mb-3 text-xl">Come Prepared</h3>
                      <p className="text-gray-600 leading-relaxed">
                        Review materials and prepare questions in advance. The more prepared you are, the deeper and
                        more valuable your discussions will be.
                      </p>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl overflow-hidden hover:shadow-xl transition-shadow">
                    <div className="relative h-48 w-full">
                      <Image src="/person-coding-on-computer-taking-action-learning.jpg" alt="Take Action" fill className="object-cover" />
                    </div>
                    <div className="p-8">
                      <h3 className="font-bold text-gray-900 mb-3 text-xl">Take Action</h3>
                      <p className="text-gray-600 leading-relaxed">
                        Apply what you learn immediately after sessions. Practice and implementation are key to turning
                        knowledge into real skills.
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>

        <FAQSection />
        <Footer />
      </main>

      {/* Rating Modal */}
      {ratingModalOpen && selectedSessionId && (
        <SessionRatingModal
          sessionId={selectedSessionId}
          onClose={() => {
            setRatingModalOpen(false)
            setSelectedSessionId(null)
            // Refresh the dashboard data
            window.location.reload()
          }}
        />
      )}
    </div>
  )
}
