"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { LearnerHeader } from "@/components/learner/Header"
import { SettingsSidebar } from "@/components/learner/settings/SettingsSidebar"
import { ProfileSection } from "@/components/learner/settings/ProfileSection"
import { AuthenticationSection } from "@/components/learner/settings/AuthenticationSection"
import { Loader2 } from "lucide-react"

interface LearnerData {
  firstName: string
  lastName: string
  email: string
  country: string
  experienceLevel: string
  learningGoals: string
  profilePictureUrl?: string | null
  timezone?: string | null
}

export default function LearnerSettingsPage() {
  const router = useRouter()
  const [activeSection, setActiveSection] = useState("profile")
  const [loading, setLoading] = useState(true)
  const [learnerData, setLearnerData] = useState<LearnerData | null>(null)

  useEffect(() => {
    fetchLearnerData()
  }, [])

  const fetchLearnerData = async () => {
    try {
      const response = await fetch("/api/learner/me")
      if (!response.ok) {
        if (response.status === 401) {
          router.push("/login")
          return
        }
        throw new Error("Failed to fetch learner data")
      }

      const data = await response.json()
      const learner = data  // API returns learner data directly, not wrapped

      setLearnerData({
        firstName: learner.firstName || "",
        lastName: learner.lastName || "",
        email: learner.email || "",
        country: learner.country || "",
        experienceLevel: learner.experienceLevel || "",
        learningGoals: learner.learningGoals || "",
        profilePictureUrl: learner.profilePictureUrl || null,
        timezone: learner.timezone || "",
      })
    } catch (error) {
      console.error("Error fetching learner data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <LearnerHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        </div>
      </div>
    )
  }

  if (!learnerData) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <LearnerHeader />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Manage your account preferences and view your activity</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <aside className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 p-4 sticky top-24">
              <SettingsSidebar
                activeSection={activeSection}
                onSectionChange={setActiveSection}
              />
            </div>
          </aside>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {activeSection === "profile" && <ProfileSection initialData={learnerData} />}
            {activeSection === "authentication" && <AuthenticationSection />}
          </div>
        </div>
      </main>
    </div>
  )
}
