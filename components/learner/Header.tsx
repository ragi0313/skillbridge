"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CreditCard, User, Settings, LogOut, Bell, Menu, X, MoreVertical, Check, Trash2, CheckCheck, Trash } from "lucide-react"
import Logo from "../ui/logo"
import { ScrollArea } from "@/components/ui/scroll-area"
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
  relatedEntityType?: string | null
  relatedEntityId?: string | null
}

export function LearnerHeader() {
  const router = useRouter()
  const pathname = usePathname()
  const [learner, setLearner] = useState<Learner | null>(null)
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [loadingNotifications, setLoadingNotifications] = useState<{ [key: string]: boolean }>({})
  const unreadNotificationsCount = notifications.filter((n) => !n.isRead).length

  async function safeJsonParse(response: Response) {
    const text = await response.text()
    if (!text.trim()) {
      throw new Error('Empty response received')
    }
    
    try {
      return JSON.parse(text)
    } catch (error) {
      console.error('Failed to parse JSON:', text)
      throw new Error(`Invalid JSON response: ${text.substring(0, 100)}...`)
    }
  }

  useEffect(() => {
      async function fetchData() {
        try {
          setLoading(true)
          
          const [learnerRes, notificationsRes] = await Promise.all([
            fetch("/api/learner/me"),
            fetch("/api/notifications")
          ])
  
          if (!learnerRes.ok) {
            throw new Error(`Failed to fetch learner profile: ${learnerRes.status}`)
          }
          
          const learnerData = await safeJsonParse(learnerRes)
          setLearner(learnerData)
  
          if (!notificationsRes.ok) {
            throw new Error(`Failed to fetch notifications: ${notificationsRes.status}`)
          }
          
          const notificationsData = await safeJsonParse(notificationsRes)
          setNotifications(notificationsData.notifications || [])
          
        } catch (err: any) {
          console.error("Failed to fetch data", err)
          toast.error("Error loading data", { 
            description: err.message || "Unknown error occurred" 
          })
          
          if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
            router.push("/login")
          }
        } finally {
          setLoading(false)
        }
      }
  
      fetchData()
  }, [router])
  
  const handleLogout = async () => {
      await fetch("/api/auth/logout", { method: "POST" })
      router.push("/login")
      router.refresh()
  }
  
  const handleNotificationClick = async (
      notificationId: string,
      relatedEntityType?: string | null,
      relatedEntityId?: string | null,
    ) => {
      // Don't navigate if the notification is already read
      if (notifications.find(n => n.id === notificationId)?.isRead) {
        if (relatedEntityType === "session" && relatedEntityId) {
          router.push(`/learner/sessions?sessionId=${relatedEntityId}`)
        }
        return
      }
  
      try {
        const res = await fetch("/api/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notificationId, action: "markRead" }),
        })
  
        if (!res.ok) {
          const errorText = await res.text()
          let errorMessage = "Failed to mark notification as read"
          
          try {
            const errorData = JSON.parse(errorText)
            errorMessage = errorData.error || errorMessage
          } catch {
            errorMessage = errorText || errorMessage
          }
          
          throw new Error(errorMessage)
        }
  
        // Update local state
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
        )
  
        // Navigate to related entity
        if (relatedEntityType === "session" && relatedEntityId) {
          router.push(`/learner/sessions?sessionId=${relatedEntityId}`)
        }
      } catch (err: any) {
        toast.error("Error marking notification as read", {
          description: err.message,
        })
      }
  }
  
  const handleMarkAsRead = async (notificationId: string, event: React.MouseEvent) => {
      event.stopPropagation() // Prevent triggering the main notification click
      
      setLoadingNotifications(prev => ({ ...prev, [notificationId]: true }))
      
      try {
        const res = await fetch("/api/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notificationId, action: "markRead" }),
        })
  
        if (!res.ok) {
          const errorData = await safeJsonParse(res)
          throw new Error(errorData.error || "Failed to mark notification as read")
        }
  
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
        )
  
        toast.success("Notification marked as read")
      } catch (err: any) {
        toast.error("Error marking notification as read", {
          description: err.message,
        })
      } finally {
        setLoadingNotifications(prev => ({ ...prev, [notificationId]: false }))
      }
  }
  
  const handleDeleteNotification = async (notificationId: string, event: React.MouseEvent) => {
      event.stopPropagation() // Prevent triggering the main notification click
      
      setLoadingNotifications(prev => ({ ...prev, [notificationId]: true }))
      
      try {
        const res = await fetch("/api/notifications", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notificationId }),
        })
  
        if (!res.ok) {
          const errorData = await safeJsonParse(res)
          throw new Error(errorData.error || "Failed to delete notification")
        }
  
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
        toast.success("Notification deleted")
      } catch (err: any) {
        toast.error("Error deleting notification", {
          description: err.message,
        })
      } finally {
        setLoadingNotifications(prev => ({ ...prev, [notificationId]: false }))
      }
  }

  const handleMarkAllAsRead = async () => {
    try {
      const res = await fetch("/api/notifications/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "markAllAsRead" }),
      })

      if (!res.ok) {
        const errorData = await safeJsonParse(res)
        throw new Error(errorData.error || "Failed to mark all notifications as read")
      }

      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      toast.success("All notifications marked as read")
    } catch (err: any) {
      toast.error("Error marking all notifications as read", {
        description: err.message,
      })
    }
  }

  const handleDeleteAllNotifications = async () => {
    try {
      const res = await fetch("/api/notifications/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deleteAll" }),
      })

      if (!res.ok) {
        const errorData = await safeJsonParse(res)
        throw new Error(errorData.error || "Failed to delete all notifications")
      }

      setNotifications([])
      toast.success("All notifications deleted")
    } catch (err: any) {
      toast.error("Error deleting all notifications", {
        description: err.message,
      })
    }
  }

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  if (loading || !learner) return null

  return (
    <header className="sticky top-0 z-50 bg-gray-900 border-b border-gray-900 shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Logo and Desktop Nav */}
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
                  pathname === "/find-mentors"
                    ? "bg-blue-600 text-white"
                    : "text-gray-300 hover:text-white hover:bg-gray-800"
                }`}
              >
                Browse Mentors
              </Link>
              <Link
                href="/learner/messages"
                className={`px-3 py-2 rounded-md text-md font-medium transition-colors ${
                  pathname === "/learner/messages"
                    ? "bg-blue-600 text-white"
                    : "text-gray-300 hover:text-white hover:bg-gray-800"
                }`}
              >
                Messages
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

          {/* Right: Credits, Notifications, Profile, Mobile Menu */}
          <div className="flex items-center space-x-4">
            {/* Credits - Hidden on mobile */}
            <Badge
              variant="outline"
              className="hidden sm:flex cursor-pointer px-3 py-2 bg-yellow-600 border-yellow-500 text-white hover:bg-yellow-700"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              {learner.creditsBalance} credits
            </Badge>

            {/* Notifications - Hidden on mobile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="hidden sm:flex relative h-10 w-10 rounded-full hover:bg-gray-800 cursor-pointer"
                >
                  <Bell className="h-5 w-5 text-gray-300" />
                  {unreadNotificationsCount > 0 && (
                    <span className="absolute top-1 right-1 h-4 w-4 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold">
                      {unreadNotificationsCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                className="w-96 bg-gray-800 border-gray-700" 
                align="end" 
                forceMount
              >
                <div className="flex flex-col space-y-1 p-2">
                  <p className="text-sm font-medium leading-none text-white">Notifications</p>
                  <p className="text-xs leading-none text-gray-400">
                    {unreadNotificationsCount > 0 ? `${unreadNotificationsCount} unread` : "No new notifications"}
                  </p>
                </div>
                <DropdownMenuSeparator className="bg-gray-700" />
                
                <ScrollArea className="h-60">
                  {notifications.length === 0 ? (
                    <p className="p-4 text-center text-gray-400 text-sm">No notifications yet.</p>
                  ) : (
                    notifications.map((notification) => (
                      <div key={notification.id} className="relative group">
                        <DropdownMenuItem
                          className={`flex flex-col items-start p-3 pr-10 cursor-pointer border-b border-gray-700 last:border-b-0 ${
                            notification.isRead
                              ? "text-gray-400"
                              : "text-white font-medium bg-gray-750"
                          } hover:bg-gray-700`}
                          onClick={() =>
                            handleNotificationClick(
                              notification.id,
                              notification.relatedEntityType,
                              notification.relatedEntityId
                            )
                          }
                        >
                          <span className="text-sm font-medium">{notification.title}</span>
                          <span className="text-xs text-gray-300 mt-1 line-clamp-2">
                            {notification.message}
                          </span>
                          <span className="text-xs text-gray-500 mt-2">
                            {formatDistanceToNow(new Date(notification.createdAt), {
                              addSuffix: true,
                            })}
                          </span>
                        </DropdownMenuItem>
                        
                        {/* Actions Dropdown */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 hover:bg-gray-600"
                                onClick={(e) => e.stopPropagation()}
                                disabled={loadingNotifications[notification.id]}
                              >
                                <MoreVertical className="h-3 w-3 text-gray-400" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              className="w-40 bg-gray-800 border-gray-700"
                              align="end"
                            >
                              {!notification.isRead && (
                                <DropdownMenuItem
                                  className="text-gray-300 hover:bg-gray-700 hover:text-white cursor-pointer text-xs"
                                  onClick={(e) => handleMarkAsRead(notification.id, e)}
                                  disabled={loadingNotifications[notification.id]}
                                >
                                  <Check className="mr-2 h-3 w-3" />
                                  Mark as read
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                className="text-red-400 hover:bg-red-900 hover:text-red-300 cursor-pointer text-xs"
                                onClick={(e) => handleDeleteNotification(notification.id, e)}
                                disabled={loadingNotifications[notification.id]}
                              >
                                <Trash2 className="mr-2 h-3 w-3" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))
                  )}
                </ScrollArea>
                
                {/* Bulk Actions */}
                {notifications.length > 0 && (
                  <>
                    <DropdownMenuSeparator className="bg-gray-700" />
                    <div className="flex gap-1 p-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleMarkAllAsRead}
                        className="flex-1 h-8 text-xs text-gray-300 hover:bg-gray-700 hover:text-white"
                        disabled={unreadNotificationsCount === 0}
                      >
                        <CheckCheck className="h-3 w-3 mr-1" />
                        Mark All Read
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDeleteAllNotifications}
                        className="flex-1 h-8 text-xs text-red-400 hover:bg-red-900 hover:text-red-300"
                      >
                        <Trash className="h-3 w-3 mr-1" />
                        Delete All
                      </Button>
                    </div>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Profile Dropdown - Always visible */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-gray-800 cursor-pointer">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={learner.profilePictureUrl || "/default-avatar.png"} alt="Profile" />
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-gray-800 border-gray-700" align="end" forceMount>
                <div className="flex flex-col space-y-1 p-2">
                  <p className="text-sm font-medium leading-none text-white">
                    {learner.firstName} {learner.lastName}
                  </p>
                  <p className="text-xs leading-none text-gray-400">{learner.email}</p>
                </div>
                <DropdownMenuSeparator className="bg-gray-700" />
                {/* Mobile-only items */}
                <div className="md:hidden">
                  <DropdownMenuItem asChild className="text-gray-300 hover:bg-gray-700 hover:text-white cursor-pointer">
                    <div className="flex items-center px-2 py-2">
                      <CreditCard className="mr-2 h-4 w-4" />
                      {learner.creditsBalance} credits
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="text-gray-300 hover:bg-gray-700 hover:text-white cursor-pointer">
                    <div className="flex items-center px-2 py-2">
                      <Bell className="mr-2 h-4 w-4" />
                      Notifications {unreadNotificationsCount > 0 && `(${unreadNotificationsCount})`}
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-gray-700" />
                </div>
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

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMenu}
                className="text-gray-300 hover:text-white hover:bg-gray-800"
              >
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-gray-700 mt-4">
              <Link
                href="/learner/sessions"
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  pathname === "/learner/sessions"
                    ? "bg-blue-600 text-white"
                    : "text-gray-300 hover:text-white hover:bg-gray-800"
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                Sessions
              </Link>
              <Link
                href="/find-mentors"
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  pathname === "/find-mentors"
                    ? "bg-blue-600 text-white"
                    : "text-gray-300 hover:text-white hover:bg-gray-800"
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                Browse Mentors
              </Link>
              <Link
                href="/pricing"
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  pathname === "/pricing"
                    ? "bg-blue-600 text-white"
                    : "text-gray-300 hover:text-white hover:bg-gray-800"
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                Buy Credits
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}