"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Star, Clock, Users, BookOpen, Lightbulb, ThumbsUp, ThumbsDown } from "lucide-react"
import { toast } from "@/lib/toast"

interface SessionFeedbackModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmitted?: () => void
  sessionId: number
  userRole: "learner" | "mentor"
  otherParticipant: {
    firstName: string
    lastName: string
    profilePictureUrl?: string | null
  }
  sessionData: {
    durationMinutes: number
    skillName?: string
    totalCostCredits?: number
  }
}

interface FeedbackData {
  overall_rating: number
  communication_rating: number
  knowledge_rating: number
  helpfulness_rating: number
  punctuality_rating: number
  feedback_text: string
  session_highlights: string[]
  improvement_suggestions: string
  would_recommend: boolean | null
  session_pace: 'too_slow' | 'just_right' | 'too_fast' | null
  most_valuable_aspect: string
}

export function SessionFeedbackModal({
  isOpen,
  onClose,
  onSubmitted,
  sessionId,
  userRole,
  otherParticipant,
  sessionData,
}: SessionFeedbackModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [feedback, setFeedback] = useState<FeedbackData>({
    overall_rating: 0,
    communication_rating: 0,
    knowledge_rating: 0,
    helpfulness_rating: 0,
    punctuality_rating: 0,
    feedback_text: "",
    session_highlights: [],
    improvement_suggestions: "",
    would_recommend: null,
    session_pace: null,
    most_valuable_aspect: "",
  })

  const totalSteps = 3

  const handleRatingChange = (category: keyof FeedbackData, rating: number) => {
    setFeedback(prev => ({ ...prev, [category]: rating }))
  }

  const handleHighlightToggle = (highlight: string) => {
    setFeedback(prev => ({
      ...prev,
      session_highlights: prev.session_highlights.includes(highlight)
        ? prev.session_highlights.filter(h => h !== highlight)
        : [...prev.session_highlights, highlight]
    }))
  }

  const handleSubmit = async () => {
    if (feedback.overall_rating === 0) {
      toast.error("Please provide an overall rating")
      return
    }

    if (!feedback.feedback_text.trim()) {
      toast.error("Please provide some feedback")
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/sessions/${sessionId}/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userRole,
          ...feedback,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to submit feedback")
      }

      toast.success("Thank you for your feedback!")
      if (onSubmitted) {
        onSubmitted()
      } else {
        onClose()
      }
    } catch (error) {
      console.error("Error submitting feedback:", error)
      toast.error("Failed to submit feedback. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStarRating = (category: keyof FeedbackData, label: string, description: string) => {
    const rating = feedback[category] as number
    return (
      <div className="space-y-2">
        <div>
          <Label className="text-sm font-medium text-gray-900">{label}</Label>
          <p className="text-xs text-gray-600">{description}</p>
        </div>
        <div className="flex items-center space-x-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => handleRatingChange(category, star)}
              className="p-1 hover:scale-110 transition-transform"
            >
              <Star
                className={`w-6 h-6 ${
                  star <= rating
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-gray-300 hover:text-yellow-300"
                }`}
              />
            </button>
          ))}
          <span className="ml-2 text-sm text-gray-600">
            {rating > 0 && (
              rating === 5 ? "Excellent" :
              rating === 4 ? "Good" :
              rating === 3 ? "Average" :
              rating === 2 ? "Poor" : "Very Poor"
            )}
          </span>
        </div>
      </div>
    )
  }

  const highlights = [
    "Clear explanations",
    "Helpful examples",
    "Good listening skills",
    "Prepared materials",
    "Interactive approach",
    "Problem-solving focus",
    "Encouraging attitude",
    "Technical expertise",
    "Practical advice",
    "Good communication"
  ]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900">
            Session Feedback
          </DialogTitle>
          <div className="flex items-center space-x-3 mt-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
              {otherParticipant.profilePictureUrl ? (
                <img
                  src={otherParticipant.profilePictureUrl}
                  alt={`${otherParticipant.firstName} ${otherParticipant.lastName}`}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-white font-semibold">
                  {otherParticipant.firstName.charAt(0)}{otherParticipant.lastName.charAt(0)}
                </span>
              )}
            </div>
            <div>
              <h3 className="font-medium text-gray-900">
                Session with {otherParticipant.firstName} {otherParticipant.lastName}
              </h3>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span>{sessionData.durationMinutes} minutes</span>
                </div>
                {sessionData.skillName && (
                  <div className="flex items-center space-x-1">
                    <BookOpen className="w-4 h-4" />
                    <span>{sessionData.skillName}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="py-6">
          {/* Progress indicator */}
          <div className="flex items-center justify-between mb-8">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`flex items-center ${step < totalSteps ? 'flex-1' : ''}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step <= currentStep
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {step}
                </div>
                {step < totalSteps && (
                  <div
                    className={`flex-1 h-1 mx-4 ${
                      step < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Overall Rating */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Rate Your Experience</h3>

              {renderStarRating(
                "overall_rating",
                "Overall Experience",
                "How would you rate this session overall?"
              )}

              {renderStarRating(
                "communication_rating",
                "Communication",
                userRole === "learner"
                  ? "How well did your mentor communicate and explain concepts?"
                  : "How well did your learner communicate their needs and questions?"
              )}

              {renderStarRating(
                "knowledge_rating",
                userRole === "learner" ? "Expertise" : "Engagement",
                userRole === "learner"
                  ? "How knowledgeable was your mentor in the subject area?"
                  : "How engaged was your learner during the session?"
              )}

              {renderStarRating(
                "helpfulness_rating",
                "Helpfulness",
                userRole === "learner"
                  ? "How helpful was your mentor in addressing your needs?"
                  : "How well were you able to help the learner?"
              )}

              {renderStarRating(
                "punctuality_rating",
                "Punctuality",
                "How punctual and prepared was the other person?"
              )}
            </div>
          )}

          {/* Step 2: Session Details */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Session Details</h3>

              {/* Session Highlights */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-900">
                  What were the highlights of this session? (Select all that apply)
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {highlights.map((highlight) => (
                    <button
                      key={highlight}
                      type="button"
                      onClick={() => handleHighlightToggle(highlight)}
                      className={`p-3 text-sm rounded-lg border transition-all ${
                        feedback.session_highlights.includes(highlight)
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      {highlight}
                    </button>
                  ))}
                </div>
              </div>

              {/* Session Pace */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-900">
                  How was the pace of the session?
                </Label>
                <div className="flex space-x-3">
                  {[
                    { value: 'too_slow', label: 'Too Slow', icon: '🐌' },
                    { value: 'just_right', label: 'Just Right', icon: '👍' },
                    { value: 'too_fast', label: 'Too Fast', icon: '🏃' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFeedback(prev => ({ ...prev, session_pace: option.value as any }))}
                      className={`flex-1 p-3 rounded-lg border transition-all ${
                        feedback.session_pace === option.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-lg mb-1">{option.icon}</div>
                        <div className="text-sm font-medium">{option.label}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Would Recommend */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-900">
                  Would you recommend this {userRole === "learner" ? "mentor" : "learner"} to others?
                </Label>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setFeedback(prev => ({ ...prev, would_recommend: true }))}
                    className={`flex-1 p-3 rounded-lg border transition-all ${
                      feedback.would_recommend === true
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <ThumbsUp className="w-5 h-5" />
                      <span>Yes</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeedback(prev => ({ ...prev, would_recommend: false }))}
                    className={`flex-1 p-3 rounded-lg border transition-all ${
                      feedback.would_recommend === false
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <ThumbsDown className="w-5 h-5" />
                      <span>No</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Written Feedback */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Additional Feedback</h3>

              <div className="space-y-3">
                <Label htmlFor="feedback_text" className="text-sm font-medium text-gray-900">
                  Share your experience *
                </Label>
                <Textarea
                  id="feedback_text"
                  value={feedback.feedback_text}
                  onChange={(e) => setFeedback(prev => ({ ...prev, feedback_text: e.target.value }))}
                  placeholder={`Tell us about your session with ${otherParticipant.firstName}. What went well? What could be improved?`}
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-gray-500">
                  {feedback.feedback_text.length}/500 characters
                </p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="most_valuable" className="text-sm font-medium text-gray-900">
                  What was the most valuable aspect of this session?
                </Label>
                <Textarea
                  id="most_valuable"
                  value={feedback.most_valuable_aspect}
                  onChange={(e) => setFeedback(prev => ({ ...prev, most_valuable_aspect: e.target.value }))}
                  placeholder="What did you find most helpful or valuable?"
                  rows={2}
                  className="resize-none"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="improvements" className="text-sm font-medium text-gray-900">
                  Suggestions for improvement
                </Label>
                <Textarea
                  id="improvements"
                  value={feedback.improvement_suggestions}
                  onChange={(e) => setFeedback(prev => ({ ...prev, improvement_suggestions: e.target.value }))}
                  placeholder="Any suggestions for how this session could have been better?"
                  rows={2}
                  className="resize-none"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <div className="flex justify-between w-full">
            <div>
              {currentStep > 1 && (
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(prev => prev - 1)}
                >
                  Previous
                </Button>
              )}
            </div>
            <div className="flex space-x-3">
              <Button variant="outline" onClick={onClose}>
                Skip
              </Button>
              {currentStep < totalSteps ? (
                <Button
                  onClick={() => setCurrentStep(prev => prev + 1)}
                  disabled={currentStep === 1 && feedback.overall_rating === 0}
                >
                  Next
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || feedback.overall_rating === 0 || !feedback.feedback_text.trim()}
                >
                  {isSubmitting ? "Submitting..." : "Submit Feedback"}
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}