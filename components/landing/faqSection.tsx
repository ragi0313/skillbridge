"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useState } from "react"
import { Plus, Minus } from "lucide-react"

const faqs = [
  {
    question: "How does SkillBridge work?",
    answer: "SkillBridge connects you with verified industry mentors through 1-on-1 video sessions. Browse mentors by skill, book a session, and meet via our integrated video platform. It's that simple!"
  },
  {
    question: "How much does it cost?",
    answer: "Pricing varies by mentor based on their experience and expertise. Most sessions range from 300-800 credits (₱3,360-₱8,960) per hour. You can filter mentors by price to find the perfect fit for your budget."
  },
  {
    question: "What if I'm not satisfied with a session?",
    answer: "We guarantee your satisfaction. If you're not happy with a session, contact our support team within 24 hours and we'll either provide a refund or credit you for another session."
  },
  {
    question: "How do I become a mentor?",
    answer: "Click 'Become a Mentor', complete your application with your professional background, skills, and credentials. Our team reviews applications within 3-5 business days. Once approved, you can start earning!"
  },
  {
    question: "Is my payment information secure?",
    answer: "Absolutely. We use Xendit, a PCI DSS compliant payment processor trusted by major Philippine companies. All transactions are encrypted and your payment information is never stored on our servers."
  },
  {
    question: "Can I cancel or reschedule a session?",
    answer: "Yes! You can cancel or reschedule up to 24 hours before a session for a full refund. Cancellations within 24 hours may incur a cancellation fee, which goes to the mentor for their reserved time."
  },
  {
    question: "What technology do I need for sessions?",
    answer: "You just need a computer or mobile device with a camera, microphone, and stable internet connection. We use Agora for video calls - no software installation required, everything works in your browser."
  },
  {
    question: "How are mentors verified?",
    answer: "All mentors submit professional credentials, work history, and undergo background verification. We review portfolios, LinkedIn profiles, and may conduct interviews to ensure quality and authenticity."
  }
]

function FAQItem({ faq, index }: { faq: typeof faqs[0], index: number }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      className="border-b border-slate-200 last:border-b-0"
    >
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-6 flex items-center justify-between text-left group"
        whileHover={{ x: 5 }}
        transition={{ duration: 0.2 }}
      >
        <span className="text-lg font-semibold text-slate-900 group-hover:text-blue-600 transition-colors pr-8">
          {faq.question}
        </span>

        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
          className="flex-shrink-0"
        >
          {isOpen ? (
            <Minus className="w-6 h-6 text-blue-600" />
          ) : (
            <Plus className="w-6 h-6 text-slate-400 group-hover:text-blue-600 transition-colors" />
          )}
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <motion.p
              initial={{ y: -10 }}
              animate={{ y: 0 }}
              exit={{ y: -10 }}
              className="pb-6 text-slate-600 leading-relaxed"
            >
              {faq.answer}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export function FAQSection() {
  return (
    <section className="py-24 bg-gradient-to-br from-slate-50 to-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-gradient-to-bl from-blue-50 to-transparent opacity-50" />
      <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-gradient-to-tr from-purple-50 to-transparent opacity-50" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <motion.span
              initial={{ opacity: 0, scale: 0.5 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="inline-block px-4 py-2 bg-blue-100 text-blue-600 rounded-full text-sm font-semibold mb-4"
            >
              Got Questions?
            </motion.span>

            <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
              Frequently Asked <span className="text-blue-600">Questions</span>
            </h2>

            <p className="text-xl text-slate-600">
              Everything you need to know about SkillBridge
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="bg-white rounded-2xl shadow-xl p-8 md:p-12"
          >
            <div className="space-y-2">
              {faqs.map((faq, index) => (
                <FAQItem key={index} faq={faq} index={index} />
              ))}
            </div>
          </motion.div>

          {/* Still have questions CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="mt-12 text-center"
          >
            <p className="text-slate-600 mb-4">Still have questions?</p>
            <motion.a
              href="/support"
              className="inline-flex items-center text-blue-600 hover:text-blue-700 font-semibold"
              whileHover={{ x: 5 }}
              transition={{ duration: 0.2 }}
            >
              Contact our support team
              <motion.span
                className="ml-2"
                animate={{ x: [0, 5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                →
              </motion.span>
            </motion.a>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
