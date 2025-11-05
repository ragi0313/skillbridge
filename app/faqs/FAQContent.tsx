'use client'

import { useState } from 'react'
import Link from 'next/link'
import UnifiedHeader from '@/components/UnifiedHeader'
import { Footer } from '@/components/landing/Footer'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronUp } from 'lucide-react'

interface FAQContentProps {
  session: { id: number; role: string } | null
}

const faqSections = [
  {
    title: "For Learners",
    questions: [
      {
        question: "How can I book a mentorship session?",
        answer: "After signing up and completing your profile, browse our list of mentors. You can filter by skill (e.g., React, Web Development) or industry. Once you find a mentor that fits your goals, choose an available time slot and book a session."
      },
      {
        question: "What kind of topics can I discuss in a session?",
        answer: "You can ask for help with specific projects, career advice, code reviews, freelancing tips, or learning paths. Just make sure to clearly communicate your goals before the session."
      },
      {
        question: "How do credits work on BridgeMentor?",
        answer: "You purchase credits to book mentorship sessions. Each mentor sets their rate per session in credits. BridgeMentor deducts 20% as a platform fee."
      },
      {
        question: "What happens if my mentor doesn't show up?",
        answer: "If your mentor doesn't show up for a scheduled session, you can request a refund through your session page. Our admin team will review your request and refund your credits if approved. You can also contact support to reschedule with the same mentor or find an alternative."
      },
      {
        question: "Can I request a refund for a completed session?",
        answer: "Yes, you can request a session refund if you experienced technical issues, quality problems, or if the mentor didn't show up. Visit your session page and submit a refund request with details. Our admin team will review it and refund credits to your account if approved."
      },
      {
        question: "Can I become a mentor someday?",
        answer: "Absolutely! Once you've gained enough experience, you can apply to become a mentor and start giving back to others in the community."
      }
    ]
  },
  {
    title: "For Mentors",
    questions: [
      {
        question: "How do I reschedule or cancel a confirmed session?",
        answer: "Go to your Sessions page, find the booking, and click 'Reschedule' or 'Cancel'. Mentees will be notified automatically of any changes."
      },
      {
        question: "What should I do if a mentee doesn't show up for a scheduled session?",
        answer: "Wait 15 minutes, then mark the session as 'No Show' in your dashboard. You'll still receive payment according to our no-show policy."
      },
      {
        question: "How do I extend a session if we need more time?",
        answer: "You can extend sessions by 15-30 minute increments through the session interface. Additional time will be charged at your hourly rate."
      },
      {
        question: "Can I block specific time slots from my availability?",
        answer: "Yes, use the 'Block Time' feature in your availability settings to prevent bookings during specific periods."
      },
      {
        question: "What are the platform guidelines for mentor-mentee communication?",
        answer: "Keep all communication professional, respectful, and focused on mentoring goals. Avoid sharing personal contact information outside the platform."
      },
      {
        question: "How do I handle mentee requests outside my expertise area?",
        answer: "Politely decline and suggest they find a mentor who specializes in that area. You can recommend other mentors if appropriate."
      },
      {
        question: "What should I do if a mentee becomes too dependent or demanding?",
        answer: "Set clear boundaries about session frequency and scope. Encourage independence and refer them to additional resources when needed."
      },
      {
        question: "How do I maintain professional boundaries while being supportive?",
        answer: "Focus on professional development goals, maintain consistent communication standards, and avoid personal relationships outside mentoring."
      },
      {
        question: "When do I receive payment after completing a session?",
        answer: "Payments are processed within 24-48 hours after session completion through our Xendit payment system and transferred to your registered bank account or e-wallet according to your payout schedule."
      },
      {
        question: "How do I update my rates or payment information?",
        answer: "Go to your Profile Settings to update hourly rates for each skill. Payment information (bank account, e-wallet details) can be updated in the Earnings section. All payout methods are securely processed through Xendit."
      },
      {
        question: "What happens if a mentee disputes a session charge?",
        answer: "Our support team will review the dispute and session records. You'll be notified of the outcome and any necessary actions."
      },
      {
        question: "How do I access my tax documents and earnings reports?",
        answer: "Tax documents and detailed earnings reports are available in your Earnings dashboard, typically by January 31st each year."
      },
      {
        question: "How can I improve my profile visibility to attract more mentees?",
        answer: "Complete all profile sections, add a professional photo, write detailed skill descriptions, and maintain high session ratings."
      },
      {
        question: "What are the best practices for mentor profile optimization?",
        answer: "Use clear, professional language, highlight specific achievements, include relevant keywords, and regularly update your availability."
      },
      {
        question: "How do I update my expertise areas or availability schedule?",
        answer: "Access your Profile Settings to modify skills and expertise areas. Use the Availability tab to update your schedule and time zones."
      },
      {
        question: "Can I temporarily pause my mentoring without losing my profile ranking?",
        answer: "Yes, use 'Vacation Mode' to temporarily hide your profile from new bookings while maintaining your ranking and existing relationships."
      }
    ]
  },
  {
    title: "BridgeMentor Platform",
    questions: [
      {
        question: "What is BridgeMentor?",
        answer: "BridgeMentor is a platform that connects students and early professionals with experienced freelancers and industry mentors for 1-on-1 mentorship sessions. It's designed to help you gain real-world skills, insights, and career guidance."
      },
      {
        question: "Who are the mentors on BridgeMentor?",
        answer: "Our mentors are verified freelancers and professionals from diverse industries. They have practical experience and are passionate about helping others grow."
      },
      {
        question: "Is BridgeMentor free to use?",
        answer: "Creating an account is free for both learners and mentors. However, mentorship sessions require payment, and mentors set their own hourly rates."
      },
      {
        question: "How does BridgeMentor ensure quality mentorship?",
        answer: "We verify all mentors through a screening process, collect feedback after each session, and maintain quality standards through our rating system and community guidelines."
      },
      {
        question: "What payment methods does BridgeMentor accept?",
        answer: "BridgeMentor accepts major credit cards (Visa, Mastercard, American Express), bank transfers, e-wallets, and other local payment methods through our secure Xendit payment gateway. All transactions are processed securely with bank-level encryption and PCI DSS compliance."
      },
      {
        question: "How does BridgeMentor protect user privacy and data?",
        answer: "We follow strict privacy policies and data protection standards. Personal information is encrypted and never shared with third parties without consent. Review our Privacy Policy for full details."
      },
      {
        question: "What if I need help or support?",
        answer: "You can reach out to our support team by emailing contact@bridge-mentor.com. We're here to assist you with any questions or issues."
      },
      {
        question: "How can I report inappropriate behavior or content?",
        answer: "Use the report feature available on user profiles and session pages, or contact our support team directly. We take all reports seriously and investigate promptly."
      }
    ]
  }
]

