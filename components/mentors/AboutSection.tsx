'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface AboutSectionProps {
  bio: string | null
}

export function AboutSection({ bio }: AboutSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!bio) return null

  const bioText = bio || ''
  const isLongBio = bioText.length > 300
  const displayText = isExpanded || !isLongBio ? bioText : `${bioText.slice(0, 300)}...`

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">About</h2>
      <div className="prose prose-gray max-w-none">
        <p className="text-gray-700 leading-relaxed mb-4 whitespace-pre-line">{displayText}</p>
        {isLongBio && (
          <Button
            variant="ghost"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-teal-600 hover:text-teal-700 p-0 h-auto font-medium"
          >
            {isExpanded ? 'Read less' : 'Read more'}
          </Button>
        )}
      </div>
    </div>
  )
}
