import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Link from "next/link";

const faqs = [
  {
    question: "What is SkillBridge?",
    answer:
      "SkillBridge is a platform that connects students and early professionals with experienced freelancers and industry mentors for 1-on-1 mentorship sessions. It's designed to help you gain real-world skills, insights, and career guidance.",
  },
  {
    question: "Who are the mentors on SkillBridge?",
    answer:
      "Our mentors are verified freelancers and professionals from diverse industries. They have practical experience and are passionate about helping others grow.",
  },
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
  {
    question: "How do credits work on SkillBridge?",
    answer:
      "You purchase credits to book mentorship sessions. Each mentor sets their rate per session in credits. SkillBridge deducts 20% as a platform fee.",
  },
  {
    question: "Can I get a refund for unused credits?",
    answer:
      "Yes, SkillBridge will offer refunds for unused credits upon request. However, a small processing fee will be charged to cover transaction and administrative costs. Please review our Refund Policy for full details or contact support for assistance.",
  },
  {
    question: "Can I become a mentor someday?",
    answer:
      "Absolutely. Once you've gained enough experience, you can apply to become a mentor and start giving back to others in the community.",
  },
  {
    question: "Is SkillBridge free to use?",
    answer:
      "Creating a learner account is free. However, mentorship sessions require credits, which you can purchase as needed.",
  },
  {
    question: "What if I need help or support?",
    answer: "You can reach out to our support team via the Help Center or email us directly. We're here to assist you.",
  },
]

export default function FAQSection() {
  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
            <p className="text-gray-600 text-lg">Everything you need to know about SkillBridge and how it works</p>
          </div>

          {/* FAQ Accordion */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`} className="border-b border-gray-100 last:border-b-0">
                  <AccordionTrigger className="px-6 py-4 text-left hover:bg-gray-50 transition-colors">
                    <span className="font-medium text-gray-900 pr-4">{faq.question}</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-4 text-gray-700 leading-relaxed">{faq.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          {/* Contact Support */}
          <div className="text-center mt-8">
            <p className="text-gray-600">
              Still have questions?{" "}
              <Link href="/support" className="text-blue-600 hover:text-blue-700 font-medium hover:underline">
                Contact our support team
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
