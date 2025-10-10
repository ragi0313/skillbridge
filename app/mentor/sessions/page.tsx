import { getSession } from "@/lib/auth/getSession"
import { redirect } from "next/navigation"
import { MentorSessionsPage } from "./MentorSessionsPage"

export default async function Page() {
  const session = await getSession()
  
  if (!session?.id || session.role !== 'mentor') {
    redirect('/login')
  }

  return <MentorSessionsPage />
}

export const metadata = {
  title: 'My Sessions | BridgeMentor',
  description: 'Manage your mentoring sessions',
}