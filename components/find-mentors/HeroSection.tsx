"use client"

import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

interface HeroSectionProps {
  searchQuery: string
  setSearchQuery: (query: string) => void
}

export function HeroSection({ searchQuery, setSearchQuery }: HeroSectionProps) {
  // SVG pattern for hero background
  const patternUrl =
    "data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%23ffffff' fillOpacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E"

  return (
    <div className="relative overflow-hidden">
      {/* Background with gradient and pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-purple-700 to-blue-800">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `url("${patternUrl}")` }}></div>
        <div className="absolute inset-0 bg-gradient-to-t from-purple-900/20 to-transparent"></div>
      </div>
      {/* Floating elements */}
      <div className="absolute top-20 left-10 w-20 h-20 bg-white/10 rounded-full blur-xl animate-pulse"></div>
      <div className="absolute top-40 right-20 w-32 h-32 bg-blue-400/20 rounded-full blur-2xl animate-pulse delay-1000"></div>
      <div className="absolute bottom-20 left-1/4 w-16 h-16 bg-purple-300/20 rounded-full blur-xl animate-pulse delay-500"></div>
      {/* Content */}
      <div className="relative z-10 pb-22 pt-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Find Your Perfect Mentor
          </h1>
          <p className="text-xl md:text-2xl text-purple-100 mb-12 max-w-3xl mx-auto leading-relaxed">
            Connect with industry experts who can accelerate your career growth and unlock your potential
          </p>
          {/* Search Bar */}
          <div className="relative max-w-2xl mx-auto">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <Input
              type="text"
              placeholder="Search by name, skills, or expertise..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-6 py-6 text-lg border-0 rounded-2xl shadow-2xl focus:ring-4 focus:ring-white/20 bg-white/95 backdrop-blur-sm placeholder:text-gray-500"
            />
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/20 to-blue-500/20 -z-10 blur-xl"></div>
          </div>
        </div>
      </div>
    </div>
  )
}
