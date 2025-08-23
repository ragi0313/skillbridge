"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Star, MapPin, Clock, ChevronLeft, ChevronRight, Settings } from "lucide-react"

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
  const [currentMentorIndex, setCurrentMentorIndex] = useState(0)

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

  const nextMentor = () => {
    setCurrentMentorIndex((prev) => (prev + 2 >= mentors.length ? 0 : prev + 2))
  }

  const prevMentor = () => {
    setCurrentMentorIndex((prev) => (prev - 2 < 0 ? Math.max(0, mentors.length - 2) : prev - 2))
  }

  const visibleMentors = mentors.slice(currentMentorIndex, currentMentorIndex + 2)

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-12">
            <div className="text-center flex-1">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Recommended for you</h2>
              <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                Based on your learning goals, here are mentors who can help you grow.
              </p>
            </div>
            {mentors.length > 2 && (
              <div className="flex items-center space-x-2">
                <button onClick={prevMentor} className="p-2 rounded-full border border-gray-300 hover:bg-gray-50">
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <button onClick={nextMentor} className="p-2 rounded-full border border-gray-300 hover:bg-gray-50">
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Finding matching mentors...</p>
            </div>
          ) : mentors.length === 0 ? (
            <div className="text-center py-12">
              <Star className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No matching mentors found</h3>
              <p className="text-gray-600 mb-4">
                Update your learning goals to find mentors who match your interests.
              </p>
              <Link href="/learner/settings">
                <Button className="gradient-bg text-white">
                  <Settings className="w-4 h-4 mr-2" />
                  Update Learning Goals
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {visibleMentors.map((mentor) => (
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

                    <Button asChild className="w-full gradient-bg text-white">
                      <Link href={`/mentors/${mentor.mentorId}/${`${mentor.firstName}-${mentor.lastName}`.toLowerCase().replace(/\s+/g, "-")}`}>View Profile</Link>
                    </Button>
                  </CardContent>
                </Card>
                ))}
              </div>

              {mentors.length > 2 && (
                <div className="flex justify-center mt-6">
                  <div className="flex space-x-2">
                    {Array.from({ length: Math.ceil(mentors.length / 2) }).map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentMentorIndex(index * 2)}
                        className={`w-3 h-3 rounded-full ${
                          Math.floor(currentMentorIndex / 2) === index ? "bg-purple-600" : "bg-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          <div className="text-center mt-12">
            <Button asChild variant="outline" size="lg" className="px-8 gradient-bg text-white">
              <Link href="/find-mentors">View All Mentors</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
