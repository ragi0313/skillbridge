"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Briefcase, Globe, Linkedin } from "lucide-react"

type Props = {
  formData: any
  setFormData: (data: any) => void
  nextStep: () => void
  prevStep: () => void
}

export default function MentorProfessionalDetails({ formData, setFormData, nextStep, prevStep }: Props) {
  const isFormValid = () =>
    formData.professionalTitle && formData.bio && formData.bio.length <= 300 && formData.yearsOfExperience

  return (
    <div className="space-y-8">
      {/* Professional Title */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Briefcase className="w-5 h-5 text-blue-600" />
            <span>Professional Title</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Label htmlFor="professionalTitle" className="text-base font-semibold text-gray-700">
            How would you describe your professional role?*
          </Label>
          <Input
            id="professionalTitle"
            placeholder="e.g., Senior React Developer"
            value={formData.professionalTitle}
            onChange={(e) => setFormData({ ...formData, professionalTitle: e.target.value })}
            className="h-12 text-base"
            required
          />
          <p className="text-sm text-gray-500">This will be displayed as your headline to learners</p>
        </CardContent>
      </Card>

      {/* Bio */}
      <Card>
        <CardContent className="px-6 space-y-4">
          <Label htmlFor="bio" className="text-base font-semibold text-gray-700">
            About Me*
          </Label>
          <Textarea
            id="bio"
            placeholder="Tell learners about yourself, your experience, and what makes you a great mentor. Share your passion for teaching and helping others grow..."
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            rows={6}
            className="resize-none text-base h-40"
            minLength={100}
            maxLength={1000}
            required
          />
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">This will be visible on your mentor profile</p>
            <p className={`text-sm ${formData.bio.length > 250 ? "text-orange-600" : "text-gray-500"}`}>
              {formData.bio.length}/300 characters
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Experience */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <Label htmlFor="yearsOfExperience" className="text-base font-semibold text-gray-700">
            Years of Professional Experience*
          </Label>
          <Input
            id="yearsOfExperience"
            type="number"
            placeholder="e.g., 5"
            value={formData.yearsOfExperience}
            onChange={(e) => setFormData({ ...formData, yearsOfExperience: e.target.value })}
            className="h-12 text-base"
            min="0"
            max="50"
            required
          />
          <p className="text-sm text-gray-500">How many years have you been working in your field?</p>
        </CardContent>
      </Card>

      {/* Social Links */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Linkedin className="w-5 h-5 text-blue-600" />
              <span>LinkedIn Profile</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Label htmlFor="linkedinUrl" className="text-base font-semibold text-gray-700">
              LinkedIn URL
            </Label>
            <Input
              id="linkedinUrl"
              type="url"
              placeholder="https://linkedin.com/in/yourprofile"
              value={formData.linkedinUrl}
              onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
              className="h-12 text-base"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Globe className="w-5 h-5 text-blue-600" />
              <span>Portfolio/Website</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Label htmlFor="portfolioUrl" className="text-base font-semibold text-gray-700">
              Website/Portfolio URL
            </Label>
            <Input
              id="portfolioUrl"
              type="url"
              placeholder="https://yourportfolio.com"
              value={formData.portfolioUrl}
              onChange={(e) => setFormData({ ...formData, portfolioUrl: e.target.value })}
              className="h-12 text-base"
            />
            <p className="text-sm text-gray-500">Showcase your work and projects</p>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Buttons */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 pt-6">
        <Button
          type="button"
          variant="outline"
          onClick={prevStep}
          className="h-14 px-8 text-base border-2 hover:bg-gray-50 rounded-xl transition-all duration-300 bg-transparent cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Previous Step
        </Button>
        <Button
          type="button"
          onClick={nextStep}
          disabled={!isFormValid()}
          className="w-[15%] h-14 gradient-bg text-white font-semibold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:transform-none"
        >
          Continue
        </Button>
      </div>
    </div>
  )
}
