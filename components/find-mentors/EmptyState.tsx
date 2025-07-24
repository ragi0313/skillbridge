"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Search, Filter, Users, Sparkles } from "lucide-react"

interface EmptyStateProps {
  onClearFilters: () => void
}

export function EmptyState({ onClearFilters }: EmptyStateProps) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Card className="w-full max-w-2xl border-0 shadow-lg bg-white rounded-3xl">
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
          <p className="text-lg text-gray-600 mb-8 leading-relaxed">
            We couldn't find any mentors matching your current filters. Try adjusting your search criteria or explore
            our full mentor directory.
          </p>

          <div className="space-y-4 mb-8">
            <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                <span>Try different filters</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>Browse all mentors</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={onClearFilters}
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
            >
              <Filter className="w-5 h-5 mr-2" />
              Clear All Filters
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50 px-8 py-4 rounded-xl font-semibold transition-all duration-200 bg-white"
            >
              <Users className="w-5 h-5 mr-2" />
              Browse All Mentors
            </Button>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Need help finding the right mentor?{" "}
              <a href="/contact" className="text-purple-600 hover:text-purple-700 font-medium underline">
                Contact our support team
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
