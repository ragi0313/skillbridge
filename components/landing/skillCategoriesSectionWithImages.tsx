"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { Button } from "@/components/ui/button"

const categories = [
  {
    image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&h=400&fit=crop&auto=format",
    title: "Web Development",
    skills: ["React", "Node.js", "TypeScript"],
    description: "Build modern web applications",
    gradient: "from-blue-500 to-cyan-500"
  },
  {
    image: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600&h=400&fit=crop&auto=format",
    title: "UI/UX Design",
    skills: ["Figma", "Adobe XD", "User Research"],
    description: "Design exceptional user experiences",
    gradient: "from-purple-500 to-pink-500"
  },
  {
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop&auto=format",
    title: "Digital Marketing",
    skills: ["SEO", "Social Media", "Analytics"],
    description: "Master online marketing strategies",
    gradient: "from-orange-500 to-red-500"
  },
  {
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop&auto=format",
    title: "Data Science",
    skills: ["Python", "Machine Learning", "SQL"],
    description: "Unlock insights from data",
    gradient: "from-green-500 to-emerald-500"
  },
  {
    image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&h=400&fit=crop&auto=format",
    title: "Product Management",
    skills: ["Strategy", "Roadmapping", "Analytics"],
    description: "Lead product development",
    gradient: "from-indigo-500 to-blue-500"
  },
  {
    image: "https://images.unsplash.com/photo-1579532537598-459ecdaf39cc?w=600&h=400&fit=crop&auto=format",
    title: "Business & Finance",
    skills: ["Accounting", "Investment", "Strategy"],
    description: "Grow your business acumen",
    gradient: "from-teal-500 to-cyan-500"
  },
  {
    image: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=600&h=400&fit=crop&auto=format",
    title: "Language Learning",
    skills: ["English", "Spanish", "Mandarin"],
    description: "Speak with confidence",
    gradient: "from-yellow-500 to-orange-500"
  },
  {
    image: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=600&h=400&fit=crop&auto=format",
    title: "Content Creation",
    skills: ["Video Editing", "Photography", "Writing"],
    description: "Create engaging content",
    gradient: "from-rose-500 to-pink-500"
  }
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08
    }
  }
}

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.9 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: "easeOut"
    }
  }
}

export function SkillCategoriesSectionWithImages() {
  return (
    <section className="py-24 bg-white relative overflow-hidden">
      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(to right, #888 1px, transparent 1px),
                           linear-gradient(to bottom, #888 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }} />
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
            className="inline-block px-4 py-2 bg-blue-100 text-blue-600 rounded-full text-sm font-semibold mb-4"
          >
            Popular Categories
          </motion.span>

          <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
            Explore Skills & <span className="text-blue-600">Find Your Path</span>
          </h2>

          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Browse through hundreds of skills taught by industry experts. Whatever you want to learn, we have the right mentor for you.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12"
        >
          {categories.map((category, index) => (
            <motion.div
              key={index}
              variants={cardVariants}
              whileHover={{
                y: -8,
                transition: { duration: 0.3 }
              }}
              className="group cursor-pointer"
            >
              <Link href="/find-mentors">
                <div className="relative bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 border border-slate-100">
                  {/* Image with gradient overlay */}
                  <div className="relative h-48 overflow-hidden">
                    <motion.img
                      src={category.image}
                      alt={category.title}
                      className="w-full h-full object-cover"
                      whileHover={{ scale: 1.1 }}
                      transition={{ duration: 0.4 }}
                    />
                    {/* Gradient overlay */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${category.gradient} opacity-60 group-hover:opacity-40 transition-opacity duration-300`} />

                    {/* Title on image */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <h3 className="text-2xl font-bold text-white drop-shadow-lg text-center px-4">
                        {category.title}
                      </h3>
                    </div>
                  </div>

                  {/* Content below image */}
                  <div className="p-6">
                    {/* Skills tags */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {category.skills.map((skill, i) => (
                        <span
                          key={i}
                          className="text-xs px-3 py-1 bg-slate-100 text-slate-700 rounded-full group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>

                    {/* Description */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">
                        {category.description}
                      </span>

                      {/* Hover arrow */}
                      <motion.div
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        initial={{ x: -10 }}
                        whileHover={{ x: 0 }}
                      >
                        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                      </motion.div>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-center"
        >
          <Link href="/find-mentors">
            <Button
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg"
            >
              Browse All Categories
              <motion.span
                className="ml-2"
                animate={{ x: [0, 5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                →
              </motion.span>
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
