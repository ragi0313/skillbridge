"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import MentorHeader from "@/components/mentor/Header"
import Footer from "@/components/landing/Footer"
import { XenditCreditWithdrawal } from "@/components/mentors/XenditCreditWithdrawal"

export default function WithdrawalsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/session")
        const data = await response.json()
        
        if (!data.user) {
          router.push("/auth/login")
          return
        }
        
        if (data.user.role !== "mentor") {
          router.push("/dashboard")
          return
        }
        
        setUser(data.user)
      } catch (error) {
        console.error("Auth check failed:", error)
        router.push("/auth/login")
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MentorHeader />
      <XenditCreditWithdrawal />
      <Footer />
    </div>
  )
}