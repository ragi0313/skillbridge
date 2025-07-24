"use client"

import { MentorCard } from "./MentorCard"
import { MentorCardSkeleton } from "./MentorCardSkeleton"
import { EmptyState } from "./EmptyState"
import { Button } from "@/components/ui/button"
import { ChevronDown } from "lucide-react"
import type { Mentor } from "./types"

interface MentorListProps {
  isLoading: boolean
  filteredMentors: Mentor[]
  paginatedMentors: Mentor[]
  currentPage: number
  totalPages: number
  handleLoadMore: () => void
  clearAllFilters: () => void
  MENTORS_PER_PAGE: number
}

export function MentorList({
  isLoading,
  filteredMentors,
  paginatedMentors,
  currentPage,
  totalPages,
  handleLoadMore,
  clearAllFilters,
  MENTORS_PER_PAGE,
}: MentorListProps) {
  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
          <div className="h-8 bg-gray-200 rounded w-32 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {Array.from({ length: MENTORS_PER_PAGE }).map((_, index) => (
            <MentorCardSkeleton key={index} />
          ))}
        </div>
      </div>
    )
  }

  if (filteredMentors.length === 0) {
    return <EmptyState onClearFilters={clearAllFilters} />
  }

  const startIndex = (currentPage - 1) * MENTORS_PER_PAGE + 1
  const endIndex = Math.min(currentPage * MENTORS_PER_PAGE, filteredMentors.length)

  return (
    <div className="space-y-8">
      {/* Results Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-900">
            {filteredMentors.length} {filteredMentors.length === 1 ? "Mentor" : "Mentors"} Found
          </h2>
          <div className="text-sm text-gray-600 bg-gray-100 px-4 py-2 rounded-full">
            Showing {startIndex}-{endIndex} of {filteredMentors.length}
          </div>
        </div>
      </div>

      {/* Mentor Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {paginatedMentors.map((mentor) => (
          <MentorCard key={mentor.id} mentor={mentor} />
        ))}
      </div>

      {/* Load More Button */}
      {currentPage < totalPages && (
        <div className="flex justify-center pt-8">
          <Button
            onClick={handleLoadMore}
            variant="outline"
            size="lg"
            className="px-8 py-4 border-2 border-purple-200 text-purple-600 hover:bg-purple-50 hover:border-purple-300 rounded-xl font-semibold transition-all duration-200 bg-white shadow-sm"
          >
            <ChevronDown className="mr-2 h-5 w-5" />
            Load More Mentors
          </Button>
        </div>
      )}

      {/* Pagination Info */}
      {totalPages > 1 && (
        <div className="text-center text-sm text-gray-600">
          Page {currentPage} of {totalPages}
        </div>
      )}
    </div>
  )
}
