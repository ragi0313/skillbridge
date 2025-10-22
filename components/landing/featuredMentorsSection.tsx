"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Star, MapPin, Clock, ArrowRight } from "lucide-react"

type FeaturedMentor = {
  mentorId: number
  userId: number
  firstName: string
  lastName: string
  title: string | null
  profilePicture: string | null
  bio: string | null
  skills: string[]
  location: string | null
  responseTime: string
  minRate: number
  reviewCount: number
  avgRating: number
}

export function FeaturedMentorsSection() {
  const [mentors, setMentors] = useState<FeaturedMentor[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchFeaturedMentors() {
      try {
        const res = await fetch("/api/mentors/featured")
        const data = await res.json()
        setMentors(data.mentors || [])
      } catch (error) {
        console.error("Failed to fetch featured mentors", error)
      } finally {
        setLoading(false)
      }
    }

    fetchFeaturedMentors()
  }, [])

  if (loading) {
    return (
      <section className="py-20 bg-gradient-to-b from-white to-slate-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-2">Featured Mentors</h2>
            <p className="text-xl text-gray-600">Learn from industry-leading experts</p>
          </div>
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading featured mentors...</p>
          </div>
        </div>
      </section>
    )
  }

  if (mentors.length === 0) {
    return null
  }

  return (
    <section className="py-20 bg-gradient-to-b from-white to-slate-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-2">Featured Mentors</h2>
          <p className="text-xl text-gray-600">Learn from industry-leading experts</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {mentors.map((mentor) => (
            <Card
              key={mentor.mentorId}
              className="bg-white rounded-2xl border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center mb-4">
                  <Avatar className="h-20 w-20 mb-4 ring-2 ring-purple-100">
                    <AvatarImage src={mentor.profilePicture || "/placeholder.svg"} alt="Mentor" />
                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white text-lg">
                      {mentor.firstName[0]}
                      {mentor.lastName[0]}
                    </AvatarFallback>
                  </Avatar>

                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {mentor.firstName} {mentor.lastName}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{mentor.title}</p>

                  <div className="flex items-center space-x-1 mb-3">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="text-sm font-medium text-gray-900">{mentor.avgRating}</span>
                    <span className="text-sm text-gray-500">({mentor.reviewCount})</span>
                  </div>
                </div>

                <p className="text-gray-700 text-sm leading-relaxed mb-4 line-clamp-3 text-center">
                  {mentor.bio}
                </p>

                <div className="flex flex-wrap gap-2 justify-center mb-4">
                  {mentor.skills.slice(0, 3).map((skill) => (
                    <Badge
                      key={skill}
                      variant="secondary"
                      className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                    >
                      {skill}
                    </Badge>
                  ))}
                  {mentor.skills.length > 3 && (
                    <Badge variant="outline" className="text-xs text-gray-500">
                      +{mentor.skills.length - 3}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-center text-xs text-gray-500 mb-4 space-x-4">
                  <div className="flex items-center">
                    <MapPin className="w-3 h-3 mr-1" />
                    {mentor.location}
                  </div>
                </div>

                <div className="text-center mb-4">
                  <p className="text-lg font-bold text-gray-900">{mentor.minRate} credits</p>
                  <p className="text-xs text-gray-500">starting price</p>
                </div>

                <Button asChild className="w-full gradient-bg text-white">
                  <Link
                    href={`/mentors/${mentor.mentorId}/${`${mentor.firstName}-${mentor.lastName}`
                      .toLowerCase()
                      .replace(/\s+/g, "-")}`}
                  >
                    View Profile
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Button asChild size="lg" variant="outline" className="px-8 gradient-bg text-white">
            <Link href="/find-mentors">
              Explore All Mentors
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
