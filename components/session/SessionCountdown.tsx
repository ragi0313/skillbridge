"use client"

import { useState, useEffect } from "react"
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
  const joinWindowStart = new Date(sessionStart.getTime() - 30 * 60 * 1000) // 30 minutes before
  
  const timeToSession = useRealTimeTimer(sessionStart)
  const timeToJoin = useRealTimeTimer(joinWindowStart)
  
  const [canJoin, setCanJoin] = useState(false)

  useEffect(() => {
    const now = new Date()
    const newCanJoin = now >= joinWindowStart && 
                      ["confirmed", "upcoming", "ongoing"].includes(status)
    
    if (newCanJoin !== canJoin) {
      setCanJoin(newCanJoin)
      if (newCanJoin && onCanJoin) {
        onCanJoin()
      }
    }
  }, [timeToJoin, status, joinWindowStart, canJoin, onCanJoin])

  if (status === "ongoing") {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Badge variant="default" className="bg-green-600 animate-pulse">
          <div className="w-2 h-2 bg-white rounded-full mr-2"></div>
          Live Now
        </Badge>
        {showJoinButton && (
          <Badge variant="outline" className="text-green-600 border-green-600">
            <Play className="h-3 w-3 mr-1" />
            Ready to Join
          </Badge>
        )}
      </div>
    )
  }

  if (timeToSession.isExpired) {
    return (
      <div className={`flex items-center space-x-2 text-red-600 ${className}`}>
        <AlertCircle className="h-4 w-4" />
        <span className="text-sm font-medium">Session has started</span>
      </div>
    )
  }

  if (canJoin) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Badge variant="default" className="bg-blue-600">
          <Clock className="h-3 w-3 mr-1" />
          Starts in {formatTimeRemaining(timeToSession, { compact: true, showSeconds: timeToSession.totalSeconds < 300 })}
        </Badge>
        {showJoinButton && (
          <Badge variant="outline" className="text-blue-600 border-blue-600 animate-pulse">
            <Play className="h-3 w-3 mr-1" />
            Can Join Now
          </Badge>
        )}
      </div>
    )
  }

  if (timeToJoin.isExpired) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Badge variant="secondary">
          <Clock className="h-3 w-3 mr-1" />
          Starts in {formatTimeRemaining(timeToSession, { compact: true })}
        </Badge>
        <Badge variant="outline" className="text-orange-600 border-orange-600">
          Join opens in {formatTimeRemaining(timeToJoin, { compact: true, showSeconds: timeToJoin.totalSeconds < 300 })}
        </Badge>
      </div>
    )
  }

  return (
    <div className={`flex items-center space-x-2 text-gray-600 ${className}`}>
      <Clock className="h-4 w-4" />
      <span className="text-sm">
        Starts in {formatTimeRemaining(timeToSession, { compact: true })}
      </span>
    </div>
  )
}