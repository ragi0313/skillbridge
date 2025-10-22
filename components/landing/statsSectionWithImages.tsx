"use client"

import { motion } from "framer-motion"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
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
      duration: 0.5,
      ease: "easeOut"
    }
  }
}

export function StatsSectionWithImages() {
  return (
    <section className="py-20 bg-gradient-to-br from-slate-50 to-blue-50 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-20 left-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30"
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
          className="absolute bottom-20 right-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30"
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

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-4xl mx-auto"
        >
          <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-6">
            Your Journey to <span className="text-blue-600">Success</span> Starts Here
          </h2>
          <p className="text-xl text-slate-600 mb-8 leading-relaxed">
            Connect with experienced mentors who are passionate about sharing their knowledge.
            Whether you're looking to advance your career, learn a new skill, or get expert guidance,
            SkillBridge brings together learners and mentors in a supportive environment designed for growth.
          </p>
          <div className="grid md:grid-cols-3 gap-6 text-left">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="bg-white p-6 rounded-xl shadow-md"
            >
              <div className="text-blue-600 font-bold text-lg mb-2">Find Your Mentor</div>
              <p className="text-slate-600">Browse mentors across various skills and industries</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="bg-white p-6 rounded-xl shadow-md"
            >
              <div className="text-blue-600 font-bold text-lg mb-2">Book Sessions</div>
              <p className="text-slate-600">Schedule at your convenience with flexible timing</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="bg-white p-6 rounded-xl shadow-md"
            >
              <div className="text-blue-600 font-bold text-lg mb-2">Achieve Your Goals</div>
              <p className="text-slate-600">Get personalized guidance to reach your objectives</p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
