"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { CreditCard, UserPlus, User, Settings, LogOut } from "lucide-react"
import Logo from "../ui/logo"

type Learner = {
  firstName: string
  lastName: string
  email: string
  creditsBalance: number
  profilePictureUrl?: string | null
}

export default function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const [learner, setLearner] = useState<Learner | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchLearner() {
      try {
        const res = await fetch("/api/learner/me")
        if (!res.ok) throw new Error("Unauthorized")
        const data = await res.json()
        setLearner(data.learner)
      } catch (err) {
        console.error("Failed to fetch learner", err)
        router.push("/login")
      } finally {
        setLoading(false)
      }
    }
    fetchLearner()
  }, [router])

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
    router.refresh()
  }

  if (loading || !learner) return null

  return (
    <header className="sticky top-0 z-50 bg-gray-900 border-b border-gray-900 shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Logo and Nav */}
          <div className="flex items-center space-x-8">
            <Logo textColor={"text-white"} />

            <nav className="hidden md:flex items-center space-x-6">
              <Link
                href="/learner/sessions"
                className={`px-3 py-2 rounded-md text-md font-medium transition-colors ${
                  pathname === "/learner/sessions"
                    ? "bg-blue-600 text-white"
                    : "text-gray-300 hover:text-white hover:bg-gray-800"
                }`}
              >
                Sessions
              </Link>
              <Link
                href="/find-mentors"
                className={`px-3 py-2 rounded-md text-md font-medium transition-colors ${
                  pathname === "/learner/browse-mentors"
                    ? "bg-blue-600 text-white"
                    : "text-gray-300 hover:text-white hover:bg-gray-800"
                }`}
              >
                Browse Mentors
              </Link>
              <Link
                href="/pricing"
                className={`px-3 py-2 rounded-md text-md font-medium transition-colors ${
                  pathname === "/pricing"
                    ? "bg-blue-600 text-white"
                    : "text-gray-300 hover:text-white hover:bg-gray-800"
                }`}
              >
                Buy Credits
              </Link>
            </nav>
          </div>

          {/* Right: Credits, Invite, Profile */}
          <div className="flex items-center space-x-4">
            <Badge variant="outline" className="cursor-pointer px-3 py-2 bg-yellow-600 border-yellow-500 text-white hover:bg-yellow-700">
              <CreditCard className="w-4 h-4 mr-2" />
              {learner.creditsBalance} credits
            </Badge>

            <Button
              variant="outline"
              size="sm"
              className="hidden sm:flex bg-transparent border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Invite a friend
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-gray-800 cursor-pointer">
                  <Avatar className="h-10 w-10">
                    <AvatarImage
                      src={learner.profilePictureUrl || "/default-avatar.png"}
                      alt="Profile"
                    />
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-gray-800 border-gray-700" align="end" forceMount>
                <div className="flex flex-col space-y-1 p-2">
                  <p className="text-sm font-medium leading-none text-white">
                    {learner.firstName} {learner.lastName}
                  </p>
                  <p className="text-xs leading-none text-gray-400">
                    {learner.email}
                  </p>
                </div>
                <DropdownMenuSeparator className="bg-gray-700" />
                <DropdownMenuItem asChild className="text-gray-300 hover:bg-gray-700 hover:text-white cursor-pointer">
                  <Link href="/learner/profile">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="text-gray-300 hover:bg-gray-700 hover:text-white cursor-pointer">
                  <Link href="/learner/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-gray-700" />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-400 hover:bg-red-900 hover:text-red-300 cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}
