"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Star, MapPin, Clock, DollarSign, MessageCircle, Calendar } from "lucide-react"
import type { Mentor } from "./types"

interface MentorCardProps {
  mentor: Mentor
}

// Helper function to get country flag emoji
const getCountryFlag = (country: string): string => {
  const countryFlags: { [key: string]: string } = {
    "United States": "🇺🇸",
    Canada: "🇨🇦",
    "United Kingdom": "🇬🇧",
    Germany: "🇩🇪",
    France: "🇫🇷",
    Spain: "🇪🇸",
    Italy: "🇮🇹",
    Netherlands: "🇳🇱",
    Sweden: "🇸🇪",
    Norway: "🇳🇴",
    Denmark: "🇩🇰",
    Finland: "🇫🇮",
    Australia: "🇦🇺",
    "New Zealand": "🇳🇿",
    Japan: "🇯🇵",
    "South Korea": "🇰🇷",
    Singapore: "🇸🇬",
    India: "🇮🇳",
    Brazil: "🇧🇷",
    Mexico: "🇲🇽",
    Argentina: "🇦🇷",
    Chile: "🇨🇱",
    "South Africa": "🇿🇦",
    Israel: "🇮🇱",
    UAE: "🇦🇪",
    Switzerland: "🇨🇭",
    Austria: "🇦🇹",
    Belgium: "🇧🇪",
    Portugal: "🇵🇹",
    Ireland: "🇮🇪",
    Poland: "🇵🇱",
    "Czech Republic": "🇨🇿",
    Hungary: "🇭🇺",
    Romania: "🇷🇴",
    Bulgaria: "🇧🇬",
    Croatia: "🇭🇷",
    Slovenia: "🇸🇮",
    Slovakia: "🇸🇰",
    Estonia: "🇪🇪",
    Latvia: "🇱🇻",
    Lithuania: "🇱🇹",
    Greece: "🇬🇷",
    Turkey: "🇹🇷",
    Russia: "🇷🇺",
    Ukraine: "🇺🇦",
    China: "🇨🇳",
    Taiwan: "🇹🇼",
    "Hong Kong": "🇭🇰",
    Thailand: "🇹🇭",
    Vietnam: "🇻🇳",
    Philippines: "🇵🇭",
    Indonesia: "🇮🇩",
    Malaysia: "🇲🇾",
  }
  return countryFlags[country] || "🌍"
}

export function MentorCard({ mentor }: MentorCardProps) {
  const initials = mentor.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()

  return (
    <Card className="group hover:shadow-2xl transition-all duration-300 border-0 bg-white rounded-3xl overflow-hidden transform hover:-translate-y-2">
      <CardContent className="p-0">
        {/* Header with Avatar and Basic Info */}
        <div className="relative p-8 pb-6">
          <div className="flex items-start gap-6">
            <div className="relative">
              <Avatar className="h-20 w-20 border-4 border-white shadow-lg">
                <AvatarImage src={mentor.avatar || "/default-avatar.png"} alt={mentor.name} />
                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div
                className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-3 border-white ${
                  mentor.isAvailable ? "bg-green-500" : "bg-gray-400"
                }`}
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1 truncate">{mentor.name}</h3>
                  <p className="text-purple-600 font-semibold text-sm mb-2">{mentor.title}</p>
                </div>
                <div className="flex items-center gap-1 bg-yellow-50 px-3 py-1 rounded-full">
                  <Star className="h-4 w-4 text-yellow-500 fill-current" />
                  <span className="text-sm font-bold text-gray-900">{mentor.rating.toFixed(1)}</span>
                  <span className="text-xs text-gray-600">({mentor.reviewCount})</span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {getCountryFlag(mentor.country)} {mentor.country}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{mentor.experience} years exp.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bio */}
        <div className="px-8 pb-6">
          <p className="text-gray-700 text-sm leading-relaxed line-clamp-3">{mentor.bio}</p>
        </div>

        {/* Skills */}
        <div className="px-8 pb-6">
          <div className="flex flex-wrap gap-2">
            {mentor.skills.slice(0, 4).map((skill) => (
              <Badge
                key={skill}
                variant="secondary"
                className="bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors text-xs px-3 py-1 rounded-full font-medium"
              >
                {skill}
              </Badge>
            ))}
            {mentor.skills.length > 4 && (
              <Badge variant="outline" className="text-gray-500 border-gray-300 text-xs px-3 py-1 rounded-full">
                +{mentor.skills.length - 4} more
              </Badge>
            )}
          </div>
        </div>

        {/* Languages */}
        <div className="px-8 pb-6">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="font-medium">Languages:</span>
            <span>{mentor.languages.join(", ")}</span>
          </div>
        </div>

        {/* Footer with Price and Actions */}
        <div className="px-8 pb-8">
          <div className="flex items-center justify-between pt-6 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold text-gray-900">{mentor.hourlyRate}</span>
              <span className="text-sm text-gray-600">credits/hour</span>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                className="border-2 border-purple-200 text-purple-600 hover:bg-purple-50 hover:border-purple-300 rounded-xl font-semibold transition-all duration-200 bg-transparent"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Message
              </Button>
              <Button
                size="sm"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-semibold px-6 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Book Session
              </Button>
            </div>
          </div>
        </div>

        {/* Availability Status */}
        <div className={`px-8 py-3 ${mentor.isAvailable ? "bg-green-50" : "bg-gray-50"}`}>
          <div className="flex items-center justify-center gap-2 text-sm font-medium">
            <div className={`w-2 h-2 rounded-full ${mentor.isAvailable ? "bg-green-500" : "bg-gray-400"}`} />
            <span className={mentor.isAvailable ? "text-green-700" : "text-gray-600"}>
              {mentor.isAvailable ? "Available for sessions" : "Currently unavailable"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
