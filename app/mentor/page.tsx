"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import MentorHeader from "@/components/mentor/Header"
import { Footer } from "@/components/landing/Footer"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Calendar,
  Users,
  Star,
  CheckCircle,
  Settings,
  BarChart3,
  MessageSquare,
  MessageCircle,
  Bell,
  TrendingUp,
  Target,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import { MessageLearnerButtonWrapper as MessageLearnerButton } from "@/components/learners/MessageLearnerButtonWrapper"
import Image from "next/image"
import { CreditsIcon } from "@/components/ui/credits-icon"

interface DashboardStats {
  totalSessions: number
  monthlySessions: number
  totalEarnings: number
  averageRating: number
  upcomingCount: number
  completionRate: number
  profileCompleteness: number
  recentSessions: any[]
  recentReviews: any[]
  skills: any[]
  mentor: {
    name: string
    profilePicture?: string
    bio?: string
  }
}

interface MatchedLearner {
  id: number
  name: string
  profilePicture?: string
  bio?: string
  goals?: string
  experienceLevel?: string
  country?: string
  matchScore: number
  createdAt: string
}

const faqSections = [
  {
    title: "Communication & Boundaries",
    questions: [
      {
        question: "What are the platform guidelines for mentor-mentee communication?",
        answer:
          "Keep all communication professional, respectful, and focused on mentoring goals. Avoid sharing personal contact information outside the platform.",
      },
      {
        question: "How do I handle mentee requests outside my expertise area?",
        answer:
          "Politely decline and suggest they find a mentor who specializes in that area. You can recommend other mentors if appropriate.",
      },
      {
        question: "What should I do if a mentee becomes too dependent or demanding?",
        answer:
          "Set clear boundaries about session frequency and scope. Encourage independence and refer them to additional resources when needed.",
      },
      {
        question: "How do I maintain professional boundaries while being supportive?",
        answer:
          "Focus on professional development goals, maintain consistent communication standards, and avoid personal relationships outside mentoring.",
      },
    ],
  },
  {
    title: "Payment & Earnings",
    questions: [
      {
        question: "When do I receive payment after completing a session?",
        answer:
          "Payments are processed within 24-48 hours after session completion and transferred to your account according to your payout schedule.",
      },
      {
        question: "How do I update my rates or payment information?",
        answer:
          "Go to your Profile Settings to update hourly rates for each skill. Payment information can be updated in the Earnings section.",
      },
      {
        question: "What happens if a mentee disputes a session charge?",
        answer:
          "Our support team will review the dispute and session records. You'll be notified of the outcome and any necessary actions.",
      },
      {
        question: "How do I access my tax documents and earnings reports?",
        answer:
          "Tax documents and detailed earnings reports are available in your Earnings dashboard, typically by January 31st each year.",
      },
    ],
  },
  {
    title: "Profile & Visibility",
    questions: [
      {
        question: "How can I improve my profile visibility to attract more mentees?",
        answer:
          "Complete all profile sections, add a professional photo, write detailed skill descriptions, and maintain high session ratings.",
      },
      {
        question: "What are the best practices for mentor profile optimization?",
        answer:
          "Use clear, professional language, highlight specific achievements, include relevant keywords, and regularly update your availability.",
      },
      {
        question: "How do I update my expertise areas or availability schedule?",
        answer:
          "Access your Profile Settings to modify skills and expertise areas. Use the Availability tab to update your schedule and time zones.",
      },
      {
        question: "Can I temporarily pause my mentoring without losing my profile ranking?",
        answer:
          "Yes, use 'Vacation Mode' to temporarily hide your profile from new bookings while maintaining your ranking and existing relationships.",
      },
    ],
  },
]

