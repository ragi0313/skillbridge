"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
  setCurrentPage: (page: number) => void
  clearAllFilters: () => void
  MENTORS_PER_PAGE: number
}

export function MentorList({
  isLoading,
  filteredMentors,
  paginatedMentors,
  currentPage,
  totalPages,
  setCurrentPage,
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
          {totalPages > 1 && (
            <Badge variant="outline" className="text-sm">
              Page {currentPage} of {totalPages}
            </Badge>
          )}
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
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {((currentPage - 1) * MENTORS_PER_PAGE) + 1} to {Math.min(currentPage * MENTORS_PER_PAGE, filteredMentors.length)} of {filteredMentors.length} mentors
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="flex space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + 1
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="w-8 h-8 p-0"
                      >
                        {page}
                      </Button>
                    )
                  })}
                  {totalPages > 5 && (
                    <>
                      <span className="px-2">...</span>
                      <Button
                        variant={currentPage === totalPages ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(totalPages)}
                        className="w-8 h-8 p-0"
                      >
                        {totalPages}
                      </Button>
                    </>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
