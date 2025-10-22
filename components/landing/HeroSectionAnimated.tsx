"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import Link from "next/link"
import { Sparkles, TrendingUp, Users } from "lucide-react"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.3
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut"
    }
  }
}

const floatingVariants = {
  animate: {
    y: [0, -20, 0],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
}

export function HeroSectionAnimated() {
  return (
    <section className="relative bg-slate-900 text-white py-20 lg:py-32 overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0">
        <img
          src="/filipino-professionals-in-modern-office-workspace-.jpg"
          alt="Filipino professionals workspace"
          className="w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-slate-800/90 to-slate-900/90"></div>

        {/* Animated orbs */}
        <motion.div
          className="absolute top-20 left-20 w-64 h-64 bg-blue-500 rounded-full mix-blend-screen filter blur-3xl opacity-20"
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-20 right-20 w-64 h-64 bg-purple-500 rounded-full mix-blend-screen filter blur-3xl opacity-20"
          animate={{
            scale: [1, 1.3, 1],
            x: [0, -50, 0],
            y: [0, -30, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      <div className="relative z-10 container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left content */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-8"
          >
            {/* Badge */}
            <motion.div variants={itemVariants}>
              <motion.div
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/20 backdrop-blur-sm border border-blue-400/30 rounded-full"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
              >
                <Sparkles className="w-4 h-4 text-blue-300" />
                <span className="text-sm font-semibold text-blue-300">
                  Connect with Expert Mentors
                </span>
              </motion.div>
            </motion.div>

            {/* Heading */}
            <motion.div variants={itemVariants} className="space-y-4">
              <h1 className="text-4xl lg:text-6xl font-bold leading-tight text-balance text-white">
                Transform Your Career
                <br />
                <motion.span
                  className="text-blue-400"
                  animate={{
                    backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                  }}
                  transition={{
                    duration: 5,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                  style={{
                    backgroundImage: "linear-gradient(90deg, #60a5fa, #a78bfa, #60a5fa)",
                    backgroundSize: "200% auto",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  With Expert Mentors
                </motion.span>
              </h1>
              <motion.p
                className="text-xl text-slate-300 leading-relaxed"
                variants={itemVariants}
              >
                Connect with industry leaders who've been there. Get personalized guidance to accelerate your growth.
              </motion.p>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Link href="/find-mentors">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/50">
                    Find Your Mentor
                    <motion.span
                      className="ml-2"
                      animate={{ x: [0, 5, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      →
                    </motion.span>
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
                    className="border-slate-300 text-slate-300 hover:bg-slate-300 hover:text-slate-900 bg-transparent"
                  >
                    Become a Mentor
                  </Button>
                </motion.div>
              </Link>
            </motion.div>

            {/* Social proof */}
            <motion.div
              variants={itemVariants}
              className="flex items-center gap-8 pt-4"
            >
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                <div>
                  <div className="text-lg font-semibold text-slate-300">Growing community</div>
                  <div className="text-sm text-slate-400">of learners</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-400" />
                <div>
                  <div className="text-lg font-semibold text-slate-300">Quality mentorship</div>
                  <div className="text-sm text-slate-400">guaranteed</div>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Right content - Cards */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-2 gap-4">
              <motion.div variants={floatingVariants} animate="animate">
                <Card className="p-4 bg-slate-800/50 backdrop-blur border-slate-700 hover:border-blue-500/50 transition-all duration-300">
                  <motion.img
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                    src="/filipino-professional-mentor-in-video-call-mentori.jpg"
                    alt="Filipino mentor in video session"
                    className="w-full h-48 object-cover object-center rounded mb-3"
                  />
                  <p className="text-sm text-slate-300 font-semibold">
                    Expert mentors available
                  </p>
                </Card>
              </motion.div>

              <motion.div
                variants={floatingVariants}
                animate="animate"
                transition={{ delay: 0.5 }}
              >
                <Card className="p-4 bg-slate-800/50 backdrop-blur border-slate-700 hover:border-blue-500/50 transition-all duration-300 mt-8">
                  <motion.img
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                    src="/diverse-group-of-filipino-professionals-in-modern-.jpg"
                    alt="Filipino professional team"
                    className="w-full h-48 object-cover object-center rounded mb-3"
                  />
                  <p className="text-sm text-slate-300 font-semibold">
                    Flexible scheduling
                  </p>
                </Card>
              </motion.div>
            </div>

            {/* Floating stats badges */}
            <motion.div
              className="flex gap-4 justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.6 }}
            >
              <motion.div
                className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-sm px-6 py-3 rounded-full border border-blue-400/30"
                whileHover={{ scale: 1.05, y: -5 }}
              >
                <p className="text-sm text-blue-300 font-semibold">Trending Skills</p>
              </motion.div>
              <motion.div
                className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-sm px-6 py-3 rounded-full border border-green-400/30"
                whileHover={{ scale: 1.05, y: -5 }}
              >
                <p className="text-sm text-green-300 font-semibold">Instant Booking</p>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