export default function FAQContent({ session }: FAQContentProps) {
  const [openFaqSections, setOpenFaqSections] = useState<{ [key: string]: boolean }>({})
  const [openQuestions, setOpenQuestions] = useState<{ [key: string]: boolean }>({})

  const toggleFaqSection = (sectionTitle: string) => {
    setOpenFaqSections(prev => ({
      ...prev,
      [sectionTitle]: !prev[sectionTitle]
    }))
  }

  const toggleQuestion = (questionId: string) => {
    setOpenQuestions(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }))
  }

  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader />

      <main className="py-16">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <header className="mb-16 text-center">
              <h1 className="text-5xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h1>
              <p className="text-lg text-gray-600">Everything you need to know about BridgeMentor and how it works</p>
            </header>

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
                          {section.questions.map((faq, faqIndex) => {
                            const questionId = `${sectionIndex}-${faqIndex}`
                            return (
                              <div key={faqIndex} className="border border-gray-200 rounded-lg">
                                <Collapsible
                                  open={openQuestions[questionId]}
                                  onOpenChange={() => toggleQuestion(questionId)}
                                >
                                  <CollapsibleTrigger className="cursor-pointer flex items-center justify-between w-full p-4 hover:bg-gray-50 transition-colors">
                                    <h4 className="font-medium text-gray-900 text-left">{faq.question}</h4>
                                    {openQuestions[questionId] ? (
                                      <ChevronUp className="w-4 h-4 text-gray-600 flex-shrink-0 ml-2" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4 text-gray-600 flex-shrink-0 ml-2" />
                                    )}
                                  </CollapsibleTrigger>
                                  <CollapsibleContent className="px-4 pb-4">
                                    <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
                                  </CollapsibleContent>
                                </Collapsible>
                              </div>
                            )
                          })}
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Contact Support */}
            <section className="mb-16">
              <div className="bg-blue-50 p-8 rounded-xl border border-blue-200 text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Can't find what you're looking for?</h3>
                <p className="text-gray-700 mb-6">
                  Our support team is here to help you with any questions or issues you might have.
                </p>
                <Link
                  href="/contact"
                  className="inline-block px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Contact Support
                </Link>
              </div>
            </section>

            {/* Related Links */}
            <div className="text-center">
              <p className="text-gray-600 mb-4">You might also find these helpful:</p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link
                  href="/terms-of-service"
                  className="inline-block px-6 py-3 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors font-medium"
                >
                  Terms of Service
                </Link>
                <Link
                  href="/privacy-policy"
                  className="inline-block px-6 py-3 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors font-medium"
                >
                  Privacy Policy
                </Link>
                <Link
                  href="/code-of-conduct"
                  className="inline-block px-6 py-3 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors font-medium"
                >
                  Code of Conduct
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}