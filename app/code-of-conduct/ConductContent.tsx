'use client'

import Link from 'next/link'
import UnifiedHeader from '@/components/UnifiedHeader'
import { Footer } from '@/components/landing/Footer'

interface ConductContentProps {
  session: { id: number; role: string } | null
}

export default function ConductContent({ session }: ConductContentProps) {
  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader />

      <main className="py-16">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <header className="mb-16">
              <h1 className="text-5xl font-bold text-gray-900 mb-6">Code of Conduct</h1>
              <p className="text-lg text-gray-600">Last Updated: September 28, 2025</p>
            </header>

            <article className="space-y-12">
              <section className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">Our Commitment</h2>
                <p className="text-lg text-gray-700 leading-relaxed">
                  BridgeMentor is committed to providing a safe, inclusive, and professional environment for all users, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.
                </p>
                <p className="text-lg text-gray-700 leading-relaxed">
                  This Code of Conduct outlines our expectations for participant behavior and the consequences for unacceptable behavior. We invite all users to help us create safe and positive experiences for everyone.
                </p>
              </section>

              <section className="space-y-8">
                <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">Our Values</h2>

                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-gray-900 border-l-4 border-blue-600 pl-4">
                      Respect and Professionalism
                    </h3>
                    <ul className="space-y-2 text-gray-700 ml-4">
                      <li>Treat all community members with dignity and respect</li>
                      <li>Maintain professional standards in all interactions</li>
                      <li>Acknowledge and value diverse perspectives and experiences</li>
                      <li>Use welcoming and inclusive language</li>
                    </ul>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-gray-900 border-l-4 border-green-600 pl-4">
                      Learning and Growth
                    </h3>
                    <ul className="space-y-2 text-gray-700 ml-4">
                      <li>Foster an environment conducive to learning and development</li>
                      <li>Provide constructive feedback and guidance</li>
                      <li>Encourage questions and curiosity</li>
                      <li>Support others in their professional journey</li>
                    </ul>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-gray-900 border-l-4 border-purple-600 pl-4">
                      Integrity and Honesty
                    </h3>
                    <ul className="space-y-2 text-gray-700 ml-4">
                      <li>Be truthful about your qualifications and experience</li>
                      <li>Provide honest feedback and assessments</li>
                      <li>Honor commitments and maintain reliability</li>
                      <li>Respect intellectual property and confidentiality</li>
                    </ul>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-gray-900 border-l-4 border-red-600 pl-4">
                      Safety and Well-being
                    </h3>
                    <ul className="space-y-2 text-gray-700 ml-4">
                      <li>Prioritize the safety and well-being of all users</li>
                      <li>Report harmful behavior promptly</li>
                      <li>Maintain appropriate boundaries in professional relationships</li>
                      <li>Protect personal and sensitive information</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section className="space-y-8">
                <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">Expected Behavior</h2>
                <p className="text-lg text-gray-700 leading-relaxed">All community participants are expected to:</p>

                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-900">Communication Standards</h3>
                  <ul className="space-y-2 text-gray-700 ml-4">
                    <li><strong>Use respectful language</strong>: Communicate clearly, kindly, and professionally</li>
                    <li><strong>Listen actively</strong>: Give others your full attention and consider their perspectives</li>
                    <li><strong>Be constructive</strong>: Offer helpful feedback and suggestions rather than mere criticism</li>
                    <li><strong>Stay on topic</strong>: Keep discussions relevant to professional development and mentoring</li>
                    <li><strong>Respect time zones</strong>: Be mindful of global participants when scheduling communications</li>
                  </ul>
                </div>

                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-900">Professional Conduct</h3>
                  <ul className="space-y-2 text-gray-700 ml-4">
                    <li><strong>Maintain boundaries</strong>: Keep relationships professional and appropriate</li>
                    <li><strong>Honor commitments</strong>: Attend scheduled sessions and meetings punctually</li>
                    <li><strong>Prepare appropriately</strong>: Come to sessions ready to engage and contribute</li>
                    <li><strong>Follow through</strong>: Complete agreed-upon actions and assignments</li>
                    <li><strong>Seek permission</strong>: Ask before recording sessions or sharing private conversations</li>
                  </ul>
                </div>

                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-900">Inclusive Behavior</h3>
                  <ul className="space-y-2 text-gray-700 ml-4">
                    <li><strong>Welcome newcomers</strong>: Help new users feel comfortable and included</li>
                    <li><strong>Use inclusive language</strong>: Avoid assumptions about others' backgrounds or circumstances</li>
                    <li><strong>Accommodate differences</strong>: Be flexible with learning styles and cultural differences</li>
                    <li><strong>Celebrate diversity</strong>: Recognize and appreciate different perspectives and approaches</li>
                    <li><strong>Offer support</strong>: Assist others when appropriate and possible</li>
                  </ul>
                </div>

                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-900">Privacy and Confidentiality</h3>
                  <ul className="space-y-2 text-gray-700 ml-4">
                    <li><strong>Protect personal information</strong>: Do not share others' private details without consent</li>
                    <li><strong>Maintain session confidentiality</strong>: Keep mentoring discussions private unless agreed otherwise</li>
                    <li><strong>Respect boundaries</strong>: Honor requests for privacy and personal space</li>
                    <li><strong>Secure data</strong>: Handle sensitive information responsibly and securely</li>
                  </ul>
                </div>
              </section>

              <section className="space-y-8">
                <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">Unacceptable Behavior</h2>
                <p className="text-lg text-gray-700 leading-relaxed">The following behaviors are considered harassment and are unacceptable within our community:</p>

                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-900">Harassment and Discrimination</h3>
                  <ul className="space-y-2 text-gray-700 ml-4">
                    <li><strong>Verbal harassment</strong>: Offensive comments related to personal characteristics, identity, or background</li>
                    <li><strong>Visual harassment</strong>: Sharing inappropriate images, symbols, or materials</li>
                    <li><strong>Sexual harassment</strong>: Unwelcome sexual attention, advances, or comments</li>
                    <li><strong>Discriminatory behavior</strong>: Actions that exclude or marginalize individuals based on protected characteristics</li>
                    <li><strong>Intimidation or threats</strong>: Behavior intended to frighten, coerce, or intimidate others</li>
                  </ul>
                </div>

                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-900">Professional Misconduct</h3>
                  <ul className="space-y-2 text-gray-700 ml-4">
                    <li><strong>Dishonesty</strong>: Misrepresenting qualifications, experience, or achievements</li>
                    <li><strong>Breach of confidentiality</strong>: Sharing private information without permission</li>
                    <li><strong>Exploitation</strong>: Taking advantage of power imbalances or vulnerable individuals</li>
                    <li><strong>Fraud</strong>: Engaging in deceptive practices related to payments or services</li>
                    <li><strong>Plagiarism</strong>: Presenting others' work or ideas as your own</li>
                  </ul>
                </div>

                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-900">Platform Abuse</h3>
                  <ul className="space-y-2 text-gray-700 ml-4">
                    <li><strong>Spam or solicitation</strong>: Sending unsolicited promotional materials or irrelevant content</li>
                    <li><strong>System manipulation</strong>: Attempting to game ratings, reviews, or matching algorithms</li>
                    <li><strong>Account violations</strong>: Creating fake accounts or impersonating others</li>
                    <li><strong>Technical abuse</strong>: Attempting to hack, disrupt, or damage platform infrastructure</li>
                    <li><strong>Policy circumvention</strong>: Deliberately avoiding platform rules or fee structures</li>
                  </ul>
                </div>

                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-900">Disruptive Behavior</h3>
                  <ul className="space-y-2 text-gray-700 ml-4">
                    <li><strong>Trolling</strong>: Deliberately provocative or inflammatory comments or actions</li>
                    <li><strong>Excessive arguing</strong>: Prolonged, unproductive debates that derail conversations</li>
                    <li><strong>Attention-seeking</strong>: Behavior primarily intended to draw attention rather than contribute meaningfully</li>
                    <li><strong>Interruption</strong>: Consistently disrupting sessions, meetings, or conversations</li>
                    <li><strong>Passive aggression</strong>: Indirect expression of hostility or resentment</li>
                  </ul>
                </div>
              </section>

              <section className="space-y-8">
                <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">Reporting Guidelines</h2>
                <p className="text-lg text-gray-700 leading-relaxed">If you experience or witness behavior that violates this Code of Conduct, please report it promptly using one of the following methods:</p>

                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-900">Immediate Reporting</h3>
                  <ul className="space-y-2 text-gray-700 ml-4">
                    <li><strong>In-platform reporting</strong>: Use the report function available in chat and session interfaces</li>
                    <li><strong>Emergency contact</strong>: For urgent safety concerns, contact local authorities first, then notify us</li>
                    <li><strong>Direct messaging</strong>: Contact platform administrators through the messaging system</li>
                  </ul>
                </div>

                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-900">Formal Reporting Process</h3>
                  <ol className="space-y-2 text-gray-700 ml-4 list-decimal">
                    <li><strong>Document the incident</strong>: Record relevant details including dates, times, and specific behaviors</li>
                    <li><strong>Submit report</strong>: Send detailed information to contact@bridge-mentor.com</li>
                    <li><strong>Follow up</strong>: Respond to any requests for additional information from our review team</li>
                    <li><strong>Maintain confidentiality</strong>: Avoid discussing the incident publicly while under investigation</li>
                  </ol>
                </div>

                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-900">What to Include in Reports</h3>
                  <ul className="space-y-2 text-gray-700 ml-4">
                    <li><strong>Date and time</strong> of the incident</li>
                    <li><strong>Users involved</strong> (usernames or identifying information)</li>
                    <li><strong>Detailed description</strong> of what occurred</li>
                    <li><strong>Evidence</strong> (screenshots, chat logs, etc.) if available</li>
                    <li><strong>Impact</strong> on you or others</li>
                    <li><strong>Previous incidents</strong> if this is part of a pattern</li>
                  </ul>
                </div>
              </section>

              <section className="space-y-8">
                <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">Investigation and Response</h2>

                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-900">Investigation Process</h3>
                  <ul className="space-y-2 text-gray-700 ml-4">
                    <li><strong>Prompt review</strong>: All reports will be acknowledged within 24 hours</li>
                    <li><strong>Fair investigation</strong>: We will review all available evidence and speak with relevant parties</li>
                    <li><strong>Confidentiality</strong>: Investigations will be conducted as confidentially as possible</li>
                    <li><strong>Impartiality</strong>: Decision-makers will be free from conflicts of interest</li>
                    <li><strong>Documentation</strong>: All investigations will be properly documented</li>
                  </ul>
                </div>

                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-900">Possible Consequences</h3>
                  <p className="text-lg text-gray-700 leading-relaxed">Depending on the severity and nature of the violation, consequences may include:</p>

                  <h4 className="text-lg font-semibold text-gray-900 mt-4">First-Time Minor Violations</h4>
                  <ul className="space-y-2 text-gray-700 ml-4">
                    <li><strong>Warning</strong>: Written notice about the violation and expected behavior changes</li>
                    <li><strong>Education</strong>: Required participation in conduct training or coaching</li>
                    <li><strong>Monitoring</strong>: Increased oversight of platform activity for a specified period</li>
                    <li><strong>Restrictions</strong>: Temporary limitations on certain platform features</li>
                  </ul>

                  <h4 className="text-lg font-semibold text-gray-900 mt-4">Serious or Repeat Violations</h4>
                  <ul className="space-y-2 text-gray-700 ml-4">
                    <li><strong>Suspension</strong>: Temporary removal from the platform (1-90 days)</li>
                    <li><strong>Probation</strong>: Continued access with strict conditions and monitoring</li>
                    <li><strong>Feature restrictions</strong>: Permanent limitations on specific platform capabilities</li>
                    <li><strong>Public acknowledgment</strong>: In cases affecting the broader community</li>
                  </ul>

                  <h4 className="text-lg font-semibold text-gray-900 mt-4">Severe Violations</h4>
                  <ul className="space-y-2 text-gray-700 ml-4">
                    <li><strong>Permanent ban</strong>: Complete removal from the platform with no opportunity for return</li>
                    <li><strong>Legal action</strong>: Referral to law enforcement for criminal behavior</li>
                    <li><strong>Financial consequences</strong>: Forfeiture of earnings or additional penalties</li>
                    <li><strong>Public disclosure</strong>: When necessary to protect community safety</li>
                  </ul>
                </div>

                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-900">Appeals Process</h3>
                  <ul className="space-y-2 text-gray-700 ml-4">
                    <li><strong>Right to appeal</strong>: Users may appeal decisions within 30 days of notification</li>
                    <li><strong>Appeal submission</strong>: Submit written appeals to contact@bridge-mentor.com</li>
                    <li><strong>Review process</strong>: Appeals will be reviewed by different personnel than the original decision-makers</li>
                    <li><strong>Final decision</strong>: Appeal decisions are final and binding</li>
                  </ul>
                </div>
              </section>

              <section className="space-y-8">
                <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">Mentoring-Specific Guidelines</h2>

                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-900">For Mentors</h3>
                  <ul className="space-y-2 text-gray-700 ml-4">
                    <li><strong>Set clear expectations</strong>: Communicate session objectives and boundaries upfront</li>
                    <li><strong>Provide balanced feedback</strong>: Offer both positive reinforcement and constructive criticism</li>
                    <li><strong>Respect learning pace</strong>: Adapt your teaching style to individual learner needs</li>
                    <li><strong>Maintain professionalism</strong>: Keep relationships focused on professional development</li>
                    <li><strong>Document progress</strong>: Keep appropriate records of learner development and achievements</li>
                  </ul>
                </div>

                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-900">For Learners</h3>
                  <ul className="space-y-2 text-gray-700 ml-4">
                    <li><strong>Come prepared</strong>: Research topics and prepare questions in advance</li>
                    <li><strong>Be receptive</strong>: Listen openly to feedback and suggestions</li>
                    <li><strong>Take ownership</strong>: Accept responsibility for your own learning and development</li>
                    <li><strong>Respect expertise</strong>: Value your mentor's time and knowledge</li>
                    <li><strong>Follow through</strong>: Complete assignments and apply what you've learned</li>
                  </ul>
                </div>

                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-900">Session Guidelines</h3>
                  <ul className="space-y-2 text-gray-700 ml-4">
                    <li><strong>Start and end on time</strong>: Respect scheduled session durations</li>
                    <li><strong>Stay focused</strong>: Keep discussions relevant to learning objectives</li>
                    <li><strong>Use technology appropriately</strong>: Ensure good audio/video quality and stable connections</li>
                    <li><strong>Take notes</strong>: Document key insights and action items</li>
                    <li><strong>Follow up</strong>: Implement discussed strategies and report on progress</li>
                  </ul>
                </div>
              </section>

              <section className="space-y-8">
                <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">Community Standards</h2>

                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-900">Building a Positive Environment</h3>
                  <ul className="space-y-2 text-gray-700 ml-4">
                    <li><strong>Encourage participation</strong>: Welcome questions and diverse viewpoints</li>
                    <li><strong>Share knowledge</strong>: Contribute insights and resources when appropriate</li>
                    <li><strong>Celebrate success</strong>: Acknowledge achievements and milestones</li>
                    <li><strong>Learn from mistakes</strong>: View errors as learning opportunities</li>
                    <li><strong>Support growth</strong>: Help others develop their skills and confidence</li>
                  </ul>
                </div>

                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-900">Conflict Resolution</h3>
                  <ul className="space-y-2 text-gray-700 ml-4">
                    <li><strong>Address issues directly</strong>: Speak with involved parties before escalating</li>
                    <li><strong>Seek understanding</strong>: Try to see situations from others' perspectives</li>
                    <li><strong>Focus on behavior</strong>: Critique actions rather than personal characteristics</li>
                    <li><strong>Find common ground</strong>: Look for shared goals and interests</li>
                    <li><strong>Involve mediators</strong>: Use platform resources when direct resolution isn't possible</li>
                  </ul>
                </div>

                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-900">Cultural Sensitivity</h3>
                  <ul className="space-y-2 text-gray-700 ml-4">
                    <li><strong>Respect differences</strong>: Acknowledge and value cultural variations in communication and behavior</li>
                    <li><strong>Avoid assumptions</strong>: Don't make generalizations based on background or appearance</li>
                    <li><strong>Learn continuously</strong>: Educate yourself about different cultures and perspectives</li>
                    <li><strong>Ask respectfully</strong>: When unsure, ask for clarification rather than assuming</li>
                    <li><strong>Adapt communication</strong>: Modify your style to be more inclusive and accessible</li>
                  </ul>
                </div>
              </section>

              <section className="space-y-8">
                <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">Special Situations</h2>

                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-900">Mental Health and Wellness</h3>
                  <ul className="space-y-2 text-gray-700 ml-4">
                    <li><strong>Recognize limitations</strong>: The platform is not a substitute for professional mental health services</li>
                    <li><strong>Refer appropriately</strong>: Direct users to qualified professionals when needed</li>
                    <li><strong>Maintain boundaries</strong>: Avoid providing advice outside your area of expertise</li>
                    <li><strong>Show compassion</strong>: Be understanding of mental health challenges while maintaining professional boundaries</li>
                  </ul>
                </div>

                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-900">Technical Issues</h3>
                  <ul className="space-y-2 text-gray-700 ml-4">
                    <li><strong>Be patient</strong>: Technology problems can affect anyone</li>
                    <li><strong>Offer alternatives</strong>: Suggest solutions when technical difficulties arise</li>
                    <li><strong>Report problems</strong>: Help improve the platform by reporting bugs and issues</li>
                    <li><strong>Stay flexible</strong>: Adapt to technical limitations when necessary</li>
                  </ul>
                </div>

                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-900">Cross-Cultural Interactions</h3>
                  <ul className="space-y-2 text-gray-700 ml-4">
                    <li><strong>Respect time zones</strong>: Be considerate when scheduling across different regions</li>
                    <li><strong>Accommodate language differences</strong>: Be patient with non-native speakers</li>
                    <li><strong>Understand cultural norms</strong>: Recognize that professional behavior varies across cultures</li>
                    <li><strong>Clarify expectations</strong>: Discuss cultural differences openly and respectfully</li>
                  </ul>
                </div>
              </section>

              <section className="space-y-8">
                <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">Responsibilities</h2>

                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-900">Platform Responsibilities</h3>
                  <p className="text-lg text-gray-700 leading-relaxed">BridgeMentor commits to:</p>
                  <ul className="space-y-2 text-gray-700 ml-4">
                    <li>Maintaining a safe and welcoming platform environment</li>
                    <li>Investigating reports promptly and thoroughly</li>
                    <li>Providing clear guidelines and expectations</li>
                    <li>Supporting users in resolving conflicts</li>
                    <li>Continuously improving our policies and procedures</li>
                  </ul>
                </div>

                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-900">User Responsibilities</h3>
                  <p className="text-lg text-gray-700 leading-relaxed">All users must:</p>
                  <ul className="space-y-2 text-gray-700 ml-4">
                    <li>Read and understand this Code of Conduct</li>
                    <li>Report violations when observed</li>
                    <li>Participate in investigations when requested</li>
                    <li>Respect the decisions of platform administrators</li>
                    <li>Help maintain a positive community environment</li>
                  </ul>
                </div>

                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-900">Mentor Responsibilities</h3>
                  <p className="text-lg text-gray-700 leading-relaxed">Mentors additionally must:</p>
                  <ul className="space-y-2 text-gray-700 ml-4">
                    <li>Model appropriate professional behavior</li>
                    <li>Guide learners in following community standards</li>
                    <li>Report concerning behavior by learners</li>
                    <li>Maintain appropriate professional boundaries</li>
                    <li>Provide a safe learning environment</li>
                  </ul>
                </div>

                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-900">Learner Responsibilities</h3>
                  <p className="text-lg text-gray-700 leading-relaxed">Learners additionally must:</p>
                  <ul className="space-y-2 text-gray-700 ml-4">
                    <li>Respect mentor expertise and experience</li>
                    <li>Follow mentor guidelines and expectations</li>
                    <li>Report concerning behavior by mentors</li>
                    <li>Take responsibility for their own learning</li>
                    <li>Apply feedback constructively</li>
                  </ul>
                </div>
              </section>

              <section className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">Continuous Improvement</h2>
                <p className="text-lg text-gray-700 leading-relaxed">
                  This Code of Conduct is a living document that will be updated based on:
                </p>
                <ul className="space-y-2 text-gray-700 ml-4">
                  <li>Community feedback and suggestions</li>
                  <li>Evolving best practices in online education</li>
                  <li>Legal and regulatory changes</li>
                  <li>Platform growth and new features</li>
                  <li>Lessons learned from incident responses</li>
                </ul>
                <p className="text-lg text-gray-700 leading-relaxed">
                  We encourage all community members to provide feedback on how we can improve our community standards and create an even more positive environment for learning and growth.
                </p>
              </section>

              <section className="space-y-8">
                <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">Resources and Support</h2>

                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-900">Getting Help</h3>
                  <ul className="space-y-2 text-gray-700 ml-4">
                    <li><strong>Platform support</strong>: Contact contact@bridge-mentor.com for technical issues</li>
                    <li><strong>Conduct concerns</strong>: Report violations to contact@bridge-mentor.com</li>
                    <li><strong>Appeals</strong>: Submit appeals to contact@bridge-mentor.com</li>
                    <li><strong>General feedback</strong>: Share suggestions at contact@bridge-mentor.com</li>
                    <li><strong>Legal assistance</strong>: Contact the Department of Trade and Industry for consumer concerns</li>
                    <li><strong>Cybercrime reporting</strong>: Report serious violations to the Philippine National Police Anti-Cybercrime Group</li>
                  </ul>
                </div>

                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-900">External Resources</h3>
                  <ul className="space-y-2 text-gray-700 ml-4">
                    <li><strong>Emergency services</strong>: Contact 911 or local Philippine emergency services for immediate safety concerns</li>
                    <li><strong>Mental health</strong>: Contact the Department of Health Mental Health Hotline: 1553 (USAPAN)</li>
                    <li><strong>Legal advice</strong>: Consult qualified Philippine attorneys or contact the Public Attorney's Office</li>
                    <li><strong>Harassment support</strong>: Contact the Commission on Human Rights Philippines or women's advocacy organizations like Gabriela</li>
                    <li><strong>Consumer protection</strong>: File complaints with the Department of Trade and Industry</li>
                    <li><strong>Cybercrime</strong>: Report to the Cybercrime Investigation and Coordinating Center (CICC)</li>
                  </ul>
                </div>
              </section>

              <section className="space-y-8">
                <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">Philippine Legal Framework</h2>

                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-900">Cybercrime Prevention Act Compliance</h3>
                  <ul className="space-y-2 text-gray-700 ml-4">
                    <li>We comply with Republic Act No. 10175 (Cybercrime Prevention Act of 2012)</li>
                    <li>Prohibited acts include cyberbullying, online harassment, and cyber fraud</li>
                    <li>Violations may be reported to appropriate law enforcement agencies</li>
                  </ul>
                </div>

                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-900">Safe Spaces Act</h3>
                  <ul className="space-y-2 text-gray-700 ml-4">
                    <li>We support Republic Act No. 11313 (Safe Spaces Act or Bawal Bastos Law)</li>
                    <li>Gender-based online violence and harassment are strictly prohibited</li>
                    <li>Creating a safe environment for all users, especially women and LGBTQ+ individuals</li>
                  </ul>
                </div>

                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-900">Anti-Discrimination Laws</h3>
                  <ul className="space-y-2 text-gray-700 ml-4">
                    <li>We comply with Republic Act No. 11313 and local anti-discrimination ordinances</li>
                    <li>Discrimination based on sexual orientation, gender identity, age, disability, or other protected characteristics is prohibited</li>
                    <li>Equal opportunities and treatment for all platform users</li>
                  </ul>
                </div>
              </section>

              <section className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">Acknowledgment</h2>
                <p className="text-lg text-gray-700 leading-relaxed">
                  By using BridgeMentor, you acknowledge that you have read, understood, and agree to abide by this Code of Conduct. Violations of this code may result in restrictions or removal from the platform and may be reported to appropriate Philippine authorities when required by law.
                </p>
                <p className="text-lg text-gray-700 leading-relaxed">
                  Together, we can create a supportive, inclusive, and productive learning environment for all members of the BridgeMentor community.
                </p>
              </section>

              <hr className="my-8 border-gray-300" />

              <p className="text-center font-semibold text-gray-900 text-lg">
                For questions about this Code of Conduct, please contact us at contact@bridge-mentor.com
              </p>

              <div className="mt-8 text-center space-x-6">
                <Link
                  href="/privacy-policy"
                  className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
                >
                  Privacy Policy
                </Link>
                <Link
                  href="/terms-of-service"
                  className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
                >
                  Terms of Service
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