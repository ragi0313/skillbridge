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
import { toast } from "sonner"
import { learnerProfileUpdateSchema } from "@/db/settings"
import countries from "world-countries"
import { commonTimeZones } from "@/lib/timeZones"
import ProfilePictureUpload from "@/components/register/ProfilePictureUpload"
import { Separator } from "@/components/ui/separator"

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
    socialLinks?: { github?: string; twitter?: string; website?: string } | null
    timezone?: string | null
  }
}

export function LearnerSettingsForm({ initialData }: LearnerSettingsFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const countryOptions = countries.map((country) => ({
    value: country.cca2,
    label: country.name.common,
  }))

  const form = useForm<LearnerProfileUpdateFormValues>({
    resolver: zodResolver(learnerProfileUpdateSchema),
    defaultValues: {
      country: initialData.country || "",
      experienceLevel: initialData.experienceLevel || "",
      learningGoals: initialData.learningGoals || "",
      profilePictureUrl: initialData.profilePictureUrl || "",
      socialLinks: initialData.socialLinks || { github: "", twitter: "", website: "" },
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

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 md:p-12">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-12">
        {/* Profile Picture Section */}
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Profile Picture</h2>
          <div className="flex justify-center">
            <ProfilePictureUpload
              initialImageUrl={profilePictureUrl || ""}
              onUploadSuccess={(url) => setValue("profilePictureUrl", url)}
              onDeleteSuccess={() => setValue("profilePictureUrl", "")}
            />
          </div>
          {errors.profilePictureUrl && (
            <p className="text-red-500 text-sm mt-2">{errors.profilePictureUrl.message}</p>
          )}
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>

        {/* Personal Information Section */}
        <div className="space-y-8">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Personal Information</h2>
            <p className="text-gray-600 text-sm">Your basic account information</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>

        {/* Learning Preferences Section */}
        <div className="space-y-8">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Learning Preferences</h2>
            <p className="text-gray-600 text-sm">Customize your learning experience</p>
          </div>
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-2">
                <Label htmlFor="country" className="text-sm font-medium text-gray-900">Country</Label>
                <Select onValueChange={(value) => setValue("country", value)} defaultValue={initialData.country}>
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
                <Select onValueChange={(value) => setValue("timezone", value)} defaultValue={initialData.timezone || ""}>
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
                defaultValue={initialData.experienceLevel}
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
          </div>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>

        {/* Social Links Section */}
        <div className="space-y-8">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Social Links</h2>
            <p className="text-gray-600 text-sm">Connect your social profiles to showcase your work (optional)</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-2">
              <Label htmlFor="github" className="text-sm font-medium text-gray-900">GitHub URL</Label>
              <Input 
                id="github" 
                placeholder="https://github.com/username" 
                {...register("socialLinks.github")} 
                className="h-12 text-base" 
              />
              {errors.socialLinks?.github && (
                <p className="text-red-500 text-sm mt-1">{errors.socialLinks.github.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="twitter" className="text-sm font-medium text-gray-900">Twitter URL</Label>
              <Input 
                id="twitter" 
                placeholder="https://twitter.com/username" 
                {...register("socialLinks.twitter")} 
                className="h-12 text-base" 
              />
              {errors.socialLinks?.twitter && (
                <p className="text-red-500 text-sm mt-1">{errors.socialLinks.twitter.message}</p>
              )}
            </div>
            <div className="lg:col-span-2 space-y-2">
              <Label htmlFor="website" className="text-sm font-medium text-gray-900">Personal Website</Label>
              <Input 
                id="website" 
                placeholder="https://yourportfolio.com" 
                {...register("socialLinks.website")} 
                className="h-12 text-base" 
              />
              {errors.socialLinks?.website && (
                <p className="text-red-500 text-sm mt-1">{errors.socialLinks.website.message}</p>
              )}
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-gray-200 flex justify-end">
          <Button 
            type="submit" 
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium text-base h-12" 
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving Changes...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
