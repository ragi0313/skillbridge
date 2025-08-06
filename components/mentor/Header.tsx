"use client"

import { Separator } from "@/components/ui/separator"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu, User2, LogOut, Settings, Bell } from 'lucide-react'
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Toggle } from "../ui/toggle"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "sonner"
import { useEffect, useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatDistanceToNow } from "date-fns"

type Notification = {
  id: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
  relatedEntityType: string | null
  relatedEntityId: string | null
}

export default function MentorHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<{ firstName: string; lastName: string; profilePictureUrl: string | null } | null>(
    null,
  )
  const [loadingUser, setLoadingUser] = useState(true)
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
    async function fetchMentorProfile() {
      try {
        const res = await fetch("/api/mentor/me")
        if (res.ok) {
          const data = await res.json()
          setUser(data.mentor)
        } else {
          // Handle cases where mentor data might not be found or unauthorized
          console.error("Failed to fetch mentor profile:", res.status)
          setUser(null)
        }
      } catch (error) {
        console.error("Error fetching mentor profile:", error)
        setUser(null)
      } finally {
        setLoadingUser(false)
      }
    }
    fetchMentorProfile()
    fetchNotifications() // Fetch notifications on component mount
    const interval = setInterval(fetchNotifications, 60000) // Poll every minute
    return () => clearInterval(interval)
  }, [])

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
      })
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

  const navItems = [
    { name: "Dashboard", href: "/mentor/dashboard" },
    { name: "My Sessions", href: "/mentor/sessions" },
    // { name: "Earnings", href: "/mentor/earnings" },
  ]

  return (
    <header className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-sm border-b border-gray-200 shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/mentor/dashboard" className="flex items-center text-2xl font-bold text-gray-900">
          SkillBridge
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "text-md font-medium transition-colors hover:text-blue-600",
                pathname === item.href ? "text-blue-600" : "text-gray-600",
              )}
            >
              {item.name}
            </Link>
          ))}
          <Toggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                    {unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80" align="end" forceMount>
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <ScrollArea className="h-64">
                {notifications.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">No new notifications.</p>
                ) : (
                  notifications.map((notification) => (
                    <DropdownMenuItem
                      key={notification.id}
                      className={cn(
                        "flex flex-col items-start space-y-1 p-2 cursor-pointer",
                        !notification.isRead && "bg-blue-50/50",
                      )}
                      onClick={() => handleNotificationClick(notification.id)}
                    >
                      <div className="text-sm font-medium">{notification.title}</div>
                      <p className="text-xs text-muted-foreground">{notification.message}</p>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </span>
                    </DropdownMenuItem>
                  ))
                )}
              </ScrollArea>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user?.profilePictureUrl || "/default-avatar.png"} alt="User Avatar" />
                  <AvatarFallback>
                    {user ? user.firstName[0] + user.lastName[0] : <User2 className="h-5 w-5" />}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user ? `${user.firstName} ${user.lastName}` : "Mentor"}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {/* User email could go here if available */}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/mentor/settings" className="flex items-center">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        {/* Mobile Navigation */}
        <div className="md:hidden flex items-center space-x-2">
          <Toggle />
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[250px] sm:w-[300px] flex flex-col">
              <Link href="/mentor/dashboard" className="flex items-center text-2xl font-bold text-gray-900 mb-6">
                SkillBridge
              </Link>
              <nav className="flex flex-col gap-4">
                {navItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "text-lg font-medium transition-colors hover:text-blue-600",
                      pathname === item.href ? "text-blue-600" : "text-gray-700",
                    )}
                  >
                    {item.name}
                  </Link>
                ))}
                <Separator className="my-2" />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="w-full justify-start relative">
                      <Bell className="mr-2 h-4 w-4" />
                      Notifications
                      {unreadCount > 0 && (
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                          {unreadCount}
                        </span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-full" align="start" forceMount>
                    <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <ScrollArea className="h-64">
                      {notifications.length === 0 ? (
                        <p className="p-4 text-sm text-muted-foreground">No new notifications.</p>
                      ) : (
                        notifications.map((notification) => (
                          <DropdownMenuItem
                            key={notification.id}
                            className={cn(
                              "flex flex-col items-start space-y-1 p-2 cursor-pointer",
                              !notification.isRead && "bg-blue-50/50",
                            )}
                            onClick={() => handleNotificationClick(notification.id)}
                          >
                            <div className="text-sm font-medium">{notification.title}</div>
                            <p className="text-xs text-muted-foreground">{notification.message}</p>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                            </span>
                          </DropdownMenuItem>
                        ))
                      )}
                    </ScrollArea>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Link href="/mentor/settings" passHref>
                  <Button variant="ghost" className="w-full justify-start">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Button>
                </Link>
                <Button onClick={handleLogout} variant="ghost" className="w-full justify-start text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
