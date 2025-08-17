"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CheckCircle, Star, Award, Users, MapPin, Languages, Coins } from "lucide-react"
import type { Mentor } from "./types"
import Link from "next/link"

interface MentorCardProps {
  mentor: Mentor
}



export function MentorCard({ mentor }: MentorCardProps) {
  const initials = mentor.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()

  // Format bio with proper line breaks
  const MAX_SENTENCES = 2

const formattedBio = mentor.bio
  .split(". ")
  .slice(0, MAX_SENTENCES)
  .map((sentence, i, arr) => (
    <span key={i}>
      {sentence.trim()}
      {i < arr.length - 1 ? ". " : mentor.bio.split(". ").length > MAX_SENTENCES ? "..." : "."}
    </span>
  ))

  const slug = `${mentor.name}`.toLowerCase().replace(/\s+/g, "-")

  return (
    <Card className="group hover:shadow-2xl transition-all duration-500 cursor-pointer border-0 shadow-lg hover:-translate-y-2 bg-white rounded-3xl overflow-hidden relative">
      <CardContent className="p-8">
        <div className="flex items-start gap-8">
          {/* Left Section - Avatar and Basic Info */}
          <div className="flex-shrink-0">
            <div className="relative">
              <Avatar className="w-32 h-32 shadow-2xl">
                <AvatarImage src={mentor.avatar || "/default-avatar.png"} alt={mentor.name} />
                <AvatarFallback className="bg-gradient-to-br from-purple-600 to-blue-600 text-white font-bold text-3xl">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
            {/* Location */}
            <div className="flex items-center justify-center text-sm text-gray-500 mt-4">
              <MapPin className="w-4 h-4 mr-2 text-gray-400" />
              <span className="font-medium">{mentor.country}</span>
            </div>
          </div>

          {/* Middle Section - Main Info */}
          <div className="flex-1 min-w-0">
            <div className="mb-6">
              <h3 className="text-3xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors mb-2">
                {mentor.name}
              </h3>
              <p className="text-lg font-semibold text-gray-600 mb-4">{mentor.title}</p>

              {/* Rating and Experience Row */}
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <div className="flex items-center bg-gray-50 px-4 py-2 rounded-full">
                  <Star className="w-5 h-5 text-yellow-500 fill-current mr-2" />
                  <span className="font-bold text-gray-900 text-lg">{mentor.rating.toFixed(1)}</span>
                  <span className="text-gray-600 ml-1">({mentor.reviewCount} reviews)</span>
                </div>
                <div className="flex items-center bg-gray-50 px-4 py-2 rounded-full">
                  <Award className="w-5 h-5 text-gray-600 mr-2" />
                  <span className="font-medium text-gray-700 text-lg">{mentor.experience} years exp</span>
                </div>
                <div className="flex items-center bg-gray-50 px-4 py-2 rounded-full">
                  <Users className="w-5 h-5 text-gray-600 mr-2" />
                  <span className="font-medium text-gray-700 text-lg">{mentor.reviewCount} sessions</span>
                </div>
              </div>

              {/* Bio */}
              <p className="text-gray-700 leading-relaxed text-lg mb-6">{formattedBio}</p>

              {/* Skills */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-800 mb-3">Skills:</h4>
                <div className="flex flex-wrap gap-3">
                  {mentor.skills.map((skill, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="text-sm font-medium px-4 py-2 bg-gray-100 text-gray-700 border-gray-200 rounded-2xl"
                    >
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Languages */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-800 mb-3">Languages:</h4>
                <div className="flex items-center gap-3">
                  <Languages className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-700 text-lg font-medium">{mentor.languages.join(", ")}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Section - Pricing and Actions */}
          <div className="flex-shrink-0 w-80">
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-8 border border-purple-100">
              {/* Pricing */}
              <div className="text-center mb-8">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Coins className="w-8 h-8 text-purple-600" />
                  <span className="text-4xl font-bold text-purple-700">{mentor.hourlyRate}</span>
                </div>
                <div className="text-lg text-gray-600 font-medium">credits per session</div>
                <div className="text-sm text-gray-500 mt-1">
                  ≈ ${(mentor.hourlyRate / 5)}/hour
                </div>
              </div>

              {/* Session Stats */}
              <div className="space-y-4 mb-8">
                <div className="flex items-center justify-between p-3 bg-white rounded-xl">
                  <span className="text-gray-600 font-medium">Total Sessions</span>
                  <span className="text-gray-900 font-semibold">{mentor.reviewCount}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white rounded-xl">
                  <span className="text-gray-600 font-medium">Experience</span>
                  <span className="text-gray-900 font-semibold">{mentor.experience} years</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white rounded-xl">
                  <span className="text-gray-600 font-medium">Rating</span>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    <span className="text-gray-900 font-semibold">{mentor.rating.toFixed(1)}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                 <Link href={`/mentors/${mentor.id}/${slug}`}>
                  <Button
                    size="lg"
                    className="w-[80%] ml-6 gradient-bg hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                  >
                    View Profile
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