export default function MentorDashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [matchedLearners, setMatchedLearners] = useState<MatchedLearner[]>([])
  const [openFaqSections, setOpenFaqSections] = useState<{ [key: string]: boolean }>({})
  const [currentLearnerIndex, setCurrentLearnerIndex] = useState(0)
  const [learnersLoading, setLearnersLoading] = useState(true)
  const [currentSessionIndex, setCurrentSessionIndex] = useState(0)
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0)

  useEffect(() => {
    async function checkSessionAndFetchData() {
      try {
        const sessionRes = await fetch("/api/auth/session")
        if (!sessionRes.ok) {
          if (sessionRes.status === 401) {
            toast.error("Unauthorized", {
              description: "Please log in to access the dashboard.",
            })
            router.push("/login")
          } else {
            throw new Error("Failed to fetch session")
          }
        }
        const sessionData = await sessionRes.json()
        if (!sessionData.user || sessionData.user.role !== "mentor") {
          toast.error("Unauthorized", {
            description: "You do not have permission to view this page.",
          })
          router.push(sessionData.user ? `/${sessionData.user.role}/dashboard` : "/login")
          return
        }

        // Fetch dashboard stats
        const statsRes = await fetch("/api/mentor/dashboard-stats")
        if (!statsRes.ok) {
          throw new Error("Failed to fetch dashboard stats")
        }
        const dashboardStats = await statsRes.json()
        setStats(dashboardStats)

        // Fetch matched learners
        try {
          const learnersRes = await fetch("/api/mentor/matched-learners")
          if (learnersRes.ok) {
            const learnersData = await learnersRes.json()
            // Debug log
            setMatchedLearners(learnersData.matchedLearners || [])
          } else {
            console.error("Failed to fetch matched learners:", learnersRes.status)
          }
        } catch (learnersError) {
          console.error("Error fetching matched learners:", learnersError)
        } finally {
          setLearnersLoading(false)
        }
      } catch (error) {
        console.error("Dashboard data fetch failed:", error)
        toast.error("Error", {
          description: "An unexpected error occurred while loading your dashboard.",
        })
        router.push("/login")
      } finally {
        setLoading(false)
      }
    }
    checkSessionAndFetchData()
  }, [router])

  const toggleFaqSection = (sectionTitle: string) => {
    setOpenFaqSections((prev) => ({
      ...prev,
      [sectionTitle]: !prev[sectionTitle],
    }))
  }

  const nextLearner = () => {
    setCurrentLearnerIndex((prev) => (prev + 2 >= matchedLearners.length ? 0 : prev + 2))
  }

  const prevLearner = () => {
    setCurrentLearnerIndex((prev) => (prev - 2 < 0 ? Math.max(0, matchedLearners.length - 2) : prev - 2))
  }

  const nextSession = () => {
    setCurrentSessionIndex((prev) => (prev + 2 >= stats!.recentSessions.length ? 0 : prev + 2))
  }

  const prevSession = () => {
    setCurrentSessionIndex((prev) => (prev - 2 < 0 ? Math.max(0, stats!.recentSessions.length - 2) : prev - 2))
  }

  const nextReview = () => {
    setCurrentReviewIndex((prev) => (prev + 3 >= stats!.recentReviews.length ? 0 : prev + 3))
  }

  const prevReview = () => {
    setCurrentReviewIndex((prev) => (prev - 3 < 0 ? Math.max(0, stats!.recentReviews.length - 3) : prev - 3))
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-white">
        <MentorHeader />
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
      <div className="flex flex-col min-h-screen bg-white">
        <MentorHeader />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center text-red-600 text-lg">Failed to load dashboard data</div>
        </main>
        <Footer />
      </div>
    )
  }

  const visibleLearners = matchedLearners.slice(currentLearnerIndex, currentLearnerIndex + 2)
  const visibleSessions = stats ? stats.recentSessions.slice(currentSessionIndex, currentSessionIndex + 2) : []

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <MentorHeader />

      {/* Hero Section */}
      <section className="bg-gray-900 text-white pt-20 pb-30">
        <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Welcome back, {stats.mentor.name.split(" ")[0]}</h1>

            <p className="text-xl text-purple-100 mb-8 max-w-2xl mx-auto">
              Connect with learners, earn credits, and grow as a mentor!
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-10 md:gap-2 pt-5 md:pt-0 mb-8 max-w-3xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-2">{stats.totalSessions}</div>
                <div className="text-purple-200 text-sm">Total Sessions</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-2">{stats.totalEarnings}</div>
                <div className="text-purple-200 text-sm">Credits Earned</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-2">{stats.averageRating || "N/A"}</div>
                <div className="text-purple-200 text-sm">Avg Rating</div>
              </div>
            </div>

          </motion.div>
        </div>
      </section>

      <main className="flex-1">

        {/* Recommended Learners */}
        <div className="bg-gray-50 py-20">
          <div className="container mx-auto px-4">
            <section>
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Recommended for you</h2>
            <p className="text-gray-600">Learners who match your expertise</p>
          </div>

          {learnersLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Finding matching learners...</p>
            </div>
          ) : matchedLearners.length > 0 ? (
            <div className="relative">
              {/* Navigation arrows */}
              {matchedLearners.length > 2 && (
                <>
                  <button
                    onClick={prevLearner}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white border border-gray-300 hover:bg-gray-50 shadow-lg transition-colors"
                  >
                    <ChevronLeft className="w-6 h-6 text-gray-600" />
                  </button>
                  <button
                    onClick={nextLearner}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white border border-gray-300 hover:bg-gray-50 shadow-lg transition-colors"
                  >
                    <ChevronRight className="w-6 h-6 text-gray-600" />
                  </button>
                </>
              )}

              {/* Learner cards carousel */}
              <div className="px-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {visibleLearners.map((learner, index) => (
                    <motion.div
                      key={learner.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="bg-white rounded-2xl border border-gray-200 p-8 shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col h-full"
                    >
                      <div className="flex items-start space-x-4 mb-4">
                        <Avatar className="w-16 h-16 border-2 border-gray-100">
                          <AvatarImage src={learner.profilePicture || "/default-avatar.png"} alt={learner.name} />
                          <AvatarFallback className="bg-purple-100 text-purple-600 text-lg font-semibold">
                            {learner.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gray-900 mb-1">{learner.name}</h3>
                          <p className="text-sm text-gray-600">
                            {learner.experienceLevel || "Beginner"} • {learner.country || "Global"}
                          </p>
                          <div className="flex items-center mt-2">
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${i < 4 ? "text-yellow-400 fill-current" : "text-gray-300"}`}
                                />
                              ))}
                            </div>
                            <span className="text-sm text-gray-600 ml-2">(New learner)</span>
                          </div>
                        </div>
                      </div>

                      <p className="text-gray-700 mb-6 line-clamp-3 flex-1">
                        {learner.bio || learner.goals || "Looking to learn new skills and grow professionally."}
                      </p>

                      <div className="flex items-center justify-end mt-auto">
                        <MessageLearnerButton
                          learnerUserId={learner.id}
                          learnerName={learner.name}
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Dot navigation */}
              {matchedLearners.length > 2 && (
                <div className="flex justify-center mt-8">
                  <div className="flex space-x-2">
                    {Array.from({ length: Math.ceil(matchedLearners.length / 2) }).map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentLearnerIndex(index * 2)}
                        className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                          Math.floor(currentLearnerIndex / 2) === index
                            ? "bg-purple-600 w-8"
                            : "bg-gray-300 hover:bg-gray-400"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No matching learners found</h3>
              <p className="text-gray-600 mb-4">
                Complete your profile with more skills to find learners who match your expertise.
              </p>
              <Link href="/mentor/settings">
                <Button className="bg-purple-600 hover:bg-purple-700">
                  <Settings className="w-4 h-4 mr-2" />
                  Update Profile
                </Button>
              </Link>
            </div>
          )}
            </section>
          </div>
        </div>

        {/* Performance Insights */}
        <div className="bg-white py-20">
          <div className="container mx-auto px-4">
            <section>
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Your Mentoring Impact This Month</h2>
            <p className="text-gray-600">Track your growth and achievements</p>
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
                <div className="text-5xl font-bold text-gray-900 mb-2">{stats.monthlySessions}</div>
                <div className="text-gray-600 font-medium">Sessions Completed</div>
                <div className="mt-3 text-sm text-purple-600 font-semibold">This Month</div>
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
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
                <div className="text-5xl font-bold text-gray-900 mb-2">{(stats.monthlySessions * 1.5).toFixed(1)}h</div>
                <div className="text-gray-600 font-medium">Hours Mentored</div>
                <div className="mt-3 text-sm text-blue-600 font-semibold">Total Time</div>
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
                  <Star className="w-6 h-6 text-green-600" />
                </div>
                <div className="text-5xl font-bold text-gray-900 mb-2">{stats.averageRating || "N/A"}</div>
                <div className="text-gray-600 font-medium">Average Rating</div>
                <div className="mt-3 text-sm text-green-600 font-semibold">Overall Score</div>
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
                <div className="text-5xl font-bold text-gray-900 mb-2">{stats.totalEarnings}</div>
                <div className="text-gray-600 font-medium">Credits Earned</div>
                <div className="mt-3 text-sm text-orange-600 font-semibold">Total Earned</div>
              </div>
            </motion.div>
          </div>
            </section>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-gray-50 py-20">
          <div className="container mx-auto px-4">
            <section>
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Recent Activity</h2>
            <p className="text-gray-600">Your latest mentoring sessions</p>
          </div>

          {stats.recentSessions.length > 0 ? (
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
                  {visibleSessions.map((session, index) => (
                    <motion.div
                      key={session.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="bg-white rounded-2xl border border-gray-200 p-8 shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      {/* Header with learner info */}
                      <div className="flex items-start justify-between mb-6 pb-6 border-b border-gray-100">
                        <div className="flex items-start space-x-4">
                          <Avatar className="w-16 h-16 border-2 border-gray-100">
                            <AvatarImage src={session.learnerProfilePicture || "/default-avatar.png"} alt={session.learnerName} />
                            <AvatarFallback className="bg-purple-100 text-purple-600 text-lg font-semibold">
                              {session.learnerName?.charAt(0) || "L"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <h3 className="text-2xl font-bold text-gray-900 mb-1">
                              {session.learnerName || "Learner"}
                            </h3>
                            <p className="text-sm text-gray-600 mb-2">
                              {session.learnerExperienceLevel || "Learner"} • {session.skillName || "General Mentoring"}
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
                          {session.status === "completed" && (
                            <div className="flex items-center space-x-1 text-green-600">
                              <CreditsIcon className="w-4 h-4" />
                              <span className="text-lg font-bold">+{session.earnedCredits}</span>
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
                            <p className="text-xs font-semibold text-purple-600 uppercase">Skill Taught</p>
                          </div>
                          <p className="text-sm font-semibold text-gray-900 pl-13">
                            {session.skillName || "General Mentoring"}
                          </p>
                        </div>

                        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                          <div className="flex items-center space-x-3 mb-2">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                              <Users className="w-5 h-5 text-blue-600" />
                            </div>
                            <p className="text-xs font-semibold text-blue-600 uppercase">Level</p>
                          </div>
                          <p className="text-sm font-semibold text-gray-900 pl-13">
                            {session.learnerExperienceLevel || "Beginner"}
                          </p>
                        </div>

                        {session.status === "completed" && (
                          <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                            <div className="flex items-center space-x-3 mb-2">
                              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                                <CreditsIcon className="w-5 h-5 text-green-600" />
                              </div>
                              <p className="text-xs font-semibold text-green-600 uppercase">Credits</p>
                            </div>
                            <p className="text-sm font-bold text-green-600 pl-13">
                              +{session.earnedCredits} earned
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Learner feedback/review */}
                      {(session.feedbackText || session.feedbackRating) && (
                        <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-6">
                          <div className="flex items-start space-x-3">
                            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                              <Star className="w-5 h-5 text-purple-600 fill-current" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-semibold text-gray-900">Learner Feedback</h4>
                                {session.feedbackRating && (
                                  <div className="flex items-center">
                                    {[...Array(5)].map((_, i) => (
                                      <Star
                                        key={i}
                                        className={`w-4 h-4 ${
                                          i < session.feedbackRating ? "text-yellow-400 fill-current" : "text-gray-300"
                                        }`}
                                      />
                                    ))}
                                    <span className="ml-2 text-sm font-bold text-gray-900">{session.feedbackRating}/5</span>
                                  </div>
                                )}
                              </div>
                              {session.feedbackText && (
                                <p className="text-sm text-gray-700 leading-relaxed italic">
                                  "{session.feedbackText}"
                                </p>
                              )}
                              {session.feedbackCreatedAt && (
                                <p className="text-xs text-gray-500 mt-2">
                                  {new Date(session.feedbackCreatedAt).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })}
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
                <Link href="/mentor/sessions">
                  <Button variant="outline" className="border-purple-600 text-purple-600 hover:bg-purple-50">
                    View All Sessions
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No recent sessions</p>
              <p className="text-sm text-gray-500 mt-2">Complete your profile to start receiving bookings</p>
            </div>
          )}
            </section>
          </div>
        </div>

        {/* Learner Reviews */}
        {stats.recentReviews && stats.recentReviews.length > 0 && (
          <div className="bg-white py-20">
            <div className="container mx-auto px-4">
              <section>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">What Learners Say</h2>
              <p className="text-gray-600">Recent reviews from your mentoring sessions</p>
            </div>

            <div className="relative">
              {stats.recentReviews.length > 3 && (
                <>
                  <button
                    onClick={prevReview}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white border border-gray-300 hover:bg-gray-50 shadow-lg transition-colors"
                  >
                    <ChevronLeft className="w-6 h-6 text-gray-600" />
                  </button>
                  <button
                    onClick={nextReview}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white border border-gray-300 hover:bg-gray-50 shadow-lg transition-colors"
                  >
                    <ChevronRight className="w-6 h-6 text-gray-600" />
                  </button>
                </>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-12">
                {stats.recentReviews.slice(currentReviewIndex, currentReviewIndex + 3).map((review, index) => (
                  <motion.div
                    key={review.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300"
                  >
                    <div className="flex items-center space-x-3 mb-4">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={review.learnerProfilePicture || "/default-avatar.png"} alt={review.learnerName} />
                        <AvatarFallback className="bg-purple-100 text-purple-600 font-semibold">
                          {review.learnerName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{review.learnerName}</h4>
                        <div className="flex items-center mt-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < review.rating ? "text-yellow-400 fill-current" : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-700 leading-relaxed mb-4 line-clamp-4">
                      "{review.reviewText}"
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(review.createdAt).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </motion.div>
                ))}
              </div>

              {stats.recentReviews.length > 3 && (
                <div className="flex justify-center mt-8">
                  <div className="flex space-x-2">
                    {Array.from({ length: Math.ceil(stats.recentReviews.length / 3) }).map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentReviewIndex(index * 3)}
                        className={`w-3 h-3 rounded-full transition-colors ${
                          Math.floor(currentReviewIndex / 3) === index ? "bg-purple-600" : "bg-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
              </section>
            </div>
          </div>
        )}

        {/* Tips for Success */}
        <div className="bg-gray-50 py-20">
          <div className="container mx-auto px-4">
            <section>
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Tips for Mentoring Success</h2>
            <p className="text-gray-600">Best practices to make the most impact</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="group bg-white rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2"
            >
              <div className="relative h-64 w-full overflow-hidden">
                <Image
                  src="/person-writing-goals-in-notebook-planning.jpg"
                  alt="Prepare for Sessions"
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <div className="w-14 h-14 bg-purple-600 rounded-2xl flex items-center justify-center mb-3 shadow-xl">
                    <Target className="w-7 h-7 text-white" />
                  </div>
                </div>
              </div>
              <div className="p-8">
                <h3 className="font-bold text-gray-900 mb-4 text-2xl">Prepare for Sessions</h3>
                <p className="text-gray-600 leading-relaxed text-base">
                  Review your mentee's goals and prepare relevant materials before each session. A well-prepared
                  mentor creates more valuable experiences and demonstrates commitment to their growth.
                </p>
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <span className="text-sm font-semibold text-purple-600">Key to Success</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="group bg-white rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2"
            >
              <div className="relative h-64 w-full overflow-hidden">
                <Image
                  src="/student-studying-with-laptop-and-books-preparation.jpg"
                  alt="Active Listening"
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mb-3 shadow-xl">
                    <MessageSquare className="w-7 h-7 text-white" />
                  </div>
                </div>
              </div>
              <div className="p-8">
                <h3 className="font-bold text-gray-900 mb-4 text-2xl">Practice Active Listening</h3>
                <p className="text-gray-600 leading-relaxed text-base">
                  Understand your mentee's challenges and aspirations deeply. Ask clarifying questions and provide
                  thoughtful, personalized guidance that addresses their unique situation.
                </p>
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <span className="text-sm font-semibold text-blue-600">Build Trust</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="group bg-white rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2"
            >
              <div className="relative h-64 w-full overflow-hidden">
                <Image
                  src="/person-coding-on-computer-taking-action-learning.jpg"
                  alt="Share Real Experience"
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <div className="w-14 h-14 bg-green-600 rounded-2xl flex items-center justify-center mb-3 shadow-xl">
                    <CheckCircle className="w-7 h-7 text-white" />
                  </div>
                </div>
              </div>
              <div className="p-8">
                <h3 className="font-bold text-gray-900 mb-4 text-2xl">Share Real Experience</h3>
                <p className="text-gray-600 leading-relaxed text-base">
                  Draw from your professional journey and real challenges you've faced. Real-world examples and lessons learned make mentoring
                  sessions more relatable and impactful for growth.
                </p>
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <span className="text-sm font-semibold text-green-600">Inspire Action</span>
                </div>
              </div>
            </motion.div>
          </div>
            </section>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-white py-20">
          <div className="container mx-auto px-4">
            <section>
          <div className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-8">Frequently Asked Questions</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {faqSections.map((section, sectionIndex) => (
                <div key={sectionIndex} className="space-y-4">
                  <Collapsible
                    open={openFaqSections[section.title]}
                    onOpenChange={() => toggleFaqSection(section.title)}
                  >
                    <CollapsibleTrigger className="cursor-pointer flex items-center justify-between w-full p-4">
                      <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
                      {openFaqSections[section.title] ? (
                        <ChevronUp className="w-5 h-5 text-gray-600" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-600" />
                      )}
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-4 mt-4">
                      {section.questions.map((faq, faqIndex) => (
                        <div key={faqIndex} className="p-4">
                          <h4 className="font-bold text-gray-900 mb-2">{faq.question}</h4>
                          <p className="text-gray-700">{faq.answer}</p>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              ))}
            </div>
          </div>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
