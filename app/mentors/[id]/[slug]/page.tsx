import { notFound } from "next/navigation"
import {
  Star,
  MapPin,
  Award,
  Languages,
  CheckCircle,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"
import Header from "@/components/landing/Header"

interface MentorData {
  id: number
  firstName: string
  lastName: string
  profilePictureUrl: string
  country: string
  timezone: string
  languages: string[]
  professionalTitle: string
  bio: string
  yearsOfExperience: number
  linkedInUrl: string
  socialLinks: Record<string, string>
  skills: string[]
  rates: Record<string, number>
  isAvailable?: boolean
  reviews: {
    rating: number
    reviewText: string
    createdAt: string
    learnerName: string
  }[]
}

export default async function MentorProfilePage({
  params,
}: {
  params: Promise<{ id: string; slug: string }>
}) {
  const { id, slug } = await params
  
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mentors/${id}`, {
    cache: "no-store",
  })

  if (!res.ok) return notFound()
  const mentor: MentorData = await res.json()

  const expectedSlug = `${mentor.firstName}-${mentor.lastName}`.toLowerCase().replace(/\s+/g, "-")
  if (slug !== expectedSlug) return notFound()

  const averageRating =
    mentor.reviews.length > 0
      ? mentor.reviews.reduce((sum, review) => sum + review.rating, 0) / mentor.reviews.length
      : 0

  const averageRate =
    Object.values(mentor.rates).length > 0
      ? Math.round(
          Object.values(mentor.rates).reduce((sum, rate) => sum + rate, 0) / Object.values(mentor.rates).length,
        )
      : 0

  return (
    <div>
      <Header />
      <section
        className="bg-gray-900 text-white py-55"
        style={{
          backgroundImage: `url(${mentor.profilePictureUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      ></section>

      <div className="relative max-w-7xl mx-auto px-10 z-20 py-10">
        <div className="flex-shrink-0 relative">
          <div className="absolute w-32 h-32 sm:w-40 sm:h-40 lg:w-50 lg:h-50 rounded-full overflow-hidden border-4 border-white shadow-2xl -top-30">
            <img
              src={mentor.profilePictureUrl || "/placeholder.svg"}
              alt={`${mentor.firstName} ${mentor.lastName}`}
              className="w-full h-full object-cover"
            />
          </div>
          {mentor.isAvailable && (
            <div className="absolute -bottom-2 -right-2 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
              <CheckCircle className="w-4 h-4" />
              Available
            </div>
          )}
        </div>

        <div className="flex-1 flex-col mt-4 sm:mt-12 lg:mt-22">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold mb-2">
            {mentor.firstName} {mentor.lastName}
          </h1>
          <p className="text-md text-gray-700 sm:text-lg mb-4 font-medium">{mentor.professionalTitle}</p>

          <div className="flex flex-col flex-wrap gap-4 mb-6 text-gray-700">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-purple-500" />
              <span className="font-medium">{mentor.country}</span>
            </div>
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-purple-500" />
              <span className="font-medium">{mentor.yearsOfExperience} years experience</span>
            </div>
            <div className="flex items-center gap-2">
              <Languages className="w-5 h-5 text-purple-500" />
              <span className="font-medium">{mentor.languages.join(", ")}</span>
            </div>
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 fill-current text-yellow-300" />
                <span className="font-medium">
                  {averageRating.toFixed(1)} ({mentor.reviews.length} reviews)
                </span>
              </div>
          </div>
        </div>
      </div>
    </div>
  )
}