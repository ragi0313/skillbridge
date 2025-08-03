"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Star, MapPin, Clock } from "lucide-react"

type Mentor = {
  mentorId: number
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
}

export default function RecommendedMentors() {
  const [mentors, setMentors] = useState<Mentor[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchMentors() {
      try {
        const res = await fetch("/api/learner/recommended")
        const data = await res.json()
        setMentors(data.mentors || [])
      } catch (error) {
        console.error("Failed to fetch mentors", error)
      } finally {
        setLoading(false)
      }
    }

    fetchMentors()
  }, [])

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Recommended for you</h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Based on your learning goals, here are mentors who can help you grow.
            </p>
          </div>

          {loading ? (
            <p className="text-center text-gray-500">Loading recommended mentors...</p>
          ) : mentors.length === 0 ? (
            <p className="text-center text-gray-500">No mentors matched your learning goals yet. Check back soon!</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
              {mentors.map((mentor) => (
                <Card key={mentor.mentorId} className="hover:shadow-lg transition-all duration-300 border-0 shadow-md">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4 mb-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={mentor.profilePicture || "/placeholder.svg"} alt="Mentor" />
                        <AvatarFallback className="bg-blue-500 text-white text-lg">
                          {mentor.firstName[0]}
                          {mentor.lastName[0]}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {mentor.firstName} {mentor.lastName}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">{mentor.title}</p>

                        <div className="flex items-center space-x-2 mb-2">
                          <Star className="w-4 h-4 text-yellow-400 fill-current" />
                          <span className="text-sm font-medium text-gray-900 ml-1">4.9</span>
                          <span className="text-sm text-gray-500">({mentor.reviewCount} reviews)</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">{mentor.minRate} credits</p>
                        <p className="text-xs text-gray-500">per hour</p>
                      </div>
                    </div>

                    <p className="text-gray-700 text-sm leading-relaxed mb-4 line-clamp-3">{mentor.bio}</p>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {mentor.skills.slice(0, 4).map((skill) => (
                        <Badge
                          key={skill}
                          variant="secondary"
                          className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                        >
                          {skill}
                        </Badge>
                      ))}
                      {mentor.skills.length > 4 && (
                        <Badge variant="outline" className="text-xs text-gray-500">
                          +{mentor.skills.length - 4} more
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                      <div className="flex items-center">
                        <MapPin className="w-3 h-3 mr-1" />
                        {mentor.location}
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {mentor.responseTime}
                      </div>
                    </div>

                    <Button asChild className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                      <Link href={`/mentor/${mentor.mentorId}`}>View Profile</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="text-center mt-12">
            <Button asChild variant="outline" size="lg" className="px-8 bg-transparent">
              <Link href="/find-mentors">View All Mentors</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
