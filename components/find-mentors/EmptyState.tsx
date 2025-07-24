"use client" 

import { Card, CardContent } from "@/components/ui/card"
import { Search, Sparkles } from "lucide-react"

interface EmptyStateProps {
  onClearFilters: () => void
}

export function EmptyState({ onClearFilters }: EmptyStateProps) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Card className="w-full max-w-2xl rounded-3xl">
        <CardContent className="p-12 text-center">
          <div className="mb-8">
            <div className="relative inline-block">
              <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center mb-6 mx-auto">
                <Search className="w-12 h-12 text-purple-600" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-yellow-600" />
              </div>
            </div>
          </div>
          <h3 className="text-3xl font-bold text-gray-900 mb-4">No Mentors Found</h3>
        </CardContent>
      </Card>
    </div>
  )
}
