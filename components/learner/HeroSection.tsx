"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"

export default function HeroSection() {
  const [searchQuery, setSearchQuery] = useState("")
  const [learnerName, setLearnerName] = useState("")

  const router = useRouter()

  useEffect(() => {
    const fetchLearner = async () => {
      try {
        const res = await fetch("/api/learner/me")
        if (!res.ok) return
        const data = await res.json()
        setLearnerName(data.firstName)
      } catch (err) {
        console.error("Failed to load learner data", err)
      }
    }

    fetchLearner()
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/find-mentors?search=${encodeURIComponent(searchQuery.trim())}`)
    } else {
      router.push("/find-mentors")
    }
  }

  return (
    <section className="bg-gray-900 py-18 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 relative">
        <div className="max-w-4xl mx-auto text-center">

          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Welcome{learnerName ? `, ${learnerName}` : ""}!
          </h1>

          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
            Start connecting with mentors and get ready to take your career to the next level!
          </p>

          <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 z-20 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search for mentors by skill, expertise, or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-14 pl-12 pr-24 text-base bg-white/10 border-gray-600 text-white placeholder:text-gray-400 focus:bg-white/20 focus:border-blue-500 rounded-xl backdrop-blur-sm"
              />
              <Button
                type="submit"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-10 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg shadow-lg transition-all duration-300"
              >
                Search
              </Button>
            </div>
          </form>

          {/* Quick Stats or Popular Skills */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/20 transition-all"
            >
              <div className="text-center">
                <p className="text-white font-semibold">Expert Mentors</p>
                <p className="text-gray-400 text-sm">Professional guidance</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/20 transition-all"
            >
              <div className="text-center">
                <p className="text-white font-semibold">Personalized Match</p>
                <p className="text-gray-400 text-sm">Find your mentor</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/20 transition-all"
            >
              <div className="text-center">
                <p className="text-white font-semibold">Accelerate Growth</p>
                <p className="text-gray-400 text-sm">Learn faster</p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
