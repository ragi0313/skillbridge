"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Star, MessageSquare, Calendar } from "lucide-react"
import { format } from "date-fns"

interface Review {
  id: number
  sessionId: number
  reviewText: string | null
  rating: number
  createdAt: string
  learnerName: string
  learnerProfilePicture: string | null
}

interface MentorReviewsSectionProps {
  mentorId: number
}

export function MentorReviewsSection({ mentorId }: MentorReviewsSectionProps) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [averageRating, setAverageRating] = useState<number | null>(null)
  const [totalReviews, setTotalReviews] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const response = await fetch(`/api/reviews?mentorId=${mentorId}&limit=50`)
        if (!response.ok) {
          throw new Error("Failed to fetch reviews")
        }
        const data = await response.json()
        setReviews(data.reviews || [])
        setAverageRating(data.averageRating)
        setTotalReviews(data.totalReviews || 0)
      } catch (error) {
        console.error("Error fetching reviews:", error)
      } finally {
        setLoading(false)
      }
    }

    if (mentorId) {
      fetchReviews()
    }
  }, [mentorId])

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            }`}
          />
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <Card className="shadow-lg border-0">
        <CardHeader>
          <CardTitle>My Reviews</CardTitle>
          <CardDescription>Loading your reviews...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-start gap-4 p-4 border rounded-lg">
                  <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-full"></div>
                    <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-lg border-0">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>My Reviews</CardTitle>
            <CardDescription>See what learners are saying about your mentorship</CardDescription>
          </div>
          {averageRating !== null && (
            <div className="flex flex-col items-start sm:items-end">
              <div className="flex items-center gap-2 mb-1">
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <span className="text-2xl font-bold text-gray-900">{averageRating.toFixed(1)}</span>
                <span className="text-sm text-gray-500">/ 5.0</span>
              </div>
              <p className="text-sm text-gray-600">{totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}</p>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {reviews.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No reviews yet</h3>
            <p className="text-gray-600">
              Your reviews from learners will appear here after completed sessions.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="flex flex-col sm:flex-row sm:items-start gap-4 p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow bg-white"
              >
                {/* Learner Avatar */}
                <Avatar className="w-12 h-12 flex-shrink-0">
                  <AvatarImage
                    src={review.learnerProfilePicture || "/default-avatar.png"}
                    alt={review.learnerName}
                  />
                  <AvatarFallback className="bg-blue-100 text-blue-700">
                    {review.learnerName.split(" ").map((n) => n[0]).join("").toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                {/* Review Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                    <div>
                      <h4 className="font-semibold text-gray-900">{review.learnerName}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        {renderStars(review.rating)}
                        <Badge variant="outline" className="text-xs">
                          {review.rating}.0
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="w-4 h-4" />
                      <span>{format(new Date(review.createdAt), "MMM d, yyyy")}</span>
                    </div>
                  </div>

                  {review.reviewText && (
                    <p className="text-gray-700 text-sm sm:text-base leading-relaxed mt-3">
                      {review.reviewText}
                    </p>
                  )}

                  {!review.reviewText && (
                    <p className="text-gray-400 text-sm italic mt-3">
                      No written feedback provided
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
