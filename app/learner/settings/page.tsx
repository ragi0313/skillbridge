import { getSession } from "@/lib/auth/getSession"
import { db } from "@/db"
import { users, learners } from "@/db/schema"
import { eq } from "drizzle-orm"
import { LearnerSettingsForm } from "@/components/settings/LearnerSettingsForm"
import { LearnerHeader } from "@/components/learner/Header"
import { redirect } from "next/navigation"

export default async function LearnerSettingsPage() {
  const session = await getSession()

  if (!session || session.role !== "learner") {
    redirect("/login")
  }

  // Get user from `users` table
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.id))

  if (!user) {
    redirect("/login")
  }

  // Get learner from `learners` table by userId
  const [learner] = await db
    .select()
    .from(learners)
    .where(eq(learners.userId, session.id))

  if (!learner) {
    redirect("/login")
  }

  // Parse socialLinks if it exists
  let socialLinks = null
  try {
    if (learner.socialLinks) {
      socialLinks = typeof learner.socialLinks === 'string'
        ? JSON.parse(learner.socialLinks)
        : learner.socialLinks
    }
  } catch (error) {
    console.error('Failed to parse socialLinks:', error)
    socialLinks = null
  }

  const initialData = {
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    email: user.email || "",
    country: learner.country || "",
    experienceLevel: learner.experienceLevel || "",
    learningGoals: learner.learningGoals || "",
    profilePictureUrl: learner.profilePictureUrl || null,
    timezone: learner.timezone || "",
    socialLinks: socialLinks || undefined,
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <LearnerHeader />
      <main className="container mx-auto px-4 py-8 space-y-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Profile Settings</h1>
        <LearnerSettingsForm initialData={initialData} />
      </main>
    </div>
  )
}
