import { notFound } from "next/navigation"
import { Star, MapPin, Award, Languages, CheckCircle, MessageCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Header from "@/components/landing/Header"
import BookingWidget from "@/components/mentors-overview/BookingWidget"

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
      <section className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white py-55"></section>

      <div className="relative max-w-7xl mx-auto px-10 z-20 py-10">
        <div className="flex-shrink-0 relative">
          <div className="absolute w-32 h-32 sm:w-40 sm:h-40 lg:w-50 lg:h-50 rounded-full overflow-hidden border-4 border-white shadow-2xl -top-35">
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

        <div className="flex-1 flex-col mt-4 sm:mt-12 lg:mt-20">
          <h1 className="text-xl sm:text-3xl lg:text-4xl font-semibold mb-2">
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
        <div className="mx-auto py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-12">
              {/* Skills Section */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Skills</h2>
                <div className="flex flex-wrap gap-3">
                  {mentor.skills.slice(0, 10).map((skill, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm font-medium"
                    >
                      {skill}
                    </Badge>
                  ))}
                </div>

                {mentor.skills.length > 10 && (
                  <Button variant="ghost" className="text-teal-600 hover:text-teal-700 p-0 h-auto font-medium mt-2">
                    + {mentor.skills.length - 10} more
                  </Button>
                )}
              </div>

              {/* About Section */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">About</h2>
                <div className="prose prose-gray max-w-none">
                  <p className="text-gray-700 leading-relaxed mb-4">{mentor.bio}</p>
                  <Button variant="ghost" className="text-teal-600 hover:text-teal-700 p-0 h-auto font-medium">
                    Read more
                  </Button>
                </div>
              </div>

              {/* Open to Inquiries */}
              <Card className="bg-gray-50 border-0">
                <CardContent className="px-6 py-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <MessageCircle className="w-8 h-8 text-gray-600" />
                      <div>
                        <h3 className="font-semibold text-gray-900">Open to inquiries</h3>
                        <p className="text-gray-600">
                          You can message {mentor.firstName} to ask questions before booking their services
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" className="cursor-pointer bg-transparent">
                      Message
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Reviews Section */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Comments & Reviews</h2>
                  <Select defaultValue="recommended">
                    <SelectTrigger className="w-50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recommended">Sort by: Recommended</SelectItem>
                      <SelectItem value="recent">Sort by: Most Recent</SelectItem>
                      <SelectItem value="rating">Sort by: Highest Rating</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {mentor.reviews.length === 0 ? (
                  <div className="border border-dashed border-gray-300 rounded-md p-8 text-center">
                    <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No reviews yet</h3>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {mentor.reviews.map((review, index) => (
                      <div key={index} className="py-6">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                            <span className="text-gray-600 font-medium">
                              {review.learnerName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-4 mb-2 flex-wrap">
                              <h4 className="font-semibold text-gray-900">{review.learnerName}</h4>
                              <div className="flex items-center gap-1">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-4 h-4 ${
                                      i < review.rating ? "text-yellow-400 fill-current" : "text-gray-300"
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-gray-500 text-sm">
                                {new Date(review.createdAt).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                })}
                              </span>
                            </div>
                            <p className="text-gray-700 leading-relaxed">{review.reviewText}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
