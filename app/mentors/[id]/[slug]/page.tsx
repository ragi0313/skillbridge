//app/mentors/[id]/[slug]/page.tsx

import { notFound } from "next/navigation"
import {
  Star,
  MapPin,
  Award,
  Languages,
  MessageCircle,
  Twitter,
  Github,
  Globe,
  Linkedin,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import BookingWidget from "@/components/mentors/BookingWidget"
import UnifiedHeader from "@/components/UnifiedHeader"
import { MessageMentorButtonWrapper as MessageMentorButton } from "@/components/mentors/MessageMentorButtonWrapper"
import { getMentorById, type MentorData } from "@/lib/data/mentors"
import { AboutSection } from "@/components/mentors/AboutSection"
import { SkillsDisplay } from "@/components/mentors/SkillsDisplay"
import { ReviewsSection } from "@/components/mentors/ReviewsSection"

export default async function MentorProfilePage({
  params,
}: {
  params: Promise<{ id: string; slug: string }>
}) {
  const { id, slug } = await params

  const mentorId = parseInt(id)
  if (isNaN(mentorId)) {
    return notFound()
  }

  const mentor = await getMentorById(mentorId)

  if (!mentor) {
    return notFound()
  }

  const expectedSlug = `${mentor.firstName}-${mentor.lastName}`
    .toLowerCase()
    .replace(/\s+/g, "-")
  if (slug !== expectedSlug) return notFound()

  // Data is already properly formatted from getMentorById
  const parsedSocialLinks = mentor.socialLinks
  const parsedSkills = Array.isArray(mentor.skills) ? mentor.skills : []

  // Parse languages if it's a JSON string
  let parsedLanguages: string[] = []
  try {
    if (mentor.languages) {
      if (typeof mentor.languages === 'string') {
        const parsed = JSON.parse(mentor.languages)
        parsedLanguages = Array.isArray(parsed) ? parsed : []
      } else if (Array.isArray(mentor.languages)) {
        parsedLanguages = mentor.languages
      }
    }
  } catch (error) {
    console.error('Failed to parse languages:', error)
    parsedLanguages = []
  }

  const reviews = mentor.reviews
  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0

  const rates = mentor.rates
  const averageRate =
    Object.values(rates).length > 0
      ? Math.round(
          Object.values(rates).reduce((sum, rate) => sum + rate, 0) /
            Object.values(rates).length,
        )
      : 0

  return (
    <div>
      <UnifiedHeader />
      <section className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 py-55"></section>

      <div className="relative max-w-7xl mx-auto px-10 z-20 py-10">
        <div className="flex-shrink-0 relative">
          <div className="absolute w-32 h-32 sm:w-40 sm:h-40 lg:w-50 lg:h-50 rounded-full overflow-hidden border-4 border-white shadow-2xl -top-35">
            <img
              src={mentor.profilePictureUrl || "/placeholder.svg"}
              alt={`${mentor.firstName} ${mentor.lastName}`}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <div className="flex-1 flex-col mt-4 sm:mt-12 lg:mt-20">
          <h1 className="text-xl sm:text-3xl lg:text-4xl font-semibold mb-2">
            {mentor.firstName} {mentor.lastName}
          </h1>
          <p className="text-md text-gray-700 sm:text-lg mb-6 font-medium">
            {mentor.professionalTitle}
          </p>

          {/* Grouped Grid Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:mr-50 gap-y-6 mb-15 text-gray-700">
            {/* Column 1 */}
            <div className="space-y-3">
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
                <span className="font-medium">{parsedLanguages.length > 0 ? parsedLanguages.join(", ") : "Not specified"}</span>
              </div>

              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 fill-current text-yellow-300" />
                <span className="font-medium">
                  {averageRating.toFixed(1)} ({reviews.length} reviews)
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {/* Skills - Display all skills in columns */}
              <SkillsDisplay skills={parsedSkills} />

              {/* LinkedIn + Social Links */}
              <div className="flex items-center gap-4 ml-2">
                {mentor.linkedInUrl && (
                  <a
                    href={mentor.linkedInUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 hover:text-blue-600"
                  >
                    <Linkedin className="w-5 h-5" />
                  </a>
                )}

                {parsedSocialLinks && Array.isArray(parsedSocialLinks) && parsedSocialLinks.length > 0 ? (
                  parsedSocialLinks.map((item, i) => (
                    item && item.url ? (
                      <a
                        key={i}
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-600 hover:text-blue-600"
                      >
                        {item.label === "GitHub" && <Github className="w-5 h-5" />}
                        {item.label === "Twitter" && <Twitter className="w-5 h-5" />}
                        {item.label === "Portfolio" && <Globe className="w-5 h-5" />}
                      </a>
                    ) : null
                  ))
                ) : !mentor.linkedInUrl ? (
                  <p className="text-sm text-gray-500">No social links provided</p>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="mx-auto py-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-3 space-y-12">
              {/* About Section */}
              <AboutSection bio={mentor.bio} />

              {/* Open to Inquiries */}
              <Card className="bg-gray-50 border-0">
                <CardContent className="px-6 py-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <MessageCircle className="w-8 h-8 text-gray-600" />
                      <div>
                        <h3 className="font-semibold text-gray-900">Open to inquiries</h3>
                        <p className="text-gray-600">
                          You can message {mentor.firstName} to ask questions before booking their
                          services
                        </p>
                      </div>
                    </div>
                    <MessageMentorButton
                      mentorUserId={mentor.userId}
                      mentorName={`${mentor.firstName} ${mentor.lastName}`}
                      className="cursor-pointer bg-transparent"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Reviews Section */}
              <ReviewsSection reviews={reviews} />
            </div>

            {/* Right Column - Booking Widget */}
            <div className="lg:col-span-1">
              <BookingWidget mentor={mentor} averageRate={averageRate} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
