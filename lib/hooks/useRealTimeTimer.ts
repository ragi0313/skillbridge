"use client"

import { useState, useEffect } from "react"

interface TimeRemaining {
  totalSeconds: number
  hours: number
  minutes: number
  seconds: number
  isExpired: boolean
}

export function useRealTimeTimer(targetDate: Date): TimeRemaining {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(() => {
    // During SSR, return a default state to prevent hydration mismatch
    if (typeof window === 'undefined') {
      return {
        totalSeconds: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        isExpired: false
      }
    }
    return calculateTimeRemaining(targetDate)
  })

  useEffect(() => {
    // Set the initial time immediately on client side
    setTimeRemaining(calculateTimeRemaining(targetDate))
    
    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining(targetDate))
    }, 1000)

    return () => clearInterval(interval)
  }, [targetDate])

  return timeRemaining
}

function calculateTimeRemaining(targetDate: Date): TimeRemaining {
  const now = new Date()
  const diffInMs = targetDate.getTime() - now.getTime()
  
  if (diffInMs <= 0) {
    return {
      totalSeconds: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isExpired: true
    }
  }

  const totalSeconds = Math.floor(diffInMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return {
    totalSeconds,
    hours,
    minutes,
    seconds,
    isExpired: false
  }
}

interface FormatOptions {
  compact?: boolean
  showSeconds?: boolean
}

export function formatTimeRemaining(timeRemaining: TimeRemaining, options: FormatOptions = {}): string {
  const { compact = false, showSeconds = true } = options
  const { hours, minutes, seconds, isExpired } = timeRemaining

  if (isExpired) {
    return "00:00"
  }

  if (compact) {
    if (hours > 0) {
      return showSeconds ? `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}` 
                         : `${hours}:${minutes.toString().padStart(2, '0')}`
    } else {
      return showSeconds ? `${minutes}:${seconds.toString().padStart(2, '0')}`
                         : `${minutes}m`
    }
  } else {
    const parts = []
    if (hours > 0) parts.push(`${hours}h`)
    if (minutes > 0) parts.push(`${minutes}m`)
    if (showSeconds && seconds > 0) parts.push(`${seconds}s`)
    
    return parts.join(' ') || '0s'
  }
}