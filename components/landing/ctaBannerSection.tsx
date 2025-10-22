"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowRight, CheckCircle2, Shield, Zap } from "lucide-react"

export function CTABannerSection() {
  return (
    <section className="py-20 bg-white relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center max-w-7xl mx-auto">
          {/* Left content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="order-2 lg:order-1"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <span className="inline-block px-4 py-2 bg-blue-100 text-blue-600 rounded-full text-sm font-semibold mb-6">
                Get Started Today
              </span>

              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight text-slate-900">
                Ready to Level Up
                <br />
                <span className="text-blue-600">Your Skills?</span>
              </h2>

              <p className="text-lg md:text-xl text-slate-600 mb-8 leading-relaxed">
                Connect with expert mentors who can help you achieve your goals. Start your journey to success today.
              </p>

              {/* Feature list */}
              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-slate-700 font-medium">Book sessions with verified mentors</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-slate-700 font-medium">Flexible scheduling that fits your life</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-slate-700 font-medium">Personalized learning experience</span>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/find-mentors">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      size="lg"
                      className="bg-blue-600 hover:bg-blue-700 text-white text-lg px-8 py-6 shadow-lg font-semibold w-full sm:w-auto"
                    >
                      Find a Mentor
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </motion.div>
                </Link>

                <Link href="/register/mentor">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      size="lg"
                      variant="outline"
                      className="border-2 border-slate-300 text-slate-900 hover:bg-slate-50 text-lg px-8 py-6 font-semibold w-full sm:w-auto"
                    >
                      Become a Mentor
                    </Button>
                  </motion.div>
                </Link>
              </div>

              {/* Trust indicators */}
              <div className="mt-10 pt-8 border-t border-slate-200 flex flex-wrap gap-6">
                <div className="flex items-center gap-2 text-slate-600">
                  <Shield className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium">Secure & Safe</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Zap className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium">Instant Booking</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <CheckCircle2 className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium">Verified Experts</span>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Right content - Image */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="order-1 lg:order-2"
          >
            <div className="relative">
              {/* Main image */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.3 }}
                className="relative rounded-2xl overflow-hidden shadow-2xl"
              >
                <img
                  src="/person-coding-on-computer-taking-action-learning.jpg"
                  alt="Person learning and coding"
                  className="w-full h-[500px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-blue-900/30 to-transparent" />
              </motion.div>

              {/* Floating badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="absolute -bottom-6 -left-6 bg-white rounded-xl shadow-xl p-6 border border-slate-200"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-900">Start Learning</div>
                    <div className="text-sm text-slate-600">Join our community</div>
                  </div>
                </div>
              </motion.div>

              {/* Decorative element */}
              <div className="absolute -top-6 -right-6 w-24 h-24 bg-blue-100 rounded-full opacity-50 blur-2xl" />
              <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-purple-100 rounded-full opacity-50 blur-2xl" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
