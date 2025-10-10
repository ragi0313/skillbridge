"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Search,
  BookOpen,
  Users,
  CreditCard,
  Settings,
  Video,
  Shield,
  TrendingUp,
  ChevronRight
} from "lucide-react"

interface FAQSectionProps {
  searchQuery: string
  onSearchChange: (query: string) => void
}

interface FAQItem {
  id: string
  question: string
  answer: string
  category: string
  tags: string[]
  helpful?: number
}

interface FAQCategory {
  id: string
  name: string
  icon: any
  color: string
  description: string
}

export default function FAQSection({ searchQuery, onSearchChange }: FAQSectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [helpfulVotes, setHelpfulVotes] = useState<Record<string, boolean>>({})

  const categories: FAQCategory[] = [
    {
      id: "getting-started",
      name: "Getting Started",
      icon: BookOpen,
      color: "bg-blue-50 text-blue-600 border-blue-200",
      description: "New to BridgeMentor? Start here"
    },
    {
      id: "mentoring",
      name: "Mentoring Sessions",
      icon: Video,
      color: "bg-green-50 text-green-600 border-green-200",
      description: "Everything about sessions and mentoring"
    },
    {
      id: "payments",
      name: "Payments & Credits",
      icon: CreditCard,
      color: "bg-purple-50 text-purple-600 border-purple-200",
      description: "Billing, credits, and payment issues"
    },
    {
      id: "account",
      name: "Account & Profile",
      icon: Users,
      color: "bg-orange-50 text-orange-600 border-orange-200",
      description: "Profile management and account settings"
    },
    {
      id: "technical",
      name: "Technical Support",
      icon: Settings,
      color: "bg-red-50 text-red-600 border-red-200",
      description: "Technical issues and troubleshooting"
    },
    {
      id: "policies",
      name: "Policies & Safety",
      icon: Shield,
      color: "bg-indigo-50 text-indigo-600 border-indigo-200",
      description: "Platform policies and safety guidelines"
    }
  ]

  const faqItems: FAQItem[] = [
    // Getting Started
    {
      id: "welcome",
      question: "How do I get started on BridgeMentor?",
      answer: "Welcome to BridgeMentor! Start by completing your profile, browsing mentors in your area of interest, and booking your first session. Check out our welcome guide for step-by-step instructions.",
      category: "getting-started",
      tags: ["onboarding", "profile", "first-time"]
    },
    {
      id: "roles",
      question: "What's the difference between mentors and learners?",
      answer: "Mentors are experienced professionals who teach and guide others. Learners are people seeking to develop new skills. You can be both - many users start as learners and become mentors as they grow.",
      category: "getting-started",
      tags: ["roles", "mentor", "learner"]
    },
    {
      id: "profile-setup",
      question: "How do I set up my profile?",
      answer: "Go to your Profile settings, add a professional photo, write a compelling bio, list your skills and experience, and set your availability. A complete profile attracts better connections.",
      category: "getting-started",
      tags: ["profile", "setup", "bio"]
    },

    // Mentoring Sessions
    {
      id: "booking",
      question: "How do I book a mentoring session?",
      answer: "Browse mentors, view their profiles and availability, select a time slot that works for you, choose the session duration, and confirm your booking. You'll receive a confirmation email with session details.",
      category: "mentoring",
      tags: ["booking", "schedule", "sessions"]
    },
    {
      id: "session-prep",
      question: "How should I prepare for my mentoring session?",
      answer: "Come prepared with specific questions or goals, test your video/audio setup beforehand, have any relevant materials ready, and be on time. Clear objectives lead to more productive sessions.",
      category: "mentoring",
      tags: ["preparation", "goals", "productivity"]
    },
    {
      id: "reschedule",
      question: "Can I reschedule or cancel a session?",
      answer: "Yes, you can reschedule or cancel sessions up to 24 hours in advance without penalty. Last-minute changes may result in credit charges. Check our cancellation policy for details.",
      category: "mentoring",
      tags: ["reschedule", "cancel", "policy"]
    },
    {
      id: "session-issues",
      question: "What if I experience technical issues during a session?",
      answer: "If you encounter technical problems, try refreshing your browser first. Contact support immediately if issues persist - we can provide partial refunds or reschedule the session.",
      category: "mentoring",
      tags: ["technical", "issues", "troubleshooting"]
    },

    // Payments & Credits
    {
      id: "credits-work",
      question: "How do credits work?",
      answer: "Credits are our virtual currency. You purchase credits to book sessions with mentors. Different mentors have different hourly rates. Unused credits don't expire and can be refunded under certain conditions.",
      category: "payments",
      tags: ["credits", "currency", "rates"]
    },
    {
      id: "payment-methods",
      question: "What payment methods do you accept?",
      answer: "We accept major credit cards (Visa, MasterCard, American Express), PayPal, and bank transfers in some regions. All payments are processed securely through our payment partners.",
      category: "payments",
      tags: ["payment", "credit-cards", "paypal"]
    },
    {
      id: "refunds",
      question: "What is your refund policy?",
      answer: "Credits can be refunded within 30 days if unused. Session refunds depend on our cancellation policy. Completed sessions are generally non-refundable unless there were technical issues.",
      category: "payments",
      tags: ["refunds", "policy", "cancellation"]
    },

    // Account & Profile
    {
      id: "change-email",
      question: "How do I change my email address?",
      answer: "Go to Account Settings → Personal Information, enter your new email, and verify it through the confirmation email. Your old email will remain active until verification is complete.",
      category: "account",
      tags: ["email", "settings", "verification"]
    },
    {
      id: "delete-account",
      question: "How do I delete my account?",
      answer: "Account deletion is permanent and irreversible. Go to Account Settings → Privacy & Security → Delete Account. Download your data first if needed. Active sessions must be completed before deletion.",
      category: "account",
      tags: ["delete", "permanent", "data"]
    },
    {
      id: "privacy",
      question: "How is my personal information protected?",
      answer: "We use industry-standard encryption, never share personal data without consent, and comply with privacy regulations. Read our Privacy Policy for complete details on data handling.",
      category: "account",
      tags: ["privacy", "security", "data-protection"]
    },

    // Technical Support
    {
      id: "browser-support",
      question: "Which browsers are supported?",
      answer: "We support the latest versions of Chrome, Firefox, Safari, and Edge. For the best experience, we recommend Chrome or Firefox with updated audio/video permissions enabled.",
      category: "technical",
      tags: ["browser", "compatibility", "requirements"]
    },
    {
      id: "video-issues",
      question: "My video/audio isn't working during sessions",
      answer: "Check your browser permissions for camera/microphone access, ensure no other apps are using your devices, test with our connection checker, and try closing other browser tabs.",
      category: "technical",
      tags: ["video", "audio", "permissions", "troubleshooting"]
    },
    {
      id: "mobile-app",
      question: "Is there a mobile app?",
      answer: "Currently, BridgeMentor works best on desktop/laptop browsers. We're developing mobile apps for iOS and Android. Mobile browsers have limited video session functionality.",
      category: "technical",
      tags: ["mobile", "app", "compatibility"]
    },

    // Policies & Safety
    {
      id: "community-guidelines",
      question: "What are the community guidelines?",
      answer: "Be respectful, professional, and constructive. No harassment, inappropriate content, or spam. Maintain confidentiality in sessions. Violations may result in account suspension or termination.",
      category: "policies",
      tags: ["guidelines", "conduct", "respectful"]
    },
    {
      id: "report-user",
      question: "How do I report inappropriate behavior?",
      answer: "Use the Report User button on profiles or during sessions, or contact support directly. We investigate all reports promptly and take appropriate action to maintain a safe environment.",
      category: "policies",
      tags: ["report", "safety", "inappropriate"]
    },
    {
      id: "dispute-resolution",
      question: "What if I have a dispute with a mentor/learner?",
      answer: "Try resolving issues directly first. If unsuccessful, contact our support team with details. We mediate disputes fairly and may provide refunds or account actions as appropriate.",
      category: "policies",
      tags: ["disputes", "mediation", "resolution"]
    },

    // Mentor-Specific FAQs
    {
      id: "become-mentor",
      question: "How do I become a mentor on BridgeMentor?",
      answer: "Click 'Sign Up as Mentor', complete your professional profile including experience, skills, and certifications. Our team reviews applications within 3-5 business days. You'll need a LinkedIn profile, professional experience, and clear expertise in your chosen skills.",
      category: "getting-started",
      tags: ["mentor", "application", "approval", "registration"]
    },
    {
      id: "mentor-earnings",
      question: "How do mentor earnings and payouts work?",
      answer: "You set your own hourly rate in credits. When learners book sessions, credits are held in escrow and transferred to your account after session completion. Request withdrawals anytime with a minimum balance. Payouts are processed within 5-7 business days via your preferred payment method.",
      category: "payments",
      tags: ["mentor", "earnings", "payout", "withdrawal", "money"]
    },
    {
      id: "mentor-approval-time",
      question: "How long does mentor approval take?",
      answer: "Most mentor applications are reviewed within 3-5 business days. You'll receive an email notification with the decision. If approved, you can immediately set up your profile and start accepting bookings. If more information is needed, we'll reach out directly.",
      category: "getting-started",
      tags: ["mentor", "approval", "verification", "waiting"]
    },
    {
      id: "set-mentor-rates",
      question: "How do I set my rates as a mentor?",
      answer: "During profile setup, you can set different hourly rates for different skills. Rates are in credits (learners purchase credits to book sessions). You can update your rates anytime from your mentor dashboard. Consider market rates and your experience level when pricing.",
      category: "mentoring",
      tags: ["mentor", "rates", "pricing", "credits"]
    },
    {
      id: "learner-no-show",
      question: "What happens if a learner doesn't show up to a session?",
      answer: "If a learner is more than 10 minutes late without notice, you can mark the session as a no-show. The learner will still be charged, and you'll receive the full session credits. Document no-shows by reporting through your session dashboard.",
      category: "mentoring",
      tags: ["mentor", "no-show", "late", "absent", "session"]
    },
    {
      id: "mentor-availability",
      question: "How do I manage my availability as a mentor?",
      answer: "Go to Mentor Dashboard → Availability Settings. Set your available hours for each day of the week, block specific dates for vacations, and set buffer time between sessions. Learners can only book slots you've marked as available.",
      category: "mentoring",
      tags: ["mentor", "availability", "schedule", "calendar"]
    },
    {
      id: "mentor-cancel-session",
      question: "Can mentors cancel or reschedule sessions?",
      answer: "Yes, but with restrictions. Cancellations more than 48 hours in advance have no penalty. Last-minute cancellations (less than 24 hours) may affect your rating and could result in compensation to the learner. Emergency cancellations should be reported to support immediately.",
      category: "mentoring",
      tags: ["mentor", "cancel", "reschedule", "policy"]
    },
    {
      id: "mentor-reviews",
      question: "How does the mentor review system work?",
      answer: "After each session, learners can rate you 1-5 stars and leave written feedback. Your average rating is displayed on your profile. Only verified session participants can leave reviews. You can respond to reviews professionally. Consistently low ratings may trigger a quality review.",
      category: "mentoring",
      tags: ["mentor", "reviews", "ratings", "feedback"]
    }
  ]

  const filteredFAQs = useMemo(() => {
    let filtered = faqItems

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(faq => faq.category === selectedCategory)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(faq =>
        faq.question.toLowerCase().includes(query) ||
        faq.answer.toLowerCase().includes(query) ||
        faq.tags.some(tag => tag.toLowerCase().includes(query))
      )
    }

    return filtered
  }, [selectedCategory, searchQuery])

  const markAsHelpful = (faqId: string) => {
    setHelpfulVotes(prev => ({
      ...prev,
      [faqId]: !prev[faqId]
    }))
  }

  const clearFilters = () => {
    setSelectedCategory(null)
    onSearchChange("")
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search frequently asked questions..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 h-12 text-lg"
        />
      </div>

      {/* Category Filter */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Browse by Category</h3>
          {(selectedCategory || searchQuery) && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear Filters
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => {
            const categoryFAQs = faqItems.filter(faq => faq.category === category.id)
            const isSelected = selectedCategory === category.id

            return (
              <Card
                key={category.id}
                className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                  isSelected ? `${category.color} ring-2 ring-current` : 'hover:scale-105'
                }`}
                onClick={() => setSelectedCategory(isSelected ? null : category.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <category.icon className="w-8 h-8" />
                    <div className="flex-1">
                      <h4 className="font-semibold">{category.name}</h4>
                      <p className="text-sm opacity-80">{category.description}</p>
                      <Badge variant="secondary" className="mt-1">
                        {categoryFAQs.length} articles
                      </Badge>
                    </div>
                    <ChevronRight className="w-5 h-5 opacity-60" />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* FAQ Results */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {selectedCategory
              ? `${categories.find(c => c.id === selectedCategory)?.name} Questions`
              : searchQuery
                ? `Search Results (${filteredFAQs.length})`
                : "Popular Questions"
            }
          </h3>
          {filteredFAQs.length > 0 && (
            <Badge variant="outline">
              {filteredFAQs.length} {filteredFAQs.length === 1 ? 'question' : 'questions'}
            </Badge>
          )}
        </div>

        {filteredFAQs.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Search className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">No results found</h3>
              <p className="text-gray-600 mb-4">
                Try different keywords or browse categories above
              </p>
              <Button variant="outline" onClick={clearFilters}>
                Clear Search
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Accordion type="single" collapsible className="space-y-4">
            {filteredFAQs.map((faq) => (
              <AccordionItem
                key={faq.id}
                value={faq.id}
                className="border rounded-lg px-6 py-2 bg-white shadow-sm"
              >
                <AccordionTrigger className="text-left hover:no-underline">
                  <div className="flex items-start justify-between w-full pr-4">
                    <span className="font-medium">{faq.question}</span>
                    <Badge variant="outline" className="ml-2 text-xs">
                      {categories.find(c => c.id === faq.category)?.name}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4 pb-6">
                  <div className="space-y-4">
                    <p className="text-gray-700 leading-relaxed">{faq.answer}</p>

                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="flex flex-wrap gap-2">
                        {faq.tags.map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">Was this helpful?</span>
                        <Button
                          variant={helpfulVotes[faq.id] ? "default" : "outline"}
                          size="sm"
                          onClick={() => markAsHelpful(faq.id)}
                          className="h-8 px-3"
                        >
                          👍 {helpfulVotes[faq.id] ? "Helpful" : "Yes"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>

      {/* Still Need Help */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-6 text-center">
          <h3 className="text-lg font-semibold mb-2">Still need help?</h3>
          <p className="text-gray-600 mb-4">
            Can't find what you're looking for? Our support team is here to help.
          </p>
          <div className="flex justify-center space-x-4">
            <Button onClick={() => window.location.href = '/support#tickets'}>
              Submit a Ticket
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/support#contact'}>
              Contact Support
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}