"use client"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { ArrowLeft, CheckCircle } from "lucide-react"

const experienceLevels = [
  { label: "Beginner", value: "beginner" },
  { label: "Intermediate", value: "intermediate" },
  { label: "Experienced", value: "advanced" },
]

const MIN_GOALS_LENGTH = 50

export default function LearnerGoals({ formData, setFormData, prevStep }: any) {
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  const isFormValid =
    formData.experienceLevel &&
    formData.learningGoals.length >= MIN_GOALS_LENGTH &&
    agreedToTerms

  return (
    <div className="space-y-6">
      {/* Experience Level */}
      <div>
        <Label htmlFor="experienceLevel" className="text-sm font-semibold text-gray-700 mb-2 block">
          Current Experience Level*
        </Label>
        <Select
          value={formData.experienceLevel}
          onValueChange={(value) => setFormData({ ...formData, experienceLevel: value })}
        >
          <SelectTrigger className="w-full h-14 text-base border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-sm">
            <SelectValue placeholder="Select your experience level" />
          </SelectTrigger>
          <SelectContent>
            {experienceLevels.map((level) => (
              <SelectItem key={level.value} value={level.value}>
                {level.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Learning Goals */}
      <div>
        <Label htmlFor="learningGoals" className="text-sm font-semibold text-gray-700 mb-2 block">
          Learning Goals & Objectives*
        </Label>
        <Textarea
          id="learningGoals"
          placeholder="Describe what you want to achieve, specific areas you want to focus on, and your timeline."
          value={formData.learningGoals}
          onChange={(e) => setFormData({ ...formData, learningGoals: e.target.value })}
          rows={7}
          className="w-full h-30 text-base border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg resize-none"
          required
        />
        {formData.learningGoals.length > 0 && formData.learningGoals.length < MIN_GOALS_LENGTH && (
          <p className="text-sm text-red-600 mt-2 ml-1">
            Please enter at least {MIN_GOALS_LENGTH} characters.
          </p>
        )}
      </div>

      {/* Agreements */}
      <div className="space-y-4 pt-6 border-t border-gray-200">
        <div className="flex items-start space-x-3">
          <Checkbox
            id="terms"
            checked={agreedToTerms}
            onCheckedChange={(checked) => setAgreedToTerms(!!checked)}
            className="mt-1"
          />
          <Label htmlFor="terms" className="text-sm leading-relaxed text-gray-600">
            I agree to the{" "}
            <a href="/terms" className="text-blue-600 hover:text-blue-700 hover:underline font-semibold">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="/privacy" className="text-blue-600 hover:text-blue-700 hover:underline font-semibold">
              Privacy Policy
            </a>
          </Label>
        </div>
        <div className="flex items-start space-x-3">
          <Checkbox id="marketing" className="mt-1" />
          <Label htmlFor="marketing" className="text-sm leading-relaxed text-gray-600">
            I'd like to receive updates about new mentors, platform features, and learning opportunities
          </Label>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex space-x-4">
        <Button
          type="button"
          variant="outline"
          onClick={prevStep}
          className="flex-1 h-14 text-base border-gray-200 bg-transparent hover:bg-gray-50 rounded-lg cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Previous
        </Button>
        <Button
          type="submit"
          disabled={!isFormValid}
          className="flex-1 h-14 gradient-bg text-white font-semibold text-base rounded-lg transition-all disabled:opacity-50"
        >
          Create Account
          <CheckCircle className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  )
}
