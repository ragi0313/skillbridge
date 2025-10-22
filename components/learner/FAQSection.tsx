"use client"

import { useState } from "react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronUp } from "lucide-react"
import Link from "next/link"

const faqSections = [
  {
    title: "Getting Started",
    questions: [
      {
        question: "What is BridgeMentor?",
        answer:
          "BridgeMentor is a platform that connects students and early professionals with experienced freelancers and industry mentors for 1-on-1 mentorship sessions. It's designed to help you gain real-world skills, insights, and career guidance.",
      },
      {
        question: "Who are the mentors on BridgeMentor?",
        answer:
          "Our mentors are verified freelancers and professionals from diverse industries. They have practical experience and are passionate about helping others grow.",
      },
      {
        question: "Is BridgeMentor free to use?",
        answer:
          "Creating a learner account is free. However, mentorship sessions require credits, which you can purchase as needed.",
      },
    ],
  },
  {
    title: "Booking Sessions",
    questions: [
      {
        question: "How can I book a mentorship session?",
        answer:
          "After signing up and completing your profile, browse our list of mentors. You can filter by skill (e.g., React, Web Development) or industry. Once you find a mentor that fits your goals, choose an available time slot and book a session.",
      },
      {
        question: "What kind of topics can I discuss in a session?",
        answer:
          "You can ask for help with specific projects, career advice, code reviews, freelancing tips, or learning paths. Just make sure to clearly communicate your goals before the session.",
      },
    ],
  },
  {
    title: "Credits & Payment",
    questions: [
      {
        question: "How do credits work on BridgeMentor?",
        answer:
          "You purchase credits to book mentorship sessions. Each mentor sets their rate per session in credits. BridgeMentor deducts 20% as a platform fee.",
      },
      {
        question: "Can I get a refund for unused credits?",
        answer:
          "Yes, BridgeMentor will offer refunds for unused credits upon request. However, a small processing fee will be charged to cover transaction and administrative costs. Please review our Refund Policy for full details or contact support for assistance.",
      },
    ],
  },
  {
    title: "Support & Growth",
    questions: [
      {
        question: "Can I become a mentor someday?",
        answer:
          "Absolutely. Once you've gained enough experience, you can apply to become a mentor and start giving back to others in the community.",
      },
      {
        question: "What if I need help or support?",
        answer: "You can reach out to our support team via the Help Center or email us directly. We're here to assist you.",
      },
    ],
  },
]

export default function FAQSection() {
  const [openFaqSections, setOpenFaqSections] = useState<{ [key: string]: boolean }>({})

  const toggleFaqSection = (sectionTitle: string) => {
    setOpenFaqSections((prev) => ({
      ...prev,
      [sectionTitle]: !prev[sectionTitle],
    }))
  }

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="p-8">
          {/* Section Header */}
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Frequently Asked Questions</h2>
            <p className="text-gray-600">Everything you need to know about BridgeMentor</p>
          </div>

          {/* FAQ Grid */}
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

          {/* Contact Support */}
          <div className="text-center mt-8">
            <p className="text-gray-600">
              Still have questions?{" "}
              <Link href="/contact" className="text-blue-600 hover:text-blue-700 font-medium hover:underline">
                Contact our support team
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
