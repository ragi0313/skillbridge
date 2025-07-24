"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import Logo from "../ui/logo"

export default function MentorHeader() {
  const [mentor, setMentor] = useState<{
    firstName: string
    lastName: string
    email: string
    profilePicture: string | null
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const fetchMentor = async () => {
      try {
        const res = await fetch("/api/mentor/me")
        if (!res.ok) throw new Error("Unauthorized")
        const data = await res.json()
        setMentor(data)
      } catch (err) {
        if (pathname !== "/login") {
          router.push("/login")
        }
      } finally {
        setLoading(false)
      }
    }
    fetchMentor()
  }, [router, pathname])

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
  }

  return (
    <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Logo />

        {loading ? (
          <Skeleton className="w-8 h-8 rounded-full" />
        ) : mentor ? (
          <div className="flex items-center gap-4">
            <div className="flex flex-col text-right">
              <p className="text-sm font-medium text-gray-800">
                {mentor.firstName} {mentor.lastName}
              </p>
              <p className="text-xs text-gray-500">{mentor.email}</p>
            </div>
            <Avatar className="w-8 h-8">
              <AvatarImage
                src={mentor.profilePicture || "/default-avatar.png"}
                alt={`${mentor.firstName} ${mentor.lastName}`}
              />
              <AvatarFallback>
                {mentor.firstName?.charAt(0).toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="ml-2"
            >
              <LogOut className="w-4 h-4 mr-1" />
              Logout
            </Button>
          </div>
        ) : null}
      </div>
    </header>
  )
}
