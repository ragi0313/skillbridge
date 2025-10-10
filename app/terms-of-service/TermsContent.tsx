'use client'

import Link from 'next/link'
import UnifiedHeader from '@/components/UnifiedHeader'
import { Footer } from '@/components/landing/Footer'

interface TermsContentProps {
  session: { id: number; role: string } | null
}

export default function TermsContent({ session }: TermsContentProps) {
  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader />

      <main className="py-16">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <header className="mb-16">
              <h1 className="text-5xl font-bold text-gray-900 mb-6">Terms of Service</h1>
              <p className="text-lg text-gray-600">Last Updated: September 28, 2025</p>
            </header>

            <article className="space-y-12">
              <section className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">1. Agreement to Terms</h2>
                <p className="text-lg text-gray-700 leading-relaxed">
                  By accessing and using BridgeMentor ("we," "us," or "our"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
                </p>
              </section>

              <section className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">2. Description of Service</h2>
                <p className="text-lg text-gray-700 leading-relaxed">
                  BridgeMentor is an online platform that connects learners with professional mentors for skill development and career advancement. Our platform facilitates:
                </p>
                <ul className="space-y-2 text-gray-700 ml-4">
                  <li>• Mentor-learner matching based on skills and expertise</li>
                  <li>• Video conferencing for mentoring sessions</li>
                  <li>• Chat messaging between mentors and learners</li>
                  <li>• Payment processing for mentoring services</li>
                  <li>• Session scheduling and management</li>
                  <li>• Progress tracking and feedback systems</li>
                </ul>
              </section>

              <section className="space-y-8">
                <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">3. User Accounts and Registration</h2>

                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-gray-900">3.1 Account Creation</h3>
                  <ul className="space-y-2 text-gray-700 ml-4">
                    <li>• You must provide accurate, current, and complete information during registration</li>
                    <li>• You are responsible for maintaining the confidentiality of your account credentials</li>
                    <li>• You must be at least 18 years old to create an account</li>
                    <li>• One person may not maintain more than one active account</li>
                  </ul>
                </div>

                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-gray-900">3.2 Account Types</h3>
                  <ul className="space-y-2 text-gray-700 ml-4">
                    <li>• Learners: Individuals seeking mentorship and skill development</li>
                    <li>• Mentors: Qualified professionals offering mentorship services</li>
                    <li>• Administrators: Platform administrators with elevated privileges</li>
                  </ul>
                </div>

                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-gray-900">3.3 Account Verification</h3>
                  <ul className="space-y-2 text-gray-700 ml-4">
                    <li>• Mentors must complete a verification process including background checks where applicable</li>
                    <li>• We reserve the right to verify any information provided during registration</li>
                    <li>• Failure to provide accurate information may result in account suspension or termination</li>
                  </ul>
                </div>
              </section>

              <section className="space-y-8">
                <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">4. User Conduct and Prohibited Activities</h2>

                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-gray-900">4.1 Acceptable Use</h3>
                  <p className="text-lg text-gray-700 leading-relaxed">Users must:</p>
                  <ul className="space-y-2 text-gray-700 ml-4">
                    <li>• Treat all platform members with respect and professionalism</li>
                    <li>• Use the platform only for its intended learning and mentoring purposes</li>
                    <li>• Maintain appropriate conduct during video sessions and chat communications</li>
                    <li>• Respect intellectual property rights</li>
                    <li>• Comply with all applicable laws and regulations</li>
                  </ul>
                </div>

                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-gray-900">4.2 Prohibited Activities</h3>
                  <p className="text-lg text-gray-700 leading-relaxed">Users may not:</p>
                  <ul className="space-y-2 text-gray-700 ml-4">
                    <li>• Harass, abuse, or threaten other users</li>
                    <li>• Share inappropriate, offensive, or illegal content</li>
                    <li>• Attempt to bypass payment systems or engage in fraudulent activities</li>
                    <li>• Share contact information to circumvent platform fees</li>
                    <li>• Upload malware, viruses, or other harmful code</li>
                    <li>• Impersonate another person or entity</li>
                    <li>• Scrape or harvest user data without permission</li>
                    <li>• Use the platform for commercial solicitation unrelated to mentoring</li>
                  </ul>
                </div>
              </section>

              <section className="space-y-8">
                <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">5. Payment Terms</h2>

                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-gray-900">5.1 Payment Processing</h3>
                  <ul className="space-y-2 text-gray-700 ml-4">
                    <li>• All payments are processed securely through our third-party payment processor (Xendit)</li>
                    <li>• Learners pay for mentoring sessions in advance through the platform</li>
                    <li>• Platform fees are automatically deducted from mentor earnings</li>
                  </ul>
                </div>

                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-gray-900">5.2 Refunds and Cancellations</h3>
                  <ul className="space-y-2 text-gray-700 ml-4">
                    <li>• Cancellations made more than 24 hours in advance are eligible for full refund</li>
                    <li>• Cancellations made less than 24 hours in advance may be subject to cancellation fees</li>
                    <li>• No-shows are generally not eligible for refunds</li>
                    <li>• Disputed sessions will be reviewed on a case-by-case basis</li>
                  </ul>
                </div>
              </section>

              <section className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">6. Privacy and Data Protection</h2>
                <p className="text-lg text-gray-700 leading-relaxed">
                  Your privacy is important to us and protected under Philippine law. We comply with the Data Privacy Act of 2012 (Republic Act No. 10173). Please review our <Link href="/privacy-policy" className="text-blue-600 hover:text-blue-800">Privacy Policy</Link> to understand how we collect, use, and protect your personal information in accordance with Philippine regulations.
                </p>
              </section>

              <section className="space-y-8">
                <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">7. Intellectual Property</h2>

                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-gray-900">7.1 Platform Rights</h3>
                  <ul className="space-y-2 text-gray-700 ml-4">
                    <li>• BridgeMentor owns all rights to the platform software, design, and branding</li>
                    <li>• Users may not copy, modify, or reverse-engineer platform technology</li>
                    <li>• Our trademarks and logos may not be used without explicit permission</li>
                  </ul>
                </div>

                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-gray-900">7.2 User Content</h3>
                  <ul className="space-y-2 text-gray-700 ml-4">
                    <li>• Users retain ownership of their original content</li>
                    <li>• By posting content, users grant BridgeMentor a non-exclusive license to use, display, and distribute the content on the platform</li>
                    <li>• Users represent that they have all necessary rights to the content they share</li>
                  </ul>
                </div>
              </section>

              <section className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">8. Limitation of Liability</h2>
                <p className="text-lg text-gray-700 leading-relaxed">
                  Our liability is limited to the amount paid by the user in the preceding 12 months, subject to applicable Philippine consumer protection laws. We are not liable for indirect, incidental, or consequential damages. Liability limitations are subject to Philippine law including the Consumer Act of the Philippines.
                </p>
              </section>

              <section className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">9. Account Termination</h2>
                <p className="text-lg text-gray-700 leading-relaxed">
                  We may terminate accounts for violation of these terms, fraudulent activity, or other reasons outlined in the full terms. Users may terminate their accounts at any time through account settings.
                </p>
              </section>

              <section className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">10. Contact Information</h2>
                <p className="text-lg text-gray-700 leading-relaxed">
                  For questions about these Terms of Service, please contact us at:
                </p>
                <div className="bg-gray-50 p-6 rounded-lg">
                  <p className="text-gray-700">
                    <strong>Email:</strong> bridgementor@gmail.com<br />
                  </p>
                </div>
              </section>

              <div className="mt-12 p-6 bg-blue-50 rounded-xl border border-blue-200">
                <p className="text-blue-800 font-semibold text-lg text-center">
                  By using BridgeMentor, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
                </p>
              </div>

              <div className="mt-8 text-center">
                <Link
                  href="/privacy-policy"
                  className="inline-block px-6 py-3 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors mr-4 font-medium"
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
            </article>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}