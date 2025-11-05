'use client'

import { Badge } from '@/components/ui/badge'

interface SkillsDisplayProps {
  skills: string[]
}

export function SkillsDisplay({ skills }: SkillsDisplayProps) {
  if (skills.length === 0) {
    return <span className="text-sm text-gray-500">No skills listed</span>
  }

  // Split skills into columns of 4
  const columns: string[][] = []
  for (let i = 0; i < skills.length; i += 4) {
    columns.push(skills.slice(i, i + 4))
  }

  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2">
      {columns.map((column, colIndex) => (
        <div key={colIndex} className="flex flex-wrap gap-2">
          {column.map((skill, skillIndex) => (
            <Badge
              key={skillIndex}
              variant="secondary"
              className="px-3 py-1 bg-gray-100 text-gray-700 text-sm font-medium"
            >
              {skill}
            </Badge>
          ))}
        </div>
      ))}
    </div>
  )
}
