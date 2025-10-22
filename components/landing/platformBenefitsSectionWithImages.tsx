"use client"

import { motion } from "framer-motion"

const benefits = [
  {
    image: "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=600&h=400&fit=crop&auto=format",
    title: "Verified Mentors",
    description: "All mentors are thoroughly vetted with verified credentials and professional experience.",
    gradient: "from-blue-500 to-cyan-500"
  },
  {
    image: "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=600&h=400&fit=crop&auto=format",
    title: "Flexible Scheduling",
    description: "Book sessions that fit your schedule. Available 24/7 with mentors across all time zones.",
    gradient: "from-purple-500 to-pink-500"
  },
  {
    image: "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=600&h=400&fit=crop&auto=format",
    title: "Quality Guaranteed",
    description: "98% satisfaction rate. If you're not happy with a session, we'll make it right.",
    gradient: "from-green-500 to-emerald-500"
  },
  {
    image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&h=400&fit=crop&auto=format",
    title: "Personalized Matching",
    description: "Our algorithm matches you with mentors based on your goals, learning style, and preferences.",
    gradient: "from-orange-500 to-red-500"
  },
  {
    image: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=600&h=400&fit=crop&auto=format",
    title: "Transparent Pricing",
    description: "No hidden fees. See exact prices upfront and only pay for sessions you book.",
    gradient: "from-pink-500 to-rose-500"
  },
  {
    image: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=600&h=400&fit=crop&auto=format",
    title: "24/7 Support",
    description: "Our support team is always here to help you with any questions or technical issues.",
    gradient: "from-teal-500 to-cyan-500"
  }
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, x: -30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut"
    }
  }
}

export function PlatformBenefitsSectionWithImages() {
  return (
    <section className="py-24 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute top-0 left-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-screen filter blur-3xl opacity-10"
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 100, 0],
            y: [0, 50, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500 rounded-full mix-blend-screen filter blur-3xl opacity-10"
          animate={{
            scale: [1, 1.3, 1],
            x: [0, -100, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 25,
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
          className="text-center mb-16"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.5 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-block px-4 py-2 bg-blue-500/20 text-blue-300 rounded-full text-sm font-semibold mb-4 backdrop-blur-sm border border-blue-400/30"
          >
            Why Choose SkillBridge
          </motion.span>

          <h2 className="text-4xl lg:text-5xl font-bold mb-4">
            Built for Your <span className="text-blue-400">Success</span>
          </h2>

          <p className="text-xl text-slate-300 max-w-3xl mx-auto">
            We've designed every feature with your growth in mind. Experience the difference of a platform built for learners.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {benefits.map((benefit, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              whileHover={{
                y: -10,
                transition: { duration: 0.3 }
              }}
              className="group"
            >
              <div className="relative bg-slate-800/50 backdrop-blur-sm rounded-2xl overflow-hidden border border-slate-700 hover:border-blue-500/50 transition-all duration-300 h-full">
                {/* Image with overlay */}
                <div className="relative h-48 overflow-hidden">
                  <motion.img
                    src={benefit.image}
                    alt={benefit.title}
                    className="w-full h-full object-cover"
                    whileHover={{ scale: 1.1 }}
                    transition={{ duration: 0.4 }}
                  />
                  {/* Gradient overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${benefit.gradient} opacity-50 group-hover:opacity-30 transition-opacity duration-300`} />

                  {/* Title on image */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <h3 className="text-2xl font-bold text-white drop-shadow-lg text-center px-4">
                      {benefit.title}
                    </h3>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <p className="text-slate-300 leading-relaxed">
                    {benefit.description}
                  </p>
                </div>

                {/* Decorative corner */}
                <div className={`absolute bottom-0 right-0 w-20 h-20 bg-gradient-to-tl ${benefit.gradient} opacity-10 rounded-tl-full`} />
              </div>
            </motion.div>
          ))}
        </motion.div>

      </div>
    </section>
  )
}
