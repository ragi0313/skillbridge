import { VideoCallMain } from "@/components/video/VideoCallMain"
import { getSession } from "@/lib/auth/getSession"
import { redirect } from "next/navigation"

interface SessionPageProps {
  params: Promise<{ id: string }>
}

export default async function SessionPage({ params }: SessionPageProps) {
  const session = await getSession()
  
  if (!session?.id) {
    redirect('/login')
  }

  const { id } = await params

  return (
    <div className="h-screen overflow-hidden">
      <VideoCallMain sessionId={id} />
    </div>
  )
}

export const metadata = {
  title: 'Video Session | SkillBridge',
  description: 'Join your mentoring session',
}