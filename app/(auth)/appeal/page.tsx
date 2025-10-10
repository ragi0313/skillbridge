"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/lib/toast"
import { Mail, AlertCircle, CheckCircle } from "lucide-react"
import Link from "next/link"

const AppealPage = () => {
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    appealReason: "",
    restrictionType: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.email || !formData.firstName || !formData.appealReason.trim()) {
      toast.error("Please fill in all required fields")
      return
    }

    if (formData.appealReason.trim().length < 10) {
      toast.error("Appeal explanation must be at least 10 characters long")
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/auth/appeal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit appeal")
      }

      toast.success("✅ Appeal submitted successfully! Check your email for confirmation.")
      setSubmitted(true)
    } catch (error: any) {
      toast.error(error.message || "Failed to submit appeal. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="w-full max-w-md text-center">
          <CardContent className="p-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Appeal Submitted</h2>
            <p className="text-gray-600 mb-6">
              Your appeal has been submitted successfully. Our team will review it within 3-5 business days.
            </p>
            <div className="space-y-3">
              <Link href="/login">
                <Button className="w-full">Back to Login</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <AlertCircle className="h-8 w-8 text-orange-500 mr-2" />
            <CardTitle className="text-2xl font-bold">Account Restriction Appeal</CardTitle>
          </div>
          <p className="text-gray-600">
            Submit an appeal if you believe your account was restricted in error
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <Mail className="h-5 w-5 text-blue-500 mt-0.5 mr-3" />
              <div>
                <h4 className="font-medium text-blue-900">Prefer Email?</h4>
                <p className="text-sm text-blue-700 mt-1">
                  You can also email us directly at{" "}
                  <a
                    href={`mailto:${process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@bridgementor.com'}`}
                    className="underline font-medium"
                  >
                    {process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@bridgementor.com'}
                  </a>
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email" className="mb-2">
                  Email Address *
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="Your account email"
                  required
                />
              </div>

              <div>
                <Label htmlFor="firstName" className="mb-2">
                  First Name *
                </Label>
                <Input
                  id="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                  placeholder="Your first name"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="restrictionType" className="mb-2">
                Type of Restriction (if known)
              </Label>
              <Input
                id="restrictionType"
                type="text"
                value={formData.restrictionType}
                onChange={(e) =>
                  setFormData({ ...formData, restrictionType: e.target.value })
                }
                placeholder="e.g., Account Suspended, Account Blacklisted"
              />
            </div>

            <div>
              <Label htmlFor="appealReason" className="mb-2">
                Appeal Explanation *
              </Label>
              <Textarea
                id="appealReason"
                value={formData.appealReason}
                onChange={(e) =>
                  setFormData({ ...formData, appealReason: e.target.value })
                }
                placeholder="Please explain why you believe this restriction was made in error. Include any relevant context or information that might help our review."
                rows={6}
                className="resize-none"
                required
              />
              <p className="text-sm text-gray-500 mt-2">
                Minimum 10 characters ({formData.appealReason.length}/10)
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-900 mb-2">Review Process</h4>
              <ul className="text-sm text-yellow-800 space-y-1">
                <li>• Appeals are reviewed within 3-5 business days</li>
                <li>• You will receive an email notification about the decision</li>
                <li>• Submitting multiple appeals will not speed up the process</li>
                <li>• All decisions are final after review</li>
              </ul>
            </div>

            <div className="flex gap-4">
              <Link href="/login" className="flex-1">
                <Button type="button" variant="outline" className="w-full">
                  Back to Login
                </Button>
              </Link>
              
              <Button
                type="submit"
                disabled={isSubmitting || !formData.email || !formData.firstName || formData.appealReason.length < 10}
                className="flex-1"
              >
                {isSubmitting ? "Submitting..." : "Submit Appeal"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default AppealPage