"use client"

import { useState, useEffect, useRef } from "react"
import { Clock, AlertCircle, Play } from "lucide-react"
import { useRealTimeTimer, formatTimeRemaining } from "@/lib/hooks/useRealTimeTimer"

interface SessionCountdownProps {
  sessionDate: Date | string
  status: string
  showJoinButton?: boolean
  onCanJoin?: () => void
  className?: string
}

export function SessionCountdown({
  sessionDate,
  status,
  showJoinButton = false,
  onCanJoin,
  className = "",
}: SessionCountdownProps) {
  const sessionStart = new Date(sessionDate)
  const joinWindowStart = new Date(sessionStart.getTime() - 30 * 60 * 1000)

  const timeToSession = useRealTimeTimer(sessionStart)
  const timeToJoin = useRealTimeTimer(joinWindowStart)

  const [canJoin, setCanJoin] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const onCanJoinRef = useRef(onCanJoin)

  // Update callback ref
  useEffect(() => {
    onCanJoinRef.current = onCanJoin
  }, [onCanJoin])

  // Client-side hydration check
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Check if user can join - using refs to avoid dependency loops
  useEffect(() => {
    const now = new Date()
    const newCanJoin = now >= joinWindowStart && ["confirmed", "upcoming", "ongoing"].includes(status)

    // Only update and call callback if state actually changed
    if (newCanJoin !== canJoin) {
      setCanJoin(newCanJoin)
      if (newCanJoin && onCanJoinRef.current) {
        onCanJoinRef.current()
      }
    }
  }, [timeToJoin.isExpired, status, canJoin]) // Remove joinWindowStart from dependencies

  // Loading state to prevent hydration mismatch
  if (!isClient) {
    return (
      <div
        className={`flex flex-col items-center space-y-2 p-4 bg-gray-800/50 border border-gray-600/30 rounded-lg ${className}`}
      >
        <Clock className="h-6 w-6 text-gray-400" />
        <div className="text-center">
          <div className="text-lg font-mono font-semibold text-gray-300">Loading...</div>
          <div className="text-sm text-gray-400">calculating time</div>
        </div>
      </div>
    )
  }

  // Live session
  if (status === "ongoing") {
    return (
      <div
        className={`flex flex-col items-center space-y-3 p-6 bg-green-500/10 border border-green-400/30 rounded-2xl backdrop-blur-sm ${className}`}
      >
        <div className="bg-green-500 text-white px-6 py-3 rounded-full font-bold text-lg animate-pulse shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
            <span>LIVE NOW</span>
          </div>
        </div>
        {showJoinButton && (
          <div className="text-green-600 dark:text-green-400 font-medium flex items-center space-x-2">
            <Play className="h-4 w-4" />
            <span>Ready to Join</span>
          </div>
        )}
      </div>
    )
  }

  // Session has started/expired
  if (timeToSession.isExpired) {
    return (
      <div
        className={`flex flex-col items-center space-y-3 p-6 bg-red-500/10 border border-red-400/30 rounded-2xl backdrop-blur-sm ${className}`}
      >
        <AlertCircle className="h-8 w-8 text-red-500" />
        <span className="text-xl font-bold text-red-600 dark:text-red-400">Session has started</span>
      </div>
    )
  }

  // Can join waiting room
  if (canJoin) {
    return (
      <div
        className={`flex flex-col items-center space-y-4 p-6 bg-blue-500/10 border border-blue-400/30 rounded-2xl backdrop-blur-sm ${className}`}
      >
        <div className="text-center">
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2 font-mono">
            {formatTimeRemaining(timeToSession, {
              compact: true,
              showSeconds: timeToSession.totalSeconds < 300,
            })}
          </div>
          <div className="text-blue-700 dark:text-blue-300 font-medium">until session starts</div>
        </div>
        {showJoinButton && (
          <div className="bg-blue-600 text-white px-6 py-2 rounded-full font-medium animate-pulse shadow-lg">
            <div className="flex items-center space-x-2">
              <Play className="h-4 w-4" />
              <span>Can Join Waiting Room Now</span>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Can't join yet (showing time until join window)
  if (!timeToJoin.isExpired) {
    return (
      <div
        className={`flex flex-col items-center space-y-4 p-6 bg-orange-500/10 border border-orange-400/30 rounded-2xl backdrop-blur-sm ${className}`}
      >
        <div className="text-center">
          <div className="text-2xl font-bold text-slate-700 dark:text-slate-300 mb-2 font-mono">
            {formatTimeRemaining(timeToSession, { compact: true })}
          </div>
          <div className="text-slate-600 dark:text-slate-400 mb-4">until session starts</div>
          <div className="text-xl font-bold text-orange-600 dark:text-orange-400 font-mono">
            {formatTimeRemaining(timeToJoin, {
              compact: true,
              showSeconds: timeToJoin.totalSeconds < 300,
            })}
          </div>
          <div className="text-orange-700 dark:text-orange-300 font-medium">until you can join waiting room</div>
        </div>
      </div>
    )
  }

  // Default state - just showing time until session
  return (
    <div
      className={`flex flex-col items-center space-y-3 p-6 bg-slate-500/10 border border-slate-400/30 rounded-2xl backdrop-blur-sm ${className}`}
    >
      <Clock className="h-8 w-8 text-slate-500" />
      <div className="text-center">
        <div className="text-xl font-bold text-slate-700 dark:text-slate-300 font-mono">
          {formatTimeRemaining(timeToSession, { compact: true })}
        </div>
        <div className="text-slate-600 dark:text-slate-400">until session starts</div>
      </div>
    </div>
  )
}
