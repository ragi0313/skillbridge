"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Star } from "lucide-react"
import { toast } from "@/lib/toast"

interface SessionRatingModalProps {
  sessionId: number
  onClose: () => void
}

export function SessionRatingModal({
  sessionId,
  onClose
}: SessionRatingModalProps) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [review, setReview] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Please select a star rating for your mentor")
      return
    }

    try {
      setIsSubmitting(true)
      
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          rating,
          reviewText: review.trim(),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to submit review")
      }

      toast.success("Thank you for your review!")
      onClose()
    } catch (error: any) {
      console.error("Error submitting mentor rating:", error)
      toast.error(error.message || "Failed to submit rating. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStarClick = (value: number) => {
    setRating(value)
  }

  const handleStarHover = (value: number) => {
    setHoverRating(value)
  }

  const handleStarLeave = () => {
    setHoverRating(0)
  }

  const displayRating = hoverRating || rating

  const getRatingText = (rating: number) => {
    switch (rating) {
      case 1: return "Poor"
      case 2: return "Fair"  
      case 3: return "Good"
      case 4: return "Great"
      case 5: return "Excellent"
      default: return ""
    }
  }

  return (
    <Dialog open={true} onOpenChange={() => !isSubmitting && onClose()}>
      <DialogContent className="sm:max-w-[500px]" onPointerDownOutside={(e) => isSubmitting && e.preventDefault()}>
        <DialogHeader className="space-y-4 pb-2">
          <div className="text-center">
            <div className="text-4xl mb-3">⭐</div>
            <DialogTitle className="text-2xl font-bold text-gray-900">Rate Your Session</DialogTitle>
            <DialogDescription className="text-gray-600 mt-2">
              How was your mentoring session? Your feedback helps us improve the platform and assists other learners.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-8 py-6">
          {/* Star Rating */}
          <div className="space-y-4">
            <div className="text-center">
              <Label className="text-lg font-semibold text-gray-900">How would you rate your mentor?</Label>
              <p className="text-sm text-gray-500 mt-1">Click on the stars to rate your experience</p>
            </div>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`p-2 transition-all duration-200 hover:scale-125 rounded-full ${
                    isSubmitting ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-yellow-50'
                  }`}
                  onClick={() => !isSubmitting && handleStarClick(star)}
                  onMouseEnter={() => !isSubmitting && handleStarHover(star)}
                  onMouseLeave={() => !isSubmitting && handleStarLeave()}
                  disabled={isSubmitting}
                >
                  <Star
                    className={`h-10 w-10 transition-all duration-200 ${
                      star <= displayRating
                        ? 'fill-yellow-400 text-yellow-400 drop-shadow-sm'
                        : 'text-gray-300 hover:text-yellow-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            {displayRating > 0 && (
              <div className="text-center">
                <span className="inline-block px-4 py-2 bg-yellow-100 text-yellow-800 rounded-full text-base font-semibold">
                  {getRatingText(displayRating)}
                </span>
              </div>
            )}
          </div>

          {/* Review Text */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="review" className="text-lg font-semibold text-gray-900">
                Share your experience (Optional)
              </Label>
              <p className="text-sm text-gray-500 mt-1">
                Help other learners by sharing what made this session valuable
              </p>
            </div>
            <div className="relative">
              <Textarea
                id="review"
                placeholder="What did you learn? How was your mentor's teaching style? Would you recommend them to other learners?"
                value={review}
                onChange={(e) => setReview(e.target.value)}
                className="min-h-[120px] resize-none border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg"
                maxLength={1000}
                disabled={isSubmitting}
              />
              <div className="absolute bottom-3 right-3">
                <span className={`text-xs ${review.length > 900 ? 'text-red-500' : 'text-gray-400'}`}>
                  {review.length}/1000
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center gap-4 pt-6 border-t">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-6 text-gray-500 hover:text-gray-700"
          >
            Skip for Now
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || rating === 0}
            className={`px-8 py-2.5 font-semibold ${
              rating === 0 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200'
            }`}
          >
            {isSubmitting ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-3"></div>
                Submitting Review...
              </div>
            ) : (
              <div className="flex items-center">
                <Star className="w-4 h-4 mr-2" />
                Submit Rating
              </div>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}