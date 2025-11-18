"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import type { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { learnerProfileUpdateSchema } from "@/db/settings"
import countries from "world-countries"
import { commonTimeZones } from "@/lib/timeZones"
import ProfilePictureUpload from "@/components/register/ProfilePictureUpload"
import { Loader2, Save, Shield } from "lucide-react"

type LearnerProfileUpdateFormValues = z.infer<typeof learnerProfileUpdateSchema>

interface LearnerSettingsFormProps {
  initialData: {
    firstName: string
    lastName: string
    email: string
    country: string
    experienceLevel: string
    learningGoals: string
    profilePictureUrl?: string | null
    timezone?: string | null
  }
}

export function LearnerSettingsForm({ initialData }: LearnerSettingsFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [is2FAEnabled, setIs2FAEnabled] = useState(false)
  const [is2FALoading, setIs2FALoading] = useState(true)
  const [is2FAToggling, setIs2FAToggling] = useState(false)

  // Philippines-only platform, so limit country options to Philippines
  const countryOptions = countries
    .filter((country) => country.cca2 === "PH") // Only Philippines
    .map((country) => ({
      value: country.cca2,
      label: country.name.common,
    }))

  // Fetch 2FA status on component mount
  useEffect(() => {
    const fetch2FAStatus = async () => {
      try {
        const response = await fetch("/api/auth/2fa/status")
        if (response.ok) {
          const data = await response.json()
          setIs2FAEnabled(data.isEnabled)
        }
      } catch (error) {
        console.error("Error fetching 2FA status:", error)
      } finally {
        setIs2FALoading(false)
      }
    }

    fetch2FAStatus()
  }, [])

  const form = useForm<LearnerProfileUpdateFormValues>({
    resolver: zodResolver(learnerProfileUpdateSchema),
    defaultValues: {
      country: initialData.country || "",
      experienceLevel: initialData.experienceLevel || "",
      learningGoals: initialData.learningGoals || "",
      profilePictureUrl: initialData.profilePictureUrl || "",
      timezone: initialData.timezone || "",
    },
  })

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    watch,
  } = form

  const profilePictureUrl = watch("profilePictureUrl")
  const country = watch("country")
  const timezone = watch("timezone")
  const experienceLevel = watch("experienceLevel")

 const onSubmit = async (data: LearnerProfileUpdateFormValues) => {
  setIsSubmitting(true)
  try {
    const response = await fetch("/api/learner/me", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || "Failed to update profile")
    }

    toast.success("Profile updated successfully!", {
      description: "Your changes have been saved.",
      duration: 4000,
    })
  } catch (error: any) {
    toast.error("Error", {
      description: error.message || "An unexpected error occurred.",
    })
  } finally {
    setIsSubmitting(false)
  }
}

  const handle2FAToggle = async (enabled: boolean) => {
    setIs2FAToggling(true)
    try {
      const endpoint = enabled ? "/api/auth/2fa/enable" : "/api/auth/2fa/disable"
      const response = await fetch(endpoint, {
        method: "POST",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to ${enabled ? "enable" : "disable"} 2FA`)
      }

      setIs2FAEnabled(enabled)
      toast.success(enabled ? "Two-factor authentication enabled" : "Two-factor authentication disabled", {
        description: enabled
          ? "You will receive a verification code via email on your next login."
          : "You will no longer need a verification code to login.",
        duration: 4000,
      })
    } catch (error: any) {
      toast.error("Error", {
        description: error.message || "An unexpected error occurred.",
      })
      // Revert toggle on error
      setIs2FAEnabled(!enabled)
    } finally {
      setIs2FAToggling(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Profile Picture Section */}
      <Card className="shadow-lg border-0">
        <CardContent>
          <div className="flex">
            <ProfilePictureUpload
              initialImageUrl={profilePictureUrl || ""}
              onUploadSuccess={(url) => setValue("profilePictureUrl", url)}
              onDeleteSuccess={() => setValue("profilePictureUrl", "")}
            />
          </div>
          {errors.profilePictureUrl && (
            <p className="text-red-500 text-sm mt-2 text-center">{errors.profilePictureUrl.message}</p>
          )}
        </CardContent>
      </Card>

      {/* Personal Information Section */}
      <Card className="shadow-lg border-0">
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Your basic account information and contact details.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-sm font-medium text-gray-900">First Name</Label>
              <Input
                id="firstName"
                value={initialData.firstName}
                disabled
                className="bg-gray-50 border-gray-200 text-gray-600 h-12 text-base"
              />
              <p className="text-xs text-gray-500">Contact support to change your name</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-sm font-medium text-gray-900">Last Name</Label>
              <Input
                id="lastName"
                value={initialData.lastName}
                disabled
                className="bg-gray-50 border-gray-200 text-gray-600 h-12 text-base"
              />
              <p className="text-xs text-gray-500">Contact support to change your name</p>
            </div>
            <div className="lg:col-span-2 space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-900">Email Address</Label>
              <Input
                id="email"
                value={initialData.email}
                disabled
                className="bg-gray-50 border-gray-200 text-gray-600 h-12 text-base"
              />
              <p className="text-xs text-gray-500">Contact support to change your email address</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Learning Preferences Section */}
      <Card className="shadow-lg border-0">
        <CardHeader>
          <CardTitle>Learning Preferences</CardTitle>
          <CardDescription>Customize your learning experience and goals.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="country" className="text-sm font-medium text-gray-900">Country</Label>
              <Select onValueChange={(value) => setValue("country", value)} value={country}>
                <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder="Select your country" />
                </SelectTrigger>
                <SelectContent>
                  {countryOptions.map((country) => (
                    <SelectItem key={country.value} value={country.value}>
                      {country.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.country && <p className="text-red-500 text-sm mt-1">{errors.country.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone" className="text-sm font-medium text-gray-900">Timezone</Label>
              <Select onValueChange={(value) => setValue("timezone", value)} value={timezone}>
                <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder="Select your timezone" />
                </SelectTrigger>
                <SelectContent>
                  {commonTimeZones.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.timezone && <p className="text-red-500 text-sm mt-1">{errors.timezone.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="experienceLevel" className="text-sm font-medium text-gray-900">Experience Level</Label>
            <Select
              onValueChange={(value) => setValue("experienceLevel", value)}
              value={experienceLevel}
            >
              <SelectTrigger className="h-12 text-base lg:max-w-md">
                <SelectValue placeholder="Select your experience level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">
                  <div>
                    <div className="font-medium">Beginner</div>
                    <div className="text-xs text-gray-500">Just starting out</div>
                  </div>
                </SelectItem>
                <SelectItem value="intermediate">
                  <div>
                    <div className="font-medium">Intermediate</div>
                    <div className="text-xs text-gray-500">Some experience</div>
                  </div>
                </SelectItem>
                <SelectItem value="advanced">
                  <div>
                    <div className="font-medium">Advanced</div>
                    <div className="text-xs text-gray-500">Experienced learner</div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            {errors.experienceLevel && <p className="text-red-500 text-sm mt-1">{errors.experienceLevel.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="learningGoals" className="text-sm font-medium text-gray-900">Learning Goals</Label>
            <Textarea
              id="learningGoals"
              placeholder="What would you like to learn? What are your career goals? How can mentors help you achieve them?"
              {...register("learningGoals")}
              rows={5}
              className="resize-none text-base"
            />
            {errors.learningGoals && <p className="text-red-500 text-sm mt-1">{errors.learningGoals.message}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Security Section */}
      <Card className="shadow-lg border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Security
          </CardTitle>
          <CardDescription>Manage your account security settings.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
            <div className="space-y-1">
              <Label htmlFor="2fa-toggle" className="text-sm font-medium text-gray-900 cursor-pointer">
                Two-Factor Authentication
              </Label>
              <p className="text-sm text-gray-500">
                Receive a verification code via email when signing in
              </p>
            </div>
            <Switch
              id="2fa-toggle"
              checked={is2FAEnabled}
              onCheckedChange={handle2FAToggle}
              disabled={is2FALoading || is2FAToggling}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          type="submit"
          className="w-48 h-14 gradient-bg text-white font-semibold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:transform-none"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-5 w-5" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
