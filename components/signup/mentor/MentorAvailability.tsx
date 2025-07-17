"use client"

import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Clock, MessageSquare, Target, Trophy } from "lucide-react"

type Props = {
  formData: any
  setFormData: (data: any) => void
  nextStep: () => void
  prevStep: () => void
}

const availabilityOptions = [
  "Monday AM",
  "Monday PM",
  "Tuesday AM",
  "Tuesday PM",
  "Wednesday AM",
  "Wednesday PM",
  "Thursday AM",
  "Thursday PM",
  "Friday AM",
  "Friday PM",
  "Saturday AM",
  "Saturday PM",
  "Sunday AM",
  "Sunday PM",
]

export default function MentorAvailability({ formData, setFormData, nextStep, prevStep }: Props) {
  const handleAvailabilityChange = (option: string, checked: boolean) => {
    let availability = [...formData.availability]
    if (checked) {
      availability.push(option)
    } else {
      availability = availability.filter((item) => item !== option)
    }
    setFormData({ ...formData, availability })
  }

  const isFormValid = () =>
    formData.availability.length > 0 && formData.whyFreelancer && formData.whyMentor && formData.greatestAchievement

  return (
    <div className="space-y-8">
      {/* Availability */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <span>Weekly Availability</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Label className="text-base font-semibold text-gray-700">
            When are you typically available for mentoring sessions?*
          </Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {availabilityOptions.map((option) => (
              <div
                key={option}
                className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
              >
                <Checkbox
                  id={option}
                  checked={formData.availability.includes(option)}
                  onCheckedChange={(checked) => handleAvailabilityChange(option, !!checked)}
                />
                <Label htmlFor={option} className="text-sm cursor-pointer font-medium">
                  {option}
                </Label>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-500">
            Select all time slots when you're typically available. You can always adjust this later.
          </p>
        </CardContent>
      </Card>

      {/* Personal Questions */}
      <div className="space-y-6">
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
              className="resize-none text-base"
              required
            />
            <p className="text-sm text-gray-500">This helps us understand your background (not visible to learners)</p>
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
              className="resize-none text-base"
              required
            />
            <p className="text-sm text-gray-500">
              This helps us match you with the right learners (not visible to learners)
            </p>
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
              className="resize-none text-base"
              required
            />
            <p className="text-sm text-gray-500">
              This helps us understand your expertise level (not visible to learners)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 pt-6">
        <Button
          type="button"
          variant="outline"
          onClick={prevStep}
          className="h-14 px-8 text-base border-2 hover:bg-gray-50 rounded-xl transition-all duration-300 bg-transparent"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Previous Step
        </Button>
        <Button
          type="button"
          onClick={nextStep}
          disabled={!isFormValid()}
          className="flex-1 h-14 gradient-bg text-white font-semibold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:transform-none"
        >
          Review Application
        </Button>
      </div>
    </div>
  )
}
