import { getSession } from "@/lib/auth/getSession"
import { db } from "@/db"
import { users, learners } from "@/db/schema"
import { eq } from "drizzle-orm"
import { LearnerSettingsForm } from "@/components/settings/LearnerSettingsForm"
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

  const initialData = {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    country: learner.country,
    experienceLevel: learner.experienceLevel,
    learningGoals: learner.learningGoals,
    profilePictureUrl: learner.profilePictureUrl,
    timezone: learner.timezone,
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-8 lg:p-12 bg-gray-50">
      <LearnerSettingsForm initialData={initialData} />
    </main>
  )
}
