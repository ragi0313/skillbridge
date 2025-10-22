'use client'

import Link from 'next/link'
import UnifiedHeader from '@/components/UnifiedHeader'
import { Footer } from '@/components/landing/Footer'

interface PrivacyContentProps {
  session: { id: number; role: string } | null
}

export default function PrivacyContent({ session }: PrivacyContentProps) {
  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader />

      <main className="py-16">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <header className="mb-16">
              <h1 className="text-5xl font-bold text-gray-900 mb-6">Privacy Policy</h1>
              <p className="text-lg text-gray-600">Last Updated: September 28, 2025</p>
            </header>

            <article className="space-y-12">
              <section className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">Introduction</h2>
                <p className="text-lg text-gray-700 leading-relaxed">
                  BridgeMentor is committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mentoring platform and related services.
                </p>
                <p className="text-lg text-gray-700 leading-relaxed">
                  By using BridgeMentor, you consent to the data practices described in this Privacy Policy. This policy complies with the Philippine Data Privacy Act of 2012 (Republic Act No. 10173) and National Privacy Commission regulations. If you do not agree with the practices described here, please do not use our services.
                </p>
              </section>

              <section className="space-y-8">
                <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">Information We Collect</h2>

                <div className="space-y-8">
                  <h3 className="text-lg font-bold text-gray-900">Information We Collect from Learners</h3>

                  <div className="space-y-4">
                    <h4 className="text-base font-bold text-gray-900">Basic Registration Information</h4>
                    <ul className="space-y-2 text-gray-700 ml-4">
                      <li>• Personal details: First name, last name, email address</li>
                      <li>• Location and timezone: Country and timezone for scheduling</li>
                      <li>• Account security: Password and authentication credentials</li>
                    </ul>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-base font-bold text-gray-900">Learning Information</h4>
                    <ul className="space-y-2 text-gray-700 ml-4">
                      <li>• Learning goals: Areas of interest and skill development objectives</li>
                      <li>• Experience level: Current proficiency in areas of learning</li>
                      <li>• Session notes and progress: Information created during mentoring sessions</li>
                      <li>• Reviews and feedback: Ratings and reviews provided for mentors</li>
                    </ul>
                  </div>
                </div>

                <div className="space-y-8">
                  <h3 className="text-lg font-bold text-gray-900">Information We Collect from Mentors</h3>

                  <div className="space-y-4">
                    <h4 className="text-base font-bold text-gray-900">Basic Registration Information</h4>
                    <ul className="space-y-2 text-gray-700 ml-4">
                      <li>• Personal details: First name, last name, email address, gender</li>
                      <li>• Profile picture: Photo for mentor profile display</li>
                      <li>• Location and timezone: Country and timezone for scheduling</li>
                      <li>• Languages: Languages spoken for communication preferences</li>
                      <li>• Account security: Password and authentication credentials</li>
                    </ul>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-base font-bold text-gray-900">Professional Information</h4>
                    <ul className="space-y-2 text-gray-700 ml-4">
                      <li>• Professional title: Current job title or role</li>
                      <li>• Biography: Professional background and experience summary</li>
                      <li>• Years of experience: Total professional experience in field</li>
                      <li>• LinkedIn profile: Professional social media profile</li>
                      <li>• Portfolio attachments: Work samples and certifications</li>
                    </ul>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-base font-bold text-gray-900">Skills and Service Information</h4>
                    <ul className="space-y-2 text-gray-700 ml-4">
                      <li>• Skills and expertise: Areas of specialization and proficiency</li>
                      <li>• Hourly rates: Pricing for different skills and services</li>
                      <li>• Availability schedule: Days and times available for mentoring</li>
                      <li>• Motivational information: Reasons for mentoring and achievements</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section className="space-y-8">
                <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">How We Use Your Information</h2>

                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-gray-900">Core Platform Services</h3>
                  <ul className="space-y-2 text-gray-700 ml-4">
                    <li>• Creating and maintaining user accounts</li>
                    <li>• Connecting learners with appropriate mentors</li>
                    <li>• Facilitating mentoring sessions and communications</li>
                    <li>• Processing payments and managing transactions</li>
                    <li>• Providing customer support and technical assistance</li>
                  </ul>
                </div>

                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-gray-900">Platform Improvement</h3>
                  <ul className="space-y-2 text-gray-700 ml-4">
                    <li>• Analyzing usage patterns to improve user experience</li>
                    <li>• Developing new features and functionality</li>
                    <li>• Ensuring platform security and preventing fraud</li>
                    <li>• Conducting research on learning effectiveness</li>
                  </ul>
                </div>
              </section>

              <section className="space-y-8">
                <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">Information Sharing</h2>

                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-gray-900">With Other Users</h3>
                  <ul className="space-y-2 text-gray-700 ml-4">
                    <li>• Basic profile information for mentor-learner matching</li>
                    <li>• Session notes and feedback between matched users</li>
                    <li>• Reviews and ratings to maintain platform quality</li>
                  </ul>
                </div>

                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-gray-900">With Service Providers</h3>
                  <ul className="space-y-2 text-gray-700 ml-4">
                    <li>• Cloud hosting providers for platform operation</li>
                    <li>• Payment processors for financial transactions</li>
                    <li>• Communication services for platform features</li>
                    <li>• Security services for fraud detection</li>
                  </ul>
                </div>
              </section>

              <section className="space-y-8">
                <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">Data Security</h2>

                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-gray-900">Technical Safeguards</h3>
                  <ul className="space-y-2 text-gray-700 ml-4">
                    <li>• Industry-standard encryption for data transmission and storage</li>
                    <li>• Multi-factor authentication for account security</li>
                    <li>• Regular security assessments and updates</li>
                    <li>• Secure hosting in certified data centers</li>
                  </ul>
                </div>

                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-gray-900">Access Controls</h3>
                  <ul className="space-y-2 text-gray-700 ml-4">
                    <li>• Role-based access limitations for staff</li>
                    <li>• Comprehensive audit trails for data access</li>
                    <li>• Regular employee training on data protection</li>
                    <li>• Incident response procedures for security events</li>
                  </ul>
                </div>
              </section>

              <section className="space-y-8">
                <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">Your Privacy Rights</h2>

                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-gray-900">Under Philippine Law</h3>
                  <p className="text-gray-700">As a data subject under the Philippine Data Privacy Act, you have the right to:</p>
                  <ul className="space-y-2 text-gray-700 ml-4">
                    <li>• Access: Request copies of your personal data</li>
                    <li>• Rectification: Correct inaccurate or incomplete information</li>
                    <li>• Erasure: Request deletion of your data under specific circumstances</li>
                    <li>• Object: Object to processing for certain purposes</li>
                    <li>• Data portability: Receive your data in a portable format</li>
                    <li>• File complaints: Lodge complaints with the National Privacy Commission</li>
                  </ul>
                </div>
              </section>

              <section className="space-y-8">
                <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">Contact Information</h2>

                <div className="space-y-4">
                  <p className="text-gray-700">
                    For privacy questions or to exercise your rights, contact us at:
                  </p>
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <p className="text-gray-700">
                      <strong>Email:</strong> contact@bridge-mentor.com<br />
                    </p>
                  </div>
                </div>
              </section>

              <div className="mt-12 p-6 bg-blue-50 rounded-xl border border-blue-200">
                <p className="text-blue-800 font-semibold text-lg text-center">
                  This Privacy Policy is effective as of the date listed above and complies with Philippine Data Privacy Act requirements.
                </p>
              </div>

              <div className="mt-8 text-center">
                <Link
                  href="/terms-of-service"
                  className="inline-block px-6 py-3 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors mr-4 font-medium"
                >
                  Terms of Service
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