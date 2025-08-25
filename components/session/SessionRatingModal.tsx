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
      <DialogContent className="sm:max-w-[425px]" onPointerDownOutside={(e) => isSubmitting && e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Rate Your Session</DialogTitle>
          <DialogDescription>
            How was your mentoring session? Your feedback helps us improve the platform.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Star Rating */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Rating (Required) *</Label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`p-1 transition-colors hover:scale-110 ${
                    isSubmitting ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                  }`}
                  onClick={() => !isSubmitting && handleStarClick(star)}
                  onMouseEnter={() => !isSubmitting && handleStarHover(star)}
                  onMouseLeave={() => !isSubmitting && handleStarLeave()}
                  disabled={isSubmitting}
                >
                  <Star
                    className={`h-8 w-8 transition-colors ${
                      star <= displayRating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300 hover:text-yellow-400'
                    }`}
                  />
                </button>
              ))}
              {displayRating > 0 && (
                <span className="ml-2 text-sm font-medium text-gray-600">
                  {getRatingText(displayRating)}
                </span>
              )}
            </div>
          </div>

          {/* Review Text */}
          <div className="space-y-3">
            <Label htmlFor="review" className="text-base font-medium">
              Comments (Optional)
            </Label>
            <Textarea
              id="review"
              placeholder="Share your experience with this mentor... (optional)"
              value={review}
              onChange={(e) => setReview(e.target.value)}
              className="min-h-[100px] resize-none"
              maxLength={1000}
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-500">
              {review.length}/1000 characters
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-6"
          >
            Skip for Now
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || rating === 0}
            className="px-6"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Submitting...
              </>
            ) : (
              "Rate Mentor"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}