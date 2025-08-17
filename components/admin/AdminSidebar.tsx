"use client"

import { Clock, Users, TrendingUp, UserCheck, MessageSquare, Megaphone, Settings, LogOut, X, Video, FileText }  from "lucide-react"
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

const menuItems = [
  { id: "pending-mentors", label: "Pending Approvals", icon: Clock, badge: "12" },
  { id: "user-management", label: "Users Management", icon: Users },
  { id: "skill-categories", label: "Skill Categories", icon: Layers },
  { id: "learner-insights", label: "Learner Insights", icon: TrendingUp },
  { id: "mentor-directory", label: "Mentor Directory", icon: UserCheck },
  { id: "session-logs", label: "Session Logs", icon: Video },
  { id: "reports-feedback", label: "Reports & Feedback", icon: MessageSquare, badge: "3" },
  { id: "announcements", label: "Announcements", icon: Megaphone },
  { id: "audit-log", label: "Audit Log", icon: FileText },
  { id: "settings", label: "Platform Settings", icon: Settings },
]

export default function AdminSidebar({ activeSection, setActiveSection, isOpen, setIsOpen }: Props) {
  const handleMenuClick = (sectionId: string) => {
    setActiveSection(sectionId)
    setIsOpen(false) // Close sidebar on mobile after selection
  }
  const router = useRouter();
  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/")
    router.refresh()
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
            {menuItems.map((item) => (
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
              <AvatarImage src="/placeholder.svg?height=48&width=48" />
              <AvatarFallback className="bg-blue-600 text-white">SJ</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">Sarah Johnson</p>
              <p className="text-xs text-slate-400 truncate">Super Administrator</p>
              <p className="text-xs text-slate-500 truncate">admin@skillbridge.com</p>
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
}
