"use client"

import { useState } from "react"
import AdminSidebar from "@/components/admin/AdminSidebar"
import AdminTopbar from "@/components/admin/AdminTopbar"
import PendingMentorApproval from "@/components/admin/PendingMentorApproval"
import PlatformSettings from "@/components/admin/PlatformSettings"

export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState("pending-mentors")
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const renderContent = () => {
    switch (activeSection) {
      case "pending-mentors":
        return <PendingMentorApproval />
      // case "users":
      //   return <UsersManagement />
      // case "learner-insights":
      //   return <LearnerInsights />
      // case "mentor-directory":
      //   return <MentorDirectory />
      // case "session-logs":
      //   return <SessionLogs />
      // case "reports-feedback":
      //   return <ReportsFeedback />
      // case "announcements":
      //   return <Announcements />
      // case "audit-log":
      //   return <AuditLog />
      case "settings":
        return <PlatformSettings />
      default:
        return <PendingMentorApproval />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />
      <div className="flex-1 lg:ml-64">
        <AdminTopbar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <main className="p-4 lg:p-8">{renderContent()}</main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  )
}
