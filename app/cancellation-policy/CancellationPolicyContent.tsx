'use client'

import Link from 'next/link'
import UnifiedHeader from '@/components/UnifiedHeader'
import { Footer } from '@/components/landing/Footer'

interface CancellationPolicyContentProps {
  session: { id: number; role: string } | null
}

export default function CancellationPolicyContent({ session }: CancellationPolicyContentProps) {
  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader />

      <main className="py-16">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <header className="mb-16">
              <h1 className="text-5xl font-bold text-gray-900 mb-6">Cancellation Policy</h1>
              <p className="text-lg text-gray-600">Last Updated: November 18, 2025</p>
            </header>

            <article className="space-y-12">
              <section className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">1. Overview</h2>
                <p className="text-lg text-gray-700 leading-relaxed">
                  At BridgeMentor, we understand that circumstances change. This Cancellation Policy outlines the rules and procedures for canceling mentoring sessions, the associated refund policies, and the responsibilities of both learners and mentors.
                </p>
              </section>

              <section className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">2. Session Cancellation by Learners</h2>

                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-800">2.1 Cancellation Timeframes</h3>
                  <ul className="space-y-3 text-gray-700 ml-4">
                    <li><strong>24+ Hours Before Session:</strong> Full refund of credits to your account</li>
                    <li><strong>12-24 Hours Before Session:</strong> 50% refund of credits to your account</li>
                    <li><strong>Less than 12 Hours Before Session:</strong> No refund</li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-800">2.2 How to Cancel</h3>
                  <p className="text-lg text-gray-700 leading-relaxed">
                    To cancel a session, navigate to your Sessions page, select the session you wish to cancel, and click the "Cancel Session" button. You will receive a confirmation email once the cancellation is processed.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-800">2.3 No-Show Policy</h3>
                  <p className="text-lg text-gray-700 leading-relaxed">
                    If you fail to attend a scheduled session without prior cancellation, this will be considered a "no-show" and you will not receive a refund. Repeated no-shows may result in restrictions on your account.
                  </p>
                </div>
              </section>

              <section className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">3. Session Cancellation by Mentors</h2>

                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-800">3.1 Mentor-Initiated Cancellations</h3>
                  <p className="text-lg text-gray-700 leading-relaxed">
                    If a mentor needs to cancel a session, they should do so as early as possible. Learners will receive a full refund of credits for any mentor-initiated cancellation, regardless of timing.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-800">3.2 Mentor No-Show Policy</h3>
                  <p className="text-lg text-gray-700 leading-relaxed">
                    If a mentor fails to show up for a scheduled session without prior notice, the learner will receive a full refund plus an additional 25% credit bonus as compensation. The mentor may face account restrictions for repeated no-shows.
                  </p>
                </div>
              </section>

              <section className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">4. Emergency Cancellations</h2>
                <p className="text-lg text-gray-700 leading-relaxed">
                  In case of genuine emergencies (medical emergencies, natural disasters, etc.), exceptions to the standard cancellation policy may be granted on a case-by-case basis. Please contact our support team at <a href="mailto:support@bridgementor.com" className="text-blue-600 hover:underline">support@bridgementor.com</a> with appropriate documentation.
                </p>
              </section>

              <section className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">5. Technical Issues</h2>

                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-800">5.1 Platform Downtime</h3>
                  <p className="text-lg text-gray-700 leading-relaxed">
                    If a session cannot be completed due to technical issues on BridgeMentor's platform, the session will be rescheduled at no additional cost or a full refund will be issued, at the learner's preference.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-800">5.2 User Technical Issues</h3>
                  <p className="text-lg text-gray-700 leading-relaxed">
                    If technical issues arise from the user's end (internet connectivity, hardware issues, etc.), standard cancellation policies apply. However, mentors and learners are encouraged to work together to reschedule when possible.
                  </p>
                </div>
              </section>

              <section className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">6. Refund Processing</h2>

                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-800">6.1 Credit Refunds</h3>
                  <p className="text-lg text-gray-700 leading-relaxed">
                    Refunds are processed as credits returned to your BridgeMentor account. Credits are typically restored within 24-48 hours of cancellation approval.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-800">6.2 Monetary Refunds</h3>
                  <p className="text-lg text-gray-700 leading-relaxed">
                    If you prefer a monetary refund to your original payment method, please contact our support team. Monetary refunds may take 5-10 business days to process and are subject to a 10% processing fee.
                  </p>
                </div>
              </section>

              <section className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">7. Rescheduling Sessions</h2>
                <p className="text-lg text-gray-700 leading-relaxed">
                  Instead of canceling, we encourage users to reschedule sessions when possible. Both mentors and learners can propose alternative times through the platform's messaging system. Rescheduled sessions do not incur any penalties or fees.
                </p>
              </section>

              <section className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">8. Subscription Cancellations</h2>
                <p className="text-lg text-gray-700 leading-relaxed">
                  If you have a subscription plan, you may cancel at any time. Your subscription will remain active until the end of your current billing period, after which it will not renew. Partial month refunds are not provided for subscription cancellations.
                </p>
              </section>

              <section className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">9. Disputes and Appeals</h2>
                <p className="text-lg text-gray-700 leading-relaxed">
                  If you disagree with a cancellation decision or believe there are extenuating circumstances, you may submit an appeal through our support ticket system. Our team will review your case within 3-5 business days and provide a final decision.
                </p>
              </section>

              <section className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">10. Policy Updates</h2>
                <p className="text-lg text-gray-700 leading-relaxed">
                  BridgeMentor reserves the right to update this Cancellation Policy at any time. Changes will be posted on this page with an updated "Last Updated" date. Continued use of the platform after changes constitutes acceptance of the new policy.
                </p>
              </section>

              <section className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">11. Contact Us</h2>
                <p className="text-lg text-gray-700 leading-relaxed">
                  If you have questions about this Cancellation Policy, please contact us at:
                </p>
                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                  <p className="text-gray-700 mb-2"><strong>Email:</strong> <a href="mailto:support@bridgementor.com" className="text-blue-600 hover:underline">support@bridgementor.com</a></p>
                  <p className="text-gray-700"><strong>Support Hours:</strong> Monday - Friday, 9:00 AM - 6:00 PM (PST)</p>
                </div>
              </section>

              <section className="mt-12 p-6 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-gray-700">
                  <strong>Note:</strong> This Cancellation Policy is part of our <Link href="/terms-of-service" className="text-blue-600 hover:underline font-medium">Terms of Service</Link>. By using BridgeMentor, you agree to comply with both policies.
                </p>
              </section>
            </article>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
