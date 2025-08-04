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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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

    toast.success("Profile Updated", {
      description: "Your profile has been successfully updated.",
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
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Learner Profile Settings</CardTitle>
        <CardDescription>Manage your personal information and learning preferences.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
              <ProfilePictureUpload
                initialImageUrl={profilePictureUrl || ""}
                onUploadSuccess={(url) => setValue("profilePictureUrl", url)}
                onDeleteSuccess={() => setValue("profilePictureUrl", "")}
              />
              {errors.profilePictureUrl && (
                <p className="text-red-500 text-sm mt-1">{errors.profilePictureUrl.message}</p>
              )}
            </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input id="firstName" value={initialData.firstName} disabled className="bg-gray-100" />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" value={initialData.lastName} disabled className="bg-gray-100" />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={initialData.email} disabled className="bg-gray-100" />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div>
              <Label htmlFor="country">Country</Label>
              <Select onValueChange={(value) => setValue("country", value)} defaultValue={initialData.country}>
                <SelectTrigger>
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

            <div>
              <Label htmlFor="timezone">Timezone</Label>
              <Select onValueChange={(value) => setValue("timezone", value)} defaultValue={initialData.timezone || ""}>
                <SelectTrigger>
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

            <div>
              <Label htmlFor="experienceLevel">Experience Level</Label>
              <Select
                onValueChange={(value) => setValue("experienceLevel", value)}
                defaultValue={initialData.experienceLevel}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your experience level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
              {errors.experienceLevel && <p className="text-red-500 text-sm mt-1">{errors.experienceLevel.message}</p>}
            </div>

            <div>
              <Label htmlFor="learningGoals">Learning Goals</Label>
              <Textarea
                id="learningGoals"
                placeholder="Describe your learning goals and what you hope to achieve."
                {...register("learningGoals")}
                rows={4}
              />
              {errors.learningGoals && <p className="text-red-500 text-sm mt-1">{errors.learningGoals.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Social Links (Optional)</Label>
              <div>
                <Label htmlFor="github" className="sr-only">
                  GitHub URL
                </Label>
                <Input id="github" placeholder="GitHub URL" {...register("socialLinks.github")} className="mb-2" />
                {errors.socialLinks?.github && (
                  <p className="text-red-500 text-sm mt-1">{errors.socialLinks.github.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="twitter" className="sr-only">
                  Twitter URL
                </Label>
                <Input id="twitter" placeholder="Twitter URL" {...register("socialLinks.twitter")} className="mb-2" />
                {errors.socialLinks?.twitter && (
                  <p className="text-red-500 text-sm mt-1">{errors.socialLinks.twitter.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="website" className="sr-only">
                  Personal Website URL
                </Label>
                <Input id="website" placeholder="Personal Website URL" {...register("socialLinks.website")} />
                {errors.socialLinks?.website && (
                  <p className="text-red-500 text-sm mt-1">{errors.socialLinks.website.message}</p>
                )}
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
