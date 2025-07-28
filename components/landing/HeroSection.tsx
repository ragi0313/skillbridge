"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import Image from "next/image"
import { motion } from "framer-motion"
import { Button } from "../ui/button"

export default function HeroSection() {
  const [searchQuery, setSearchQuery] = useState("")
    const router = useRouter()
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/find-mentors?search=${encodeURIComponent(searchQuery.trim())}`)
    } else {
      router.push("/find-mentors")
    }
  }
  return (
    <section className="bg-gray-900 text-white py-20">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <Badge className="bg-blue-600/20 text-blue-400 border-blue-500/20">
              🚀 Connecting Skills, Building Futures
            </Badge>
            <h1 className="text-5xl font-bold leading-tight">
              Transform Your Freelancing Career with
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                {" "} 1-on-1 Expert Mentorship
              </span>
            </h1>
            <p className="text-lg text-gray-300">
              Get personalized guidance from freelancing experts, accelerate your growth, <br/> and achieve your freelancing goals faster.
            </p>
            <form onSubmit={handleSearch} className="mt-7 max-w-2xl mx-auto mb-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white w-5 h-5 z-20" />
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
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative h-[400px] rounded-xl overflow-hidden hidden lg:block"
          >
            <Image
              src="/landing-bg.jpeg"
              alt="Mentorship image"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/20 to-purple-600/20 mix-blend-multiply"></div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
