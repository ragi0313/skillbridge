"use client"

import { useState, useEffect, useImperativeHandle, forwardRef } from "react"
import { Clock, Users, TrendingUp, UserCheck, MessageSquare, Megaphone, Settings, LogOut, X, Video, FileText, Mail }  from "lucide-react"
import { Layers } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import Logo from "../ui/logo"

type Props = {
  activeSection: string
  setActiveSection: (section: string) => void
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

export interface AdminSidebarRef {
  refreshCounts: () => Promise<void>
}

interface AdminUser {
  firstName: string
  lastName: string
  profilePictureUrl?: string
}

interface SidebarCounts {
  pendingMentors: number
  openSupportTickets: number
  pendingReports: number
}

const getMenuItems = (counts: SidebarCounts) => [
  { id: "dashboard", label: "Dashboard", icon: TrendingUp },
  {
    id: "pending-mentors",
    label: "Pending Approvals",
    icon: Clock,
    badge: counts.pendingMentors > 0 ? counts.pendingMentors.toString() : undefined
  },
  { id: "user-management", label: "Users Management", icon: Users },
  { id: "skill-categories", label: "Skill Categories", icon: Layers },
  { id: "session-logs", label: "Session Logs", icon: Video },
  {
    id: "support-tickets",
    label: "Support Tickets",
    icon: Mail,
    badge: counts.openSupportTickets > 0 ? counts.openSupportTickets.toString() : undefined
  },
  { id: "audit-log", label: "Audit Log", icon: FileText },
  {
    id: "reports-feedback",
    label: "Reports & Feedback",
    icon: MessageSquare,
    badge: counts.pendingReports > 0 ? counts.pendingReports.toString() : undefined
  },
  { id: "announcements", label: "Announcements", icon: Megaphone },
  { id: "settings", label: "Platform Settings", icon: Settings },
]

const AdminSidebar = forwardRef<AdminSidebarRef, Props>(({ activeSection, setActiveSection, isOpen, setIsOpen }, ref) => {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [counts, setCounts] = useState<SidebarCounts>({
    pendingMentors: 0,
    openSupportTickets: 0,
    pendingReports: 0
  })

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        // Fetch admin profile and counts in parallel
        const [profileResponse, countsResponse] = await Promise.all([
          fetch('/api/admin/profile'),
          fetch('/api/admin/sidebar-counts')
        ])

        if (profileResponse.ok) {
          const profileData = await profileResponse.json()
          setAdminUser(profileData.admin)
        }

        if (countsResponse.ok) {
          const countsData = await countsResponse.json()
          setCounts(countsData.counts)
        }
      } catch (error) {
        console.error('Error fetching admin data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAdminData()

    // Refresh counts every 30 seconds
    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/admin/sidebar-counts')
        if (response.ok) {
          const data = await response.json()
          setCounts(data.counts)
        }
      } catch (error) {
        console.error('Error refreshing counts:', error)
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const handleMenuClick = (sectionId: string) => {
    setActiveSection(sectionId)
    setIsOpen(false) // Close sidebar on mobile after selection
  }

  // Function to refresh counts manually (can be called from other components)
  const refreshCounts = async () => {
    try {
      const response = await fetch('/api/admin/sidebar-counts')
      if (response.ok) {
        const data = await response.json()
        setCounts(data.counts)
      }
    } catch (error) {
      console.error('Error refreshing counts:', error)
    }
  }

  // Expose refresh function via ref
  useImperativeHandle(ref, () => ({
    refreshCounts
  }))
  const router = useRouter();
  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/")
    router.refresh()
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  }

  const getRandomBgColor = (firstName: string, lastName: string) => {
    const colors = [
      'bg-red-500',
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-teal-500',
      'bg-orange-500',
      'bg-cyan-500'
    ]

    // Generate consistent color based on name
    const nameHash = (firstName + lastName).split('').reduce((hash, char) => {
      return char.charCodeAt(0) + ((hash << 5) - hash)
    }, 0)

    return colors[Math.abs(nameHash) % colors.length]
  }
  return (
    <>
      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-full w-64 bg-slate-900 text-white flex flex-col shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        {/* Close button for mobile */}

        {/* Header */}
        <div className="pl-10 flex justify-center gap-1 items-center p-6 border-b border-slate-700">
          <div className="flex flex-col space-x-3 pl-4">
              <Logo textColor="text-white"/>
               <p className="text-xs text-slate-400 pl-10">Admin Dashboard</p>
            <div>
            </div>
          </div>
        <div className="lg:hidden p-4">
          <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)} className="text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </Button>
        </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-2">
            {getMenuItems(counts).map((item) => (
              <li key={item.id}>
                <Button
                  variant="ghost"
                  onClick={() => handleMenuClick(item.id)}
                  className={`w-full justify-start h-12 px-4 text-left transition-all duration-200 relative ${
                    activeSection === item.id
                      ? "gradient-bg text-white shadow-lg hover:text-white"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  <span className="text-sm font-medium flex-1">{item.label}</span>
                  {item.badge && <Badge className="ml-2 bg-red-500 text-white text-xs px-2 py-1">{item.badge}</Badge>}
                </Button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Admin Profile Section */}
        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center space-x-3 mb-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={adminUser?.profilePictureUrl || undefined} />
              <AvatarFallback className={`text-white font-semibold ${
                isLoading ? 'bg-gray-400' : adminUser ? getRandomBgColor(adminUser.firstName, adminUser.lastName) : 'bg-blue-600'
              }`}>
                {isLoading ? "..." : adminUser ? getInitials(adminUser.firstName, adminUser.lastName) : "AD"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {isLoading ? "Loading..." : adminUser ? `${adminUser.firstName} ${adminUser.lastName}` : "Admin User"}
              </p>
              <p className="text-xs text-slate-400 truncate">Administrator</p>
            </div>
          </div>

          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800"
            >
              <Settings className="w-4 h-4 mr-2" />
              Account Settings
            </Button>
            <Button
              onClick={handleLogout}
              variant="ghost"
              size="sm"
              className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-900/20"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Footer */}
      </div>
    </>
  )
})

AdminSidebar.displayName = 'AdminSidebar'

export default AdminSidebar
