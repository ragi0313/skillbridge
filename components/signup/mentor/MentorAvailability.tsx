"use client"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, MessageSquare, Target, Trophy, CheckCircle2, AlertTriangle } from "lucide-react"
import WeeklyAvailabilitySelector from "./WeeklyAvailabilitySelector"

type TimeSlot = {
  id: string
  start: string
  end: string
}

type WeeklyAvailability = {
  [key: string]: TimeSlot[]
}

type Props = {
  formData: any
  setFormData: (data: any) => void
  nextStep: () => void
  prevStep: () => void
}

export default function MentorAvailability({ formData, setFormData, nextStep, prevStep }: Props) {
  const [availability, setAvailability] = useState<WeeklyAvailability>(() => {
    if (formData.availability && typeof formData.availability === "object") {
      return formData.availability
    }
    return {}
  })

  const handleAvailabilityChange = (newAvailability: WeeklyAvailability) => {
    setAvailability(newAvailability)
    setFormData({ ...formData, availability: newAvailability })
  }

  const hasAvailability = () => {
    return Object.values(availability).some((daySlots) => daySlots.length > 0)
  }

  const isFormValid = () => {
    const hasValidAvailability = hasAvailability()
    const hasValidAnswers =
      formData.whyFreelancer?.trim().length >= 50 &&
      formData.whyMentor?.trim().length >= 50 &&
      formData.greatestAchievement?.trim().length >= 50
    return hasValidAvailability && hasValidAnswers
  }

  return (
    <div className="space-y-6">
      {/* Availability Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Set Your Availability</CardTitle>
          <p className="text-sm text-gray-600">
            Choose when you're available to mentor learners. You can adjust these times later.
          </p>
        </CardHeader>
        <CardContent>
          <WeeklyAvailabilitySelector availability={availability} onChange={handleAvailabilityChange} />
        </CardContent>
      </Card>

      {/* Personal Questions */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="w-5 h-5 text-green-600" />
              <span>Your Freelancing Journey</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Label htmlFor="whyFreelancer" className="text-base font-semibold text-gray-700">
              Why did you become a freelancer?*
            </Label>
            <Textarea
              id="whyFreelancer"
              placeholder="Share your journey into freelancing - what motivated you to start, what challenges you faced, and what you've learned..."
              value={formData.whyFreelancer}
              onChange={(e) => setFormData({ ...formData, whyFreelancer: e.target.value })}
              rows={4}
              className="resize-none h-30"
              required
            />
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500">
                This helps us understand your background (not visible to learners)
              </p>
              <span className={`text-sm ${formData.whyFreelancer?.length >= 50 ? "text-green-600" : "text-gray-400"}`}>
                {formData.whyFreelancer?.length || 0}/50 min
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="w-5 h-5 text-purple-600" />
              <span>Mentoring Motivation</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Label htmlFor="whyMentor" className="text-base font-semibold text-gray-700">
              Why do you want to become a mentor?*
            </Label>
            <Textarea
              id="whyMentor"
              placeholder="What motivates you to help others learn and grow? What do you hope to achieve through mentoring..."
              value={formData.whyMentor}
              onChange={(e) => setFormData({ ...formData, whyMentor: e.target.value })}
              rows={4}
              className="resize-none h-30"
              required
            />
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500">
                This helps us match you with the right learners (not visible to learners)
              </p>
              <span className={`text-sm ${formData.whyMentor?.length >= 50 ? "text-green-600" : "text-gray-400"}`}>
                {formData.whyMentor?.length || 0}/50 min
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Trophy className="w-5 h-5 text-yellow-600" />
              <span>Professional Achievement</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Label htmlFor="greatestAchievement" className="text-base font-semibold text-gray-700">
              What is your greatest professional achievement so far?*
            </Label>
            <Textarea
              id="greatestAchievement"
              placeholder="Describe a professional accomplishment you're most proud of - a project, recognition, milestone, or impact you've made..."
              value={formData.greatestAchievement}
              onChange={(e) => setFormData({ ...formData, greatestAchievement: e.target.value })}
              rows={4}
              className="resize-none h-30"
              required
            />
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500">
                This helps us understand your expertise level (not visible to learners)
              </p>
              <span
                className={`text-sm ${formData.greatestAchievement?.length >= 50 ? "text-green-600" : "text-gray-400"}`}
              >
                {formData.greatestAchievement?.length || 0}/50 min
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-100">
        <Button type="button" variant="outline" onClick={prevStep} className="h-12 px-6 text-base bg-transparent">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous Step
        </Button>
        <div className="flex justify-end w-full">
          <Button
            type="button"
            onClick={nextStep}
            disabled={!isFormValid}
            className="w-[15%] h-14 gradient-bg text-white font-semibold text-base rounded-lg"
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  )
}
