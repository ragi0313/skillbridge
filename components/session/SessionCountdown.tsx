"use client"

import { useState, useEffect, useRef } from "react"
import { Clock, AlertCircle, Play } from "lucide-react"
import { useRealTimeTimer, formatTimeRemaining } from "@/lib/hooks/useRealTimeTimer"
import { Badge } from "@/components/ui/badge"

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
  className = "" 
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
    const newCanJoin = now >= joinWindowStart && 
                      ["confirmed", "upcoming", "ongoing"].includes(status)
    
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
      <div className={`flex flex-col items-center space-y-2 p-4 bg-gray-800/50 border border-gray-600/30 rounded-lg ${className}`}>
        <Clock className="h-6 w-6 text-gray-400" />
        <div className="text-center">
          <div className="text-lg font-mono font-semibold text-gray-300">
            Loading...
          </div>
          <div className="text-sm text-gray-400">calculating time</div>
        </div>
      </div>
    )
  }

  // Live session
  if (status === "ongoing") {
    return (
      <div className={`flex flex-col items-center space-y-3 p-4 bg-green-900/20 border border-green-600/30 rounded-lg ${className}`}>
        <Badge variant="default" className="bg-green-600 animate-pulse text-lg px-4 py-2">
          <div className="w-3 h-3 bg-white rounded-full mr-2 animate-pulse" />
          LIVE NOW
        </Badge>
        {showJoinButton && (
          <Badge variant="outline" className="text-green-400 border-green-400 bg-green-900/10 px-3 py-1">
            <Play className="h-4 w-4 mr-2" />
            Ready to Join
          </Badge>
        )}
      </div>
    )
  }

  // Session has started/expired
  if (timeToSession.isExpired) {
    return (
      <div className={`flex flex-col items-center space-y-2 p-4 bg-red-900/20 border border-red-600/30 rounded-lg ${className}`}>
        <AlertCircle className="h-6 w-6 text-red-400" />
        <span className="text-lg font-semibold text-red-400">Session has started</span>
      </div>
    )
  }

  // Can join waiting room
  if (canJoin) {
    return (
      <div className={`flex flex-col items-center space-y-3 p-6 bg-blue-900/20 border border-blue-600/30 rounded-lg ${className}`}>
        <div className="text-center">
          <div className="text-2xl font-mono font-bold text-blue-400 mb-1">
            {formatTimeRemaining(timeToSession, { 
              compact: true, 
              showSeconds: timeToSession.totalSeconds < 300 
            })}
          </div>
          <div className="text-sm text-blue-300">until session starts</div>
        </div>
        {showJoinButton && (
          <Badge variant="outline" className="text-blue-400 border-blue-400 bg-blue-900/10 animate-pulse px-4 py-2">
            <Play className="h-4 w-4 mr-2" />
            Can Join Waiting Room Now
          </Badge>
        )}
      </div>
    )
  }

  // Can't join yet (showing time until join window)
  if (!timeToJoin.isExpired) {
    return (
      <div className={`flex flex-col items-center space-y-3 p-6 bg-orange-900/20 border border-orange-600/30 rounded-lg ${className}`}>
        <div className="text-center">
          <div className="text-xl font-mono font-bold text-gray-300 mb-1">
            {formatTimeRemaining(timeToSession, { compact: true })}
          </div>
          <div className="text-sm text-gray-400 mb-3">until session starts</div>
          <div className="text-lg font-mono font-semibold text-orange-400">
            {formatTimeRemaining(timeToJoin, { 
              compact: true, 
              showSeconds: timeToJoin.totalSeconds < 300 
            })}
          </div>
          <div className="text-sm text-orange-300">until you can join waiting room</div>
        </div>
      </div>
    )
  }

  // Default state - just showing time until session
  return (
    <div className={`flex flex-col items-center space-y-2 p-4 bg-gray-800/50 border border-gray-600/30 rounded-lg ${className}`}>
      <Clock className="h-6 w-6 text-gray-400" />
      <div className="text-center">
        <div className="text-lg font-mono font-semibold text-gray-300">
          {formatTimeRemaining(timeToSession, { compact: true })}
        </div>
        <div className="text-sm text-gray-400">until session starts</div>
      </div>
    </div>
  )
}