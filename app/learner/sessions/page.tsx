import { getSession } from "@/lib/auth/getSession"
import { redirect } from "next/navigation"
import { LearnerSessionsPage } from "./LearnerSessionsPage"

export default async function Page() {
  const session = await getSession()
  
  if (!session?.id || session.role !== 'learner') {
    redirect('/login')
  }

  return <LearnerSessionsPage />
}

export const metadata = {
  title: 'My Sessions | SkillBridge',
  description: 'Manage your learning sessions',
}