"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, CheckCircle, User, Briefcase, Star, Clock, DollarSign, AlertCircle } from "lucide-react"
import { useState } from "react"
import Link from "next/link"

type Props = {
  formData: any
  setFormData: (data: any) => void
  prevStep: () => void
  isSubmitting: boolean
}

export default function MentorReviewSubmit({ formData, prevStep, isSubmitting }: Props) {
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  const getAvailabilityCount = () => {
    if (!formData.availability || typeof formData.availability !== "object") return 0
    return Object.values(formData.availability).reduce(
      (total: number, daySlots: any) => total + (daySlots?.length || 0),
      0,
    )
  }

  const getAvailableDays = () => {
    if (!formData.availability || typeof formData.availability !== "object") return []
    return Object.entries(formData.availability).filter(([_, slots]: [string, any]) => slots?.length > 0)
  }

  return (
    <div className="space-y-8">
      {/* Application Summary */}
      <div className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="w-5 h-5 text-blue-600" />
              <span>Basic Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-gray-500">Full Name</Label>
                <p className="font-semibold text-lg">
                  {formData.firstName} {formData.lastName}
                </p>
              </div>
              <div>
                <Label className="text-sm text-gray-500">Email Address</Label>
                <p className="font-semibold">{formData.email}</p>
              </div>
              <div>
                <Label className="text-sm text-gray-500">Country</Label>
                <p className="font-semibold">{formData.country}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Professional Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Briefcase className="w-5 h-5 text-green-600" />
              <span>Professional Background</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm text-gray-500">Professional Title</Label>
              <p className="font-semibold text-lg">{formData.professionalTitle}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-500">Years of Experience</Label>
              <p className="font-semibold">{formData.yearsOfExperience} years</p>
            </div>
            <div>
              <Label className="text-sm text-gray-500">About Me</Label>
              <div className="bg-gray-50 p-3 rounded-lg max-h-48 overflow-y-auto">
                <p className="text-gray-700 whitespace-pre-wrap break-words">
                  {formData.bio}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {formData.linkedinUrl && (
                <div>
                  <Label className="text-sm text-gray-500">LinkedIn</Label>
                  <a href={formData.linkedinUrl}  target="_blank" className="font-medium text-blue-600 truncate hover:underline">
                    {formData.linkedinUrl}
                  </a>
                </div>
              )}
            </div>
              {formData.linkAttachments.map((item: any, i: number) => (
                <div key={i}>
                  <Label className="text-sm text-gray-500">{item.label}</Label>
                  <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-blue-600 truncate block hover:underline"
                >
                  {item.url}
                </a>
                </div>
              ))}
          </CardContent>
        </Card>

        {/* Skills & Rates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Star className="w-5 h-5 text-yellow-500" />
              <span>Skills & Rates per hour ({formData.skills.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {formData.skills.map((skill: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border"
                >
                  <Badge variant="secondary" className="font-semibold">
                    {skill.name}
                  </Badge>
                  <div className="flex items-center space-x-3 text-sm">
                    <span className="font-medium">{skill.rate} credits</span>
                    <span className="flex items-center text-green-600 font-semibold">
                      <DollarSign className="w-3 h-3 mr-1" />${(skill.rate / 5).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Availability */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-purple-600" />
              <span>Weekly Availability</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {getAvailabilityCount() > 0 ? (
              <div className="space-y-3">
                {getAvailableDays().map(([dayId, slots]: [string, any]) => (
                  <div key={dayId} className="border rounded-lg p-3 bg-gray-50">
                    <div className="font-semibold text-gray-900 mb-2 capitalize">{dayId}</div>
                    <div className="space-y-1">
                      {slots.map((slot: any, slotIndex: number) => (
                        <Badge key={slotIndex} variant="outline" className="mr-2 mb-1">
                          {slot.start} - {slot.end}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="text-sm text-gray-600 bg-green-50 p-2 rounded border border-green-200">
                  Total: {getAvailabilityCount()} time slots across {getAvailableDays().length} days
                </div>
              </div>
            ) : (
              <p className="text-gray-500 italic">No availability set</p>
            )}
          </CardContent>
        </Card>
      </div>

  
      <Card className="border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50">
        <CardContent className="p-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-6 h-6 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-amber-900">
              <h3 className="font-semibold mb-2">Application Review Process</h3>
              <p className="text-sm leading-relaxed">
                Your mentor application will be carefully reviewed by our team within 2-3 business days. We'll verify
                your credentials and ensure you meet our quality standards. You'll receive an email notification once
                your account is approved and activated.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardContent className="p-6">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="terms"
              checked={agreedToTerms}
              onCheckedChange={(checked) => setAgreedToTerms(!!checked)}
              className="mt-1"
            />
            <Label htmlFor="terms" className="text-sm leading-relaxed text-blue-900 block">
              I agree to the{" "}
              <Link
                href="/terms-of-service"
                className="text-blue-600 hover:text-blue-700 hover:underline font-semibold"
              >
                Terms of Service
              </Link>
              {", "}
              <Link
                href="/privacy-policy"
                className="text-blue-600 hover:text-blue-700 hover:underline font-semibold"
              >
                Privacy Policy
              </Link>
              {", and "}
              <Link
                href="/code-of-conduct"
                className="text-blue-600 hover:text-blue-700 hover:underline font-semibold"
              >
                Code of Conduct
              </Link>
              . I understand that my application will be reviewed by BridgeMentor admins before account activation.
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 pt-6">
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
          type="submit"
          disabled={!agreedToTerms || isSubmitting}
          className="w-[28%] h-14 gradient-bg text-white font-semibold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:transform-none flex items-center justify-center"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin w-5 h-5 text-white" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                ></path>
              </svg>
              Submitting...
            </span>
          ) : (
            <>
              Submit Application
              <CheckCircle className="w-5 h-5 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
