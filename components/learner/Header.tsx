"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CreditCard, User, Settings, LogOut, Bell, User2 } from 'lucide-react'
import Logo from "../ui/logo"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"

type Learner = {
  firstName: string
  lastName: string
  email: string
  creditsBalance: number
  profilePictureUrl?: string | null
}

type Notification = {
  id: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
  relatedEntityType: string | null
  relatedEntityId: string | null
}

export default function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const [learner, setLearner] = useState<Learner | null>(null)
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications")
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications)
        setUnreadCount(data.notifications.filter((n: Notification) => !n.isRead).length)
      } else {
        console.error("Failed to fetch notifications:", res.status)
      }
    } catch (error) {
      console.error("Error fetching notifications:", error)
    }
  }

  useEffect(() => {
    async function fetchLearnerAndNotifications() {
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
    fetchLearnerAndNotifications()
    fetchNotifications() // Fetch notifications on component mount
    const interval = setInterval(fetchNotifications, 60000) // Poll every minute
    return () => clearInterval(interval)
  }, [router])

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" })
      if (res.ok) {
        toast.success("Logged out successfully")
        router.push("/login")
      } else {
        throw new Error("Logout failed")
      }
    } catch (error) {
      console.error("Logout error:", error)
      toast.error("Logout Failed", {
        description: "An error occurred during logout.",
      })
    }
  }

  const handleNotificationClick = async (notificationId: string) => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ notificationIds: [notificationId] }),
      })
      if (res.ok) {
        fetchNotifications() // Re-fetch to update read status
      } else {
        console.error("Failed to mark notification as read")
      }
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
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
                href="/learner/dashboard"
                className={cn(
                  "px-3 py-2 rounded-md text-md font-medium transition-colors",
                  pathname === "/learner/dashboard"
                    ? "bg-blue-600 text-white"
                    : "text-gray-300 hover:text-white hover:bg-gray-800",
                )}
              >
                Dashboard
              </Link>
              <Link
                href="/learner/sessions"
                className={cn(
                  "px-3 py-2 rounded-md text-md font-medium transition-colors",
                  pathname === "/learner/sessions"
                    ? "bg-blue-600 text-white"
                    : "text-gray-300 hover:text-white hover:bg-gray-800",
                )}
              >
                My Sessions
              </Link>
              <Link
                href="/find-mentors"
                className={cn(
                  "px-3 py-2 rounded-md text-md font-medium transition-colors",
                  pathname === "/find-mentors"
                    ? "bg-blue-600 text-white"
                    : "text-gray-300 hover:text-white hover:bg-gray-800",
                )}
              >
                Find a Mentor
              </Link>
              {/* Removed "Buy Credits" link as it's often handled via a dedicated page or within settings */}
            </nav>
          </div>
          {/* Right: Credits, Notifications, Profile */}
          <div className="flex items-center space-x-4">
            <Badge
              variant="outline"
              className="cursor-pointer px-3 py-2 bg-yellow-600 border-yellow-500 text-white hover:bg-yellow-700"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              {learner.creditsBalance} credits
            </Badge>

            {/* Notifications Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-gray-800">
                  <Bell className="h-5 w-5 text-gray-300" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                      {unreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-80 bg-gray-800 border-gray-700 text-gray-300" align="end" forceMount>
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-gray-700" />
                <ScrollArea className="h-64">
                  {notifications.length === 0 ? (
                    <p className="p-4 text-sm text-muted-foreground">No new notifications.</p>
                  ) : (
                    notifications.map((notification) => (
                      <DropdownMenuItem
                        key={notification.id}
                        className={cn(
                          "flex flex-col items-start space-y-1 p-2 cursor-pointer hover:bg-gray-700",
                          !notification.isRead && "bg-blue-900/30", // Slightly darker blue for unread
                        )}
                        onClick={() => handleNotificationClick(notification.id)}
                      >
                        <div className="text-sm font-medium text-white">{notification.title}</div>
                        <p className="text-xs text-gray-400">{notification.message}</p>
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </span>
                      </DropdownMenuItem>
                    ))
                  )}
                </ScrollArea>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-gray-800 cursor-pointer">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={learner.profilePictureUrl || "/default-avatar.png"} alt="Profile" />
                    <AvatarFallback>
                      {learner.firstName[0]}
                      {learner.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-gray-800 border-gray-700" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none text-white">
                      {learner.firstName} {learner.lastName}
                    </p>
                    <p className="text-xs leading-none text-gray-400">{learner.email}</p>
                  </div>
                </DropdownMenuLabel>
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
