"use client"

import { Card, CardContent } from "@/components/ui/card"

export function MentorCardSkeleton() {
  return (
    <Card className="border-0 bg-white rounded-3xl overflow-hidden shadow-lg">
      <CardContent className="p-0">
        {/* Header with Avatar and Basic Info */}
        <div className="relative p-8 pb-6">
          <div className="flex items-start gap-6">
            <div className="relative">
              <div className="h-20 w-20 bg-gray-200 rounded-full animate-pulse" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gray-200 rounded-full animate-pulse" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="h-6 bg-gray-200 rounded w-48 mb-2 animate-pulse" />
                  <div className="h-4 bg-gray-200 rounded w-32 mb-2 animate-pulse" />
                </div>
                <div className="h-8 bg-gray-200 rounded-full w-20 animate-pulse" />
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                <div className="h-4 bg-gray-200 rounded w-24 animate-pulse" />
                <div className="h-4 bg-gray-200 rounded w-20 animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        {/* Bio */}
        <div className="px-8 pb-6">
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-full animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-4/5 animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-3/5 animate-pulse" />
          </div>
        </div>

        {/* Skills */}
        <div className="px-8 pb-6">
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-6 bg-gray-200 rounded-full w-16 animate-pulse" />
            ))}
          </div>
        </div>

        {/* Languages */}
        <div className="px-8 pb-6">
          <div className="h-4 bg-gray-200 rounded w-40 animate-pulse" />
        </div>

        {/* Footer with Price and Actions */}
        <div className="px-8 pb-8">
          <div className="flex items-center justify-between pt-6 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <div className="h-8 bg-gray-200 rounded w-24 animate-pulse" />
            </div>

            <div className="flex items-center gap-3">
              <div className="h-10 bg-gray-200 rounded-xl w-24 animate-pulse" />
              <div className="h-10 bg-gray-200 rounded-xl w-32 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Availability Status */}
        <div className="px-8 py-3 bg-gray-50">
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-gray-200 rounded-full animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-32 animate-pulse" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
