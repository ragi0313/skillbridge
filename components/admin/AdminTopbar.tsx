"use client"

import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"

type Props = {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

export default function AdminTopbar({ sidebarOpen, setSidebarOpen }: Props) {
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 lg:px-8">
      <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden">
        <Menu className="w-5 h-5" />
      </Button>
      <div className="ml-4 text-sm text-gray-600">
        Admin Panel
      </div>
    </header>
  )
}
