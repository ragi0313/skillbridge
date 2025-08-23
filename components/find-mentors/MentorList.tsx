"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Star, Users, Award } from "lucide-react"
import { MentorCard } from "./MentorCard"
import { MentorCardSkeleton } from "./MentorCardSkeleton"
import { EmptyState } from "./EmptyState"
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
  return (
    <div className="space-y-8">
      {/* Results Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold text-gray-900">
            {filteredMentors.length} Mentor{filteredMentors.length !== 1 ? "s" : ""} Found
          </h2>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-8">
          {Array.from({ length: 4 }).map((_, index) => (
            <MentorCardSkeleton key={index} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredMentors.length === 0 && <EmptyState onClearFilters={clearAllFilters} />}

      {/* Mentor Grid - Single Column */}
      {!isLoading && filteredMentors.length > 0 && (
        <>
          <div className="space-y-8">
            {paginatedMentors.map((mentor) => (
              <MentorCard key={mentor.id} mentor={mentor} />
            ))}
          </div>
          {/* Load More Button */}
          {currentPage < totalPages && (
            <div className="flex justify-center pt-8">
              <Button
                onClick={handleLoadMore}
                size="lg"
                className="gradient-bg text-white font-semibold px-12 py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              >
                Load More Mentors
              </Button>
            </div>
          )}
          {/* Pagination Info */}
          <div className="text-center text-sm text-gray-500">
            Showing {Math.min(currentPage * MENTORS_PER_PAGE, filteredMentors.length)} of {filteredMentors.length}{" "}
            mentors
          </div>
        </>
      )}
    </div>
  )
}
