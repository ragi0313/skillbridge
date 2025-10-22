import React from 'react'

interface CreditsIconProps {
  className?: string
}

export function CreditsIcon({ className = "w-4 h-4" }: CreditsIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer coin circle */}
      <circle
        cx="12"
        cy="12"
        r="10"
        fill="currentColor"
        opacity="0.2"
      />
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      {/* Inner circle for depth */}
      <circle
        cx="12"
        cy="12"
        r="7"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        opacity="0.6"
      />
      {/* "C" for Credits */}
      <path
        d="M14 8.5C13.2 7.8 12.2 7.5 11 7.5C8.8 7.5 7 9.3 7 11.5V12.5C7 14.7 8.8 16.5 11 16.5C12.2 16.5 13.2 16.2 14 15.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}
