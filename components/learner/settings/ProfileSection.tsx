"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import type { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { toast } from "sonner"
import { learnerProfileUpdateSchema } from "@/db/settings"
import countries from "world-countries"
import { commonTimeZones } from "@/lib/timeZones"
import ProfilePictureUpload from "@/components/register/ProfilePictureUpload"
import { Loader2, Save } from "lucide-react"

type LearnerProfileUpdateFormValues = z.infer<typeof learnerProfileUpdateSchema>

interface ProfileSectionProps {
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

export function ProfileSection({ initialData }: ProfileSectionProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(
    initialData.profilePictureUrl || null
  )

  const countryOptions = countries
    .filter((country) => country.cca2 === "PH")
    .map((country) => ({
      value: country.cca2,
      label: country.name.common,
    }))

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LearnerProfileUpdateFormValues>({
    resolver: zodResolver(learnerProfileUpdateSchema),
    defaultValues: {
      country: initialData.country || "PH",
      experienceLevel: initialData.experienceLevel || "beginner",
      learningGoals: initialData.learningGoals || "I want to learn new skills and improve my knowledge.",
      profilePictureUrl: initialData.profilePictureUrl || undefined,
      timezone: initialData.timezone || "Asia/Manila",
    },
  })

  const onSubmit = async (data: LearnerProfileUpdateFormValues) => {
    setIsSubmitting(true)

    try {
      console.log("Submitting learner profile update:", data)

      const response = await fetch("/api/learner/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          profilePictureUrl: profilePictureUrl,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("Profile update failed:", errorData)
        throw new Error(errorData.error || "Failed to update profile")
      }

      console.log("Profile updated successfully")
      toast.success("Profile updated", {
        description: "Your changes have been saved successfully.",
      })
    } catch (error: any) {
      console.error("Profile update error:", error)
      toast.error("Update failed", {
        description: error.message || "Please check your information and try again.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const watchedCountry = watch("country")
  const watchedTimezone = watch("timezone")
  const watchedExperienceLevel = watch("experienceLevel")

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>
            Update your basic details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <ProfilePictureUpload
              initialImageUrl={profilePictureUrl}
              onUploadSuccess={(url) => setProfilePictureUrl(url)}
              onDeleteSuccess={() => setProfilePictureUrl(null)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>First Name</Label>
              <Input value={initialData.firstName} disabled />
              <p className="text-xs text-gray-500 mt-1">Cannot be changed</p>
            </div>
            <div>
              <Label>Last Name</Label>
              <Input value={initialData.lastName} disabled />
              <p className="text-xs text-gray-500 mt-1">Cannot be changed</p>
            </div>
          </div>

          <div>
            <Label>Email</Label>
            <Input value={initialData.email} disabled />
            <p className="text-xs text-gray-500 mt-1">Cannot be changed</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="country">Country</Label>
              <Select
                value={watchedCountry || "PH"}
                onValueChange={(value) => setValue("country", value)}
                disabled
              >
                <SelectTrigger>
                  <SelectValue placeholder="Philippines" />
                </SelectTrigger>
                <SelectContent>
                  {countryOptions.map((country) => (
                    <SelectItem key={country.value} value={country.value}>
                      {country.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">Service available in Philippines only</p>
            </div>

            <div>
              <Label htmlFor="timezone">Timezone</Label>
              <Select
                value={watchedTimezone}
                onValueChange={(value) => setValue("timezone", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {commonTimeZones.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.timezone && (
                <p className="text-sm text-red-600 mt-1">{errors.timezone.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Learning Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Learning Profile</CardTitle>
          <CardDescription>
            Help us personalize your experience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="experienceLevel">Experience Level</Label>
            <Select
              value={watchedExperienceLevel}
              onValueChange={(value) => setValue("experienceLevel", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
            {errors.experienceLevel && (
              <p className="text-sm text-red-600 mt-1">{errors.experienceLevel.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="learningGoals">Learning Goals</Label>
            <Textarea
              id="learningGoals"
              {...register("learningGoals")}
              placeholder="What do you want to achieve with mentorship?"
              rows={4}
            />
            {errors.learningGoals && (
              <p className="text-sm text-red-600 mt-1">{errors.learningGoals.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

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
