"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import MentorHeader from "@/components/mentor/Header"
import MentorBasicInfo from "@/components/register/mentor/MentorBasicInfo"
import MentorProfessionalDetails from "@/components/register/mentor/MentorProfessionalDetails"
import MentorSkillsRates from "@/components/register/mentor/MentorSkillsRate"
import MentorAvailability from "@/components/register/mentor/MentorAvailability"
import BlockedDatesSelector from "@/components/settings/BlockedDateSelector"
import { Loader2, Save } from "lucide-react"


type FormData = {
  profilePicture: string | null
  firstName: string
  lastName: string
  email: string
  country: string
  password?: string 
  confirmPassword?: string
  timezone: string
  gender: string
  languages: string[]
  professionalTitle: string
  bio: string
  yearsOfExperience: number | ""
  linkedinUrl: string
  linkAttachments: Array<{ id: string; type: string; label: string; url: string }>
  skills: Array<{ name: string; rate: number }>
  availability: { [key: string]: Array<{ id: string; start: string; end: string }> }
  blockedDates: Date[]
}

export default function MentorSettingsPage() {
  const router = useRouter()
  const [formData, setFormData] = useState<FormData>({
    profilePicture: null,
    firstName: "",
    lastName: "",
    email: "",
    country: "",
    timezone: "",
    gender: "",
    languages: [],
    professionalTitle: "",
    bio: "",
    yearsOfExperience: "",
    linkedinUrl: "",
    linkAttachments: [],
    skills: [],
    availability: {},
    blockedDates: [],
  })
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    async function fetchMentorData() {
      try {
        const res = await fetch("/api/mentor/me")
        if (!res.ok) {
          if (res.status === 401) {
            router.push("/login")
          }
          throw new Error("Failed to fetch mentor data")
        }
        const data = await res.json()
        const mentor = data.mentor
        const availability = data.availability
        const skills = data.skills
        const blockedDates = data.blockedDates

        // Map fetched data to form state
        setFormData({
          profilePicture: mentor.profilePictureUrl || null,
          firstName: mentor.firstName,
          lastName: mentor.lastName,
          email: mentor.email,
          country: mentor.country,
          timezone: mentor.timezone,
          gender: mentor.gender,
          languages: mentor.languagesSpoken || [],
          professionalTitle: mentor.professionalTitle || "",
          bio: mentor.bio || "",
          yearsOfExperience: mentor.yearsOfExperience || "",
          linkedinUrl: mentor.linkedInUrl || "",
          linkAttachments: (mentor.socialLinks || []).map((link: any) => ({
            id: `${link.type}-${Date.now()}-${Math.random()}`, 
            type: link.type,
            label: link.label,
            url: link.url,
          })),
          skills: skills.map((s: any) => ({
            name: s.skillName,
            rate: s.ratePerHour,
          })),
          availability: availability.reduce((acc: any, curr: any) => {
            if (!acc[curr.day]) {
              acc[curr.day] = []
            }
            acc[curr.day].push({
              id: `${curr.day}-${curr.startTime}-${curr.endTime}`, // Add unique ID for React keys
              start: curr.startTime.substring(0, 5), // Format to HH:MM
              end: curr.endTime.substring(0, 5), // Format to HH:MM
            })
            return acc
          }, {}),
          // Map blockedDates to Date objects (preserve local date)
          blockedDates: blockedDates.map((bd: any) => new Date(bd.blockedDate + 'T00:00:00')),
        })
      } catch (err) {
        console.error("Failed to fetch mentor data", err)
        toast.error("Error", {
          description: "An unexpected error occurred.",
       })
      } finally {
        setLoading(false)
      }
    }
    fetchMentorData()
  }, [router, toast])

  const handleFormChange = (newData: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...newData }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      // Prepare data for API
      const dataToSend = {
        profilePictureUrl: formData.profilePicture,
        languagesSpoken: formData.languages,
        gender: formData.gender,
        country: formData.country,
        timezone: formData.timezone,
        professionalTitle: formData.professionalTitle,
        bio: formData.bio,
        yearsOfExperience: formData.yearsOfExperience,
        linkedInUrl: formData.linkedinUrl,
        // Convert linkAttachments back to socialLinks (remove temporary IDs)
        socialLinks: formData.linkAttachments.map(({ id, ...rest }) => rest),
        // Map skills back to mentorSkills format
        skills: formData.skills.map((s) => ({
          skillName: s.name,
          ratePerHour: s.rate,
        })),
        // Flatten availability object back to array
        availability: Object.entries(formData.availability).flatMap(([day, slots]) =>
          slots.map((slot) => ({
            day,
            startTime: slot.start,
            endTime: slot.end,
          })),
        ),
        // Map blockedDates (Date objects) to YYYY-MM-DD strings (preserve local date)
        blockedDates: formData.blockedDates.map((date) => {
          const year = date.getFullYear()
          const month = String(date.getMonth() + 1).padStart(2, '0')
          const day = String(date.getDate()).padStart(2, '0')
          return `${year}-${month}-${day}`
        }),
      }

      const res = await fetch("/api/mentor/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dataToSend),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to update profile")
      }

       toast.success("Profile Updated", {
      description: "Your profile has been successfully updated.",
    })
  } catch (error: any) {
    toast.error("Error", {
      description: error.message || "An unexpected error occurred.",
    })
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <MentorHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <MentorHeader />
      <main className="container mx-auto px-4 py-8 space-y-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Profile Settings</h1>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Update your personal details and contact information.</CardDescription>
            </CardHeader>
            <CardContent>
              <MentorBasicInfo
                formData={formData}
                setFormData={handleFormChange}
                nextStep={() => {}}
                isSettingsPage={true}
              />
            </CardContent>
          </Card>

          {/* Professional Details */}
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle>Professional Details</CardTitle>
              <CardDescription>Showcase your experience, bio, and professional links.</CardDescription>
            </CardHeader>
            <CardContent>
              <MentorProfessionalDetails
                formData={formData}
                setFormData={handleFormChange}
                nextStep={() => {}}
                prevStep={() => {}}
                isSettingsPage={true}
              />
            </CardContent>
          </Card>

          {/* Skills and Rates */}
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle>Skills and Rates</CardTitle>
              <CardDescription>Manage your mentoring skills and set your hourly rates.</CardDescription>
            </CardHeader>
            <CardContent>
              <MentorSkillsRates
                formData={formData}
                setFormData={handleFormChange}
                nextStep={() => {}}
                prevStep={() => {}}
                isSettingsPage={true}
              />
            </CardContent>
          </Card>

          {/* Availability and Blocked Dates */}
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle>Availability & Blocked Dates</CardTitle>
              <CardDescription>Set your weekly availability and block specific dates.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <MentorAvailability
                formData={formData}
                setFormData={handleFormChange}
                nextStep={() => {}}
                prevStep={() => {}}
                isSettingsPage={true}
              />
              <BlockedDatesSelector
                blockedDates={formData.blockedDates}
                onBlockedDatesChange={(dates) => handleFormChange({ blockedDates: dates })}
              />
            </CardContent>
          </Card>
          <div className="flex justify-end">
            <Button
              type="submit"
              className="w-48 h-14 gradient-bg text-white font-semibold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:transform-none"
              disabled={isSaving}
            >
              {isSaving ? (
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
      </main>
    </div>
  )
}
