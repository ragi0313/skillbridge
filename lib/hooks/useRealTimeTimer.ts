"use client"

import { useState, useEffect } from "react"

interface TimeRemaining {
  days: number
  hours: number
  minutes: number
  seconds: number
  totalSeconds: number
  isExpired: boolean
}

export function useRealTimeTimer(targetDate: Date | string): TimeRemaining {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(() => 
    calculateTimeRemaining(targetDate)
  )

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining(targetDate))
    }, 1000)

    return () => clearInterval(timer)
  }, [targetDate])

  return timeRemaining
}

function calculateTimeRemaining(targetDate: Date | string): TimeRemaining {
  const now = new Date().getTime()
  const target = new Date(targetDate).getTime()
  const difference = target - now

  if (difference <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalSeconds: 0,
      isExpired: true
    }
  }

  const days = Math.floor(difference / (1000 * 60 * 60 * 24))
  const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((difference % (1000 * 60)) / 1000)

  return {
    days,
    hours,
    minutes,
    seconds,
    totalSeconds: Math.floor(difference / 1000),
    isExpired: false
  }
}

export function formatTimeRemaining(timeRemaining: TimeRemaining, options?: {
  showSeconds?: boolean
  compact?: boolean
}): string {
  const { showSeconds = false, compact = false } = options || {}
  
  if (timeRemaining.isExpired) {
    return "Expired"
  }

  const parts: string[] = []
  
  if (timeRemaining.days > 0) {
    parts.push(`${timeRemaining.days}${compact ? 'd' : ' day' + (timeRemaining.days !== 1 ? 's' : '')}`)
  }
  
  if (timeRemaining.hours > 0 || timeRemaining.days > 0) {
    parts.push(`${timeRemaining.hours}${compact ? 'h' : ' hour' + (timeRemaining.hours !== 1 ? 's' : '')}`)
  }
  
  if (timeRemaining.minutes > 0 || timeRemaining.hours > 0 || timeRemaining.days > 0) {
    parts.push(`${timeRemaining.minutes}${compact ? 'm' : ' minute' + (timeRemaining.minutes !== 1 ? 's' : '')}`)
  }
  
  if (showSeconds && timeRemaining.days === 0 && timeRemaining.hours === 0) {
    parts.push(`${timeRemaining.seconds}${compact ? 's' : ' second' + (timeRemaining.seconds !== 1 ? 's' : '')}`)
  }

  if (parts.length === 0) {
    return showSeconds ? "Less than 1 second" : "Less than 1 minute"
  }

  return parts.join(compact ? ' ' : ', ')
}