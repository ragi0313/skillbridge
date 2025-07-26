"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import LearnerHeader from "@/components/learner/Header"
import MentorHeader from "@/components/mentor/Header"
import Header from "@/components/landing/Header"

type SessionUser = {
  id: number
  role: "learner" | "mentor" | "admin"
}

export default function UnifiedHeader() {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch("/api/auth/session")
        const data = await res.json()
        if (data?.user) {
          setUser(data.user)
        }
      } catch (err) {
        console.error("Error fetching session:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchSession()
  }, [])

  if (loading) return null

  if (!user) return <Header />
  if (user.role === "learner") return <LearnerHeader />
  if (user.role === "mentor") return <MentorHeader />

  return null // optionally render <AdminHeader /> in the future
}
