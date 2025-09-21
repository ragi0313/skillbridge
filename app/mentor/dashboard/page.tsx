"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import MentorHeader from "@/components/mentor/Header"
import Footer  from "@/components/landing/Footer"
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
import { MessageLearnerButton } from "@/components/learners/MessageLearnerButton"

interface DashboardStats {
  totalSessions: number
  monthlySessions: number
  totalEarnings: number
  averageRating: number
  upcomingCount: number
  completionRate: number
  profileCompleteness: number
  recentSessions: any[]
  skills: any[]
  mentor: {
    name: string
    profilePicture?: string
    bio?: string
  }
}

interface MatchedLearner {
  id: string
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
    title: "Session Management",
    questions: [
      {
        question: "How do I reschedule or cancel a confirmed session?",
        answer:
          "Go to your Sessions page, find the booking, and click 'Reschedule' or 'Cancel'. Mentees will be notified automatically of any changes.",
      },
      {
        question: "What should I do if a mentee doesn't show up for a scheduled session?",
        answer:
          "Wait 15 minutes, then mark the session as 'No Show' in your dashboard. You'll still receive payment according to our no-show policy.",
      },
      {
        question: "How do I extend a session if we need more time?",
        answer:
          "You can extend sessions by 15-30 minute increments through the session interface. Additional time will be charged at your hourly rate.",
      },
      {
        question: "Can I block specific time slots from my availability?",
        answer:
          "Yes, use the 'Block Time' feature in your availability settings to prevent bookings during specific periods.",
      },
    ],
  },
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
            console.log("Matched learners data:", learnersData) // Debug log
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

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-white">
        <MentorHeader />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <div className="text-gray-600 text-lg">Loading your dashboard...</div>
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

      <main className="flex-1 container mx-auto px-4 py-12">


        {/* Recommended Learners */}
        <section className="mb-16">
          <div className="bg-white p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Recommended for you</h2>
              {matchedLearners.length > 2 && (
                <div className="flex items-center space-x-2">
                  <button onClick={prevLearner} className="p-2 rounded-full border border-gray-300 hover:bg-gray-50">
                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  <button onClick={nextLearner} className="p-2 rounded-full border border-gray-300 hover:bg-gray-50">
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              )}
            </div>

            {learnersLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Finding matching learners...</p>
              </div>
            ) : matchedLearners.length > 0 ? (
              <>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {visibleLearners.map((learner) => (
                  <div key={learner.id} className="border border-gray-200 rounded-lg p-6 flex flex-col h-full">
                    <div className="flex items-start space-x-4 mb-4">
                      <Avatar className="w-16 h-16">
                        <AvatarImage src={learner.profilePicture || "/placeholder.svg"} alt={learner.name} />
                        <AvatarFallback className="bg-purple-100 text-purple-600 text-lg font-semibold">
                          {learner.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{learner.name}</h3>
                        <p className="text-sm text-gray-600">
                          {learner.experienceLevel || "Beginner"} • {learner.country || "Global"}
                        </p>
                        <div className="flex items-center mt-1">
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

                    <p className="text-gray-700 mb-4 line-clamp-3 flex-1">
                      {learner.bio || learner.goals || "Looking to learn new skills and grow professionally."}
                    </p>

                    <div className="flex items-center justify-end mt-auto">
                      <MessageLearnerButton
                        learnerUserId={learner.id}
                        learnerName={learner.name}
                      />
                    </div>
                  </div>
                ))}
              </div>

                {matchedLearners.length > 2 && (
                  <div className="flex justify-center mt-6">
                    <div className="flex space-x-2">
                      {Array.from({ length: Math.ceil(matchedLearners.length / 2) }).map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentLearnerIndex(index * 2)}
                          className={`w-3 h-3 rounded-full ${
                            Math.floor(currentLearnerIndex / 2) === index ? "bg-purple-600" : "bg-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
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
          </div>
        </section>

        {/* Recent Activity */}
        <section className="mb-16">
          <div className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-8">Recent Activity</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Latest Sessions</h3>
                <div className="space-y-4">
                  {stats.recentSessions.length > 0 ? (
                    stats.recentSessions.slice(0, 3).map((session, index) => (
                      <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium text-gray-900">
                            Session on {new Date(session.scheduledDate).toLocaleDateString()}
                          </p>
                          <Badge
                            variant={session.status === "completed" ? "default" : "secondary"}
                            className={
                              session.status === "completed"
                                ? "bg-purple-100 text-purple-800"
                                : "bg-gray-100 text-gray-800"
                            }
                          >
                            {session.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">Earned {session.earnedCredits} credits</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 text-lg">No recent sessions</p>
                      <p className="text-sm text-gray-500 mt-2">Complete your profile to start receiving bookings</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Platform Updates</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-start space-x-3">
                      <Bell className="w-5 h-5 text-purple-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-900">New messaging system coming soon</p>
                        <p className="text-sm text-gray-600 mt-1">
                          Enhanced communication tools will be available next month
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-purple-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-900">Profile optimization tips available</p>
                        <p className="text-sm text-gray-600 mt-1">
                          Check out our new guide to improve your mentor profile visibility
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-start space-x-3">
                      <Star className="w-5 h-5 text-purple-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-900">Mentor recognition program launched</p>
                        <p className="text-sm text-gray-600 mt-1">
                          Top-performing mentors will receive special badges and benefits
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Performance Insights */}
        <section className="mb-16">
          <div className="bg-gradient-to-r from-purple-600 to-blue-800 rounded-lg p-8 text-white shadow-sm">
            <h2 className="text-2xl font-bold mb-8">Your Mentoring Impact This Month</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
              <div className="text-center">
                <div className="text-3xl font-bold mb-2">{stats.monthlySessions}</div>
                <div className="text-purple-100">Sessions Completed</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold mb-2">{stats.monthlySessions * 1.5}h</div>
                <div className="text-purple-100">Hours Mentored</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold mb-2">{stats.averageRating || "N/A"}</div>
                <div className="text-purple-100">Satisfaction Rating</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold mb-2">{stats.totalEarnings}</div>
                <div className="text-purple-100">Revenue Generated</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/10 rounded-lg p-6 backdrop-blur-sm">
                <div className="flex items-center mb-3">
                  <TrendingUp className="w-6 h-6 mr-3" />
                  <span className="font-medium text-lg">Profile Views</span>
                </div>
                <p className="text-3xl font-bold mb-2">247</p>
                <p className="text-sm text-purple-100">+15% from last month</p>
              </div>

              <div className="bg-white/10 rounded-lg p-6 backdrop-blur-sm">
                <div className="flex items-center mb-3">
                  <Users className="w-6 h-6 mr-3" />
                  <span className="font-medium text-lg">Connection Requests</span>
                </div>
                <p className="text-3xl font-bold mb-2">12</p>
                <p className="text-sm text-purple-100">Pending responses</p>
              </div>

              <div className="bg-white/10 rounded-lg p-6 backdrop-blur-sm">
                <div className="flex items-center mb-3">
                  <Target className="w-6 h-6 mr-3" />
                  <span className="font-medium text-lg">Goal Progress</span>
                </div>
                <p className="text-3xl font-bold mb-2">78%</p>
                <p className="text-sm text-purple-100">Monthly target</p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="mb-16">
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
      </main>

      <Footer />
    </div>
  )
}
