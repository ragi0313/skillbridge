"use client"

import { useState, useRef } from "react"
import AdminSidebar, { AdminSidebarRef } from "@/components/admin/AdminSidebar"
import AdminTopbar from "@/components/admin/AdminTopbar"
import AdminDashboard from "@/components/admin/AdminDashboard"
import PendingMentorApproval from "@/components/admin/PendingMentorApproval"
import SkillCategoriesManagementPage from "@/components/admin/skill-categories/SkillCategoriesManagement"
import UserManagementPage from "@/components/admin/user-management/UserManagement"
import AuditLog from "@/components/admin/AuditLog"
import SessionLogs from "@/components/admin/SessionLogs"
import SupportTickets from "@/components/admin/SupportTickets"
import ReportsFeedback from "@/components/admin/ReportsFeedback"
import RefundRequests from "@/components/admin/RefundRequests"

export default function AdminDashboardPage() {
  const [activeSection, setActiveSection] = useState("dashboard")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const sidebarRef = useRef<AdminSidebarRef>(null)

  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return <AdminDashboard />
      case "pending-mentors":
        return <PendingMentorApproval onMentorUpdate={() => sidebarRef.current?.refreshCounts()} />
      case "user-management":
        return <UserManagementPage />
      case "skill-categories":
        return <SkillCategoriesManagementPage />
      case "session-logs":
        return <SessionLogs />
      case "refund-requests":
        return <RefundRequests />
      case "support-tickets":
        return <SupportTickets onTicketUpdate={() => sidebarRef.current?.refreshCounts()} />
      case "audit-log":
        return <AuditLog />
      case "reports":
        return <ReportsFeedback onReportUpdate={() => sidebarRef.current?.refreshCounts()} />
      // Future features:
      // case "learner-insights":
      //   return <LearnerInsights />
      // case "mentor-directory":
      //   return <MentorDirectory />
      // case "announcements":
      //   return <Announcements />
      default:
        return <AdminDashboard />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar
        ref={sidebarRef}
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
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  )
}
