"use client"

import { useState, useEffect, useRef, useCallback } from "react"

interface TimeRemaining {
  days: number
  hours: number
  minutes: number
  seconds: number
  totalSeconds: number
  isExpired: boolean
}

interface SessionTimerOptions {
  startTime: Date
  endTime: Date
  onTimeExpired?: () => void
}

interface SessionTimerResult {
  timeRemaining: number
  timeElapsed: number
  isSessionTime: boolean
}

interface FormatOptions {
  compact?: boolean
  showSeconds?: boolean
  showDays?: boolean
}

// Create separate hooks to avoid conditional hook calls
export function useRealTimeTimer(targetDate: Date): TimeRemaining
export function useRealTimeTimer(options: SessionTimerOptions): SessionTimerResult
export function useRealTimeTimer(
  options: Date | SessionTimerOptions
): TimeRemaining | SessionTimerResult {
  const isDateOnly = options instanceof Date
  
  if (isDateOnly) {
    return useCountdownTimer(options)
  }
  
  return useSessionTimer(options)
}

// Countdown timer for Date targets
function useCountdownTimer(targetDate: Date): TimeRemaining {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(() => 
    calculateTimeRemaining(targetDate)
  )
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const targetDateRef = useRef(targetDate)

  // Update ref when targetDate changes
  useEffect(() => {
    targetDateRef.current = targetDate
  }, [targetDate])

  useEffect(() => {
    const updateTime = () => {
      const remaining = calculateTimeRemaining(targetDateRef.current)
      setTimeRemaining(prev => {
        // Only update if values actually changed to prevent unnecessary re-renders
        if (
          prev.days === remaining.days &&
          prev.hours === remaining.hours &&
          prev.minutes === remaining.minutes &&
          prev.seconds === remaining.seconds &&
          prev.isExpired === remaining.isExpired
        ) {
          return prev
        }
        return remaining
      })
    }

    // Update immediately
    updateTime()

    // Set up interval
    intervalRef.current = setInterval(updateTime, 1000)

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, []) // Empty dependency array - only run once

  // Separate effect to handle expiration
  useEffect(() => {
    if (timeRemaining.isExpired && intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [timeRemaining.isExpired])

  return timeRemaining
}

// Session timer for start/end time ranges
function useSessionTimer({ startTime, endTime, onTimeExpired }: SessionTimerOptions): SessionTimerResult {
  const [timer, setTimer] = useState<SessionTimerResult>(() => 
    calculateSessionTime(startTime, endTime)
  )
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const hasExpiredRef = useRef(false)
  const onTimeExpiredRef = useRef(onTimeExpired)
  const startTimeRef = useRef(startTime)
  const endTimeRef = useRef(endTime)

  // Update refs when values change
  useEffect(() => {
    onTimeExpiredRef.current = onTimeExpired
  }, [onTimeExpired])

  useEffect(() => {
    startTimeRef.current = startTime
    endTimeRef.current = endTime
  }, [startTime, endTime])

  useEffect(() => {
    const updateTimer = () => {
      const newTimer = calculateSessionTime(startTimeRef.current, endTimeRef.current)
      setTimer(prev => {
        // Only update if values actually changed
        if (
          prev.timeRemaining === newTimer.timeRemaining &&
          prev.timeElapsed === newTimer.timeElapsed &&
          prev.isSessionTime === newTimer.isSessionTime
        ) {
          return prev
        }
        return newTimer
      })
      
      // Call onTimeExpired when session ends (only once)
      if (newTimer.timeRemaining <= 0 && !hasExpiredRef.current) {
        hasExpiredRef.current = true
        if (onTimeExpiredRef.current) {
          onTimeExpiredRef.current()
        }
      }
    }

    // Update immediately
    updateTimer()

    // Set up interval
    intervalRef.current = setInterval(updateTimer, 1000)

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, []) // Empty dependency array - only run once

  return timer
}

function calculateSessionTime(startTime: Date, endTime: Date): SessionTimerResult {
  const now = new Date()
  const start = new Date(startTime)
  const end = new Date(endTime)
  
  const isSessionTime = now >= start && now <= end
  
  if (isSessionTime) {
    const elapsedMs = now.getTime() - start.getTime()
    const remainingMs = end.getTime() - now.getTime()
    
    return {
      timeRemaining: Math.max(0, Math.floor(remainingMs / 1000)),
      timeElapsed: Math.floor(elapsedMs / 1000),
      isSessionTime: true
    }
  } else if (now < start) {
    // Session hasn't started yet
    return {
      timeRemaining: Math.floor((end.getTime() - start.getTime()) / 1000), // Full duration
      timeElapsed: 0,
      isSessionTime: false
    }
  } else {
    // Session has ended
    const totalDurationMs = end.getTime() - start.getTime()
    return {
      timeRemaining: 0,
      timeElapsed: Math.floor(totalDurationMs / 1000), // Full duration
      isSessionTime: false
    }
  }
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