"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"
import { useRouter } from "next/navigation"

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

          <div className="mb-8">
            <p className="text-sm text-gray-400 mb-3">Popular searches:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {["React", "JavaScript", "UI/UX Design", "Node.js", "Python", "Career Advice"].map((skill) => (
                <button
                  key={skill}
                  onClick={() => {
                    setSearchQuery(skill)
                    router.push(`/learner/browse-mentors?search=${encodeURIComponent(skill)}`)
                  }}
                  className="px-3 py-1 text-sm bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white rounded-full border border-gray-600 hover:border-gray-500 transition-all duration-200"
                >
                  {skill}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-12 flex justify-center space-x-8 opacity-80">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-600/20 border border-blue-500/30 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-2xl">🎯</span>
              </div>
              <p className="text-sm text-gray-400">Set Goals</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-600/20 border border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-2xl">🤝</span>
              </div>
              <p className="text-sm text-gray-400">Connect</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-600/20 border border-purple-500/30 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-2xl">🚀</span>
              </div>
              <p className="text-sm text-gray-400">Grow</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
