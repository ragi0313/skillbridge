"use client"

import { useState, useEffect, useRef } from "react"

interface TimeRemaining {
  days: number
  hours: number
  minutes: number
  seconds: number
  totalSeconds: number
  isExpired: boolean
}

interface FormatOptions {
  compact?: boolean
  showSeconds?: boolean
  showDays?: boolean
}

export function useRealTimeTimer(targetDate: Date): TimeRemaining {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(() => 
    calculateTimeRemaining(targetDate)
  )
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const updateTime = () => {
      const remaining = calculateTimeRemaining(targetDate)
      setTimeRemaining(remaining)
      
      // Stop timer if expired
      if (remaining.isExpired && intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    // Update immediately
    updateTime()

    // Set up interval if not expired
    if (!timeRemaining.isExpired) {
      intervalRef.current = setInterval(updateTime, 1000)
    }

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [targetDate])

  return timeRemaining
}

function calculateTimeRemaining(targetDate: Date): TimeRemaining {
  const now = new Date()
  const target = new Date(targetDate)
  const diffMs = target.getTime() - now.getTime()

  if (diffMs <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalSeconds: 0,
      isExpired: true
    }
  }

  const totalSeconds = Math.floor(diffMs / 1000)
  const days = Math.floor(totalSeconds / (24 * 60 * 60))
  const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60))
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60)
  const seconds = totalSeconds % 60

  return {
    days,
    hours,
    minutes,
    seconds,
    totalSeconds,
    isExpired: false
  }
}

export function formatTimeRemaining(
  timeRemaining: TimeRemaining,
  options: FormatOptions = {}
): string {
  const { compact = false, showSeconds = true, showDays = true } = options

  if (timeRemaining.isExpired) {
    return "Expired"
  }

  const parts: string[] = []

  if (showDays && timeRemaining.days > 0) {
    parts.push(compact ? `${timeRemaining.days}d` : `${timeRemaining.days} day${timeRemaining.days !== 1 ? 's' : ''}`)
  }

  if (timeRemaining.hours > 0 || (timeRemaining.days === 0 && timeRemaining.minutes > 0)) {
    parts.push(compact ? `${timeRemaining.hours}h` : `${timeRemaining.hours} hour${timeRemaining.hours !== 1 ? 's' : ''}`)
  }

  if (timeRemaining.minutes > 0 || (timeRemaining.days === 0 && timeRemaining.hours === 0)) {
    parts.push(compact ? `${timeRemaining.minutes}m` : `${timeRemaining.minutes} minute${timeRemaining.minutes !== 1 ? 's' : ''}`)
  }

  if (showSeconds && (timeRemaining.days === 0 && timeRemaining.hours === 0)) {
    parts.push(compact ? `${timeRemaining.seconds}s` : `${timeRemaining.seconds} second${timeRemaining.seconds !== 1 ? 's' : ''}`)
  }

  if (parts.length === 0) {
    return showSeconds ? "0s" : "0m"
  }

  return compact ? parts.join(' ') : parts.join(', ')
}