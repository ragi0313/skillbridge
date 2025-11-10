"use client"

import { cn } from "@/lib/utils"
import { User, Shield } from "lucide-react"

interface SettingsSidebarProps {
  activeSection: string
  onSectionChange: (section: string) => void
}

export function SettingsSidebar({ activeSection, onSectionChange }: SettingsSidebarProps) {
  const sections = [
    {
      id: "profile",
      label: "Profile",
      icon: User,
      description: "Personal information"
    },
    {
      id: "authentication",
      label: "Authentication",
      icon: Shield,
      description: "Security settings"
    }
  ]

  return (
    <nav className="space-y-1">
      {sections.map((section) => {
        const Icon = section.icon
        const isActive = activeSection === section.id

        return (
          <button
            key={section.id}
            onClick={() => onSectionChange(section.id)}
            className={cn(
              "w-full flex items-start gap-3 px-4 py-3 text-left rounded-lg transition-all",
              isActive
                ? "bg-blue-50 text-blue-700 shadow-sm"
                : "text-gray-700 hover:bg-gray-50"
            )}
          >
            <Icon className={cn(
              "h-5 w-5 mt-0.5 flex-shrink-0",
              isActive ? "text-blue-600" : "text-gray-400"
            )} />
            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-sm font-medium",
                isActive ? "text-blue-700" : "text-gray-900"
              )}>
                {section.label}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {section.description}
              </p>
            </div>
          </button>
        )
      })}
    </nav>
  )
}
