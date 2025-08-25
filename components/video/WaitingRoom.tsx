"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SessionAccessData } from "@/types/session"
import { 
  Clock, 
  Video, 
  User, 
  Calendar,
  CheckCircle,
  AlertCircle,
  Timer
} from "lucide-react"

interface WaitingRoomProps {
  sessionData: SessionAccessData
  onJoin: () => void
  disabled?: boolean
}

export function WaitingRoom({ sessionData, onJoin, disabled = false }: WaitingRoomProps) {
  const [timeUntilStart, setTimeUntilStart] = useState<number>(sessionData.timeUntilMeeting || 0)
  const [currentTime, setCurrentTime] = useState<Date>(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date()
      setCurrentTime(now)
      
      const scheduledDate = new Date(sessionData.sessionDetails.scheduledDate)
      const timeRemaining = Math.max(0, Math.floor((scheduledDate.getTime() - now.getTime()) / 1000))
      setTimeUntilStart(timeRemaining)
    }, 1000)

    return () => clearInterval(timer)
  }, [sessionData.sessionDetails.scheduledDate])

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`
    } else {
      return `${secs}s`
    }
  }

  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    })
  }

  const canJoinNow = timeUntilStart <= 0 || sessionData.isWithinMeetingTime
  const isEarlyAccess = sessionData.isInWaitingRoom && timeUntilStart > 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Main Waiting Room Card */}
        <Card className="shadow-xl border-0 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold mb-2">
                  {isEarlyAccess ? "Waiting Room" : "Session Ready"}
                </CardTitle>
                <p className="text-blue-100">
                  You're joining as a <span className="font-semibold">{sessionData.userRole}</span>
                </p>
              </div>
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                {canJoinNow ? (
                  <CheckCircle className="w-8 h-8 text-white" />
                ) : (
                  <Clock className="w-8 h-8 text-white" />
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-8">
            {/* Session Information */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Calendar className="w-5 h-5 text-blue-600 mt-1" />
                  <div>
                    <h4 className="font-semibold text-gray-900">Scheduled Time</h4>
                    <p className="text-sm text-gray-600">
                      {formatDateTime(sessionData.sessionDetails.scheduledDate)}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Timer className="w-5 h-5 text-blue-600 mt-1" />
                  <div>
                    <h4 className="font-semibold text-gray-900">Duration</h4>
                    <p className="text-sm text-gray-600">
                      {sessionData.sessionDetails.durationMinutes} minutes
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <User className="w-5 h-5 text-blue-600 mt-1" />
                  <div>
                    <h4 className="font-semibold text-gray-900">Your Role</h4>
                    <p className="text-sm text-gray-600 capitalize">
                      {sessionData.userRole}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Video className="w-5 h-5 text-blue-600 mt-1" />
                  <div>
                    <h4 className="font-semibold text-gray-900">Session Status</h4>
                    <Badge variant="secondary" className="mt-1">
                      {sessionData.sessionDetails.status}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Time Until Session */}
            {!canJoinNow && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-yellow-800 mb-1">
                      Session starts in:
                    </h3>
                    <p className="text-sm text-yellow-700">
                      Please wait until the scheduled time to join the video call
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-yellow-800 font-mono">
                      {formatTime(timeUntilStart)}
                    </div>
                    <p className="text-xs text-yellow-600 mt-1">
                      Current time: {currentTime.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Ready to Join */}
            {canJoinNow && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                <div className="flex items-center space-x-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                  <div>
                    <h3 className="text-lg font-semibold text-green-800">Ready to Start!</h3>
                    <p className="text-green-700">
                      Your session is ready. Click the button below to join the video call.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Join Button */}
            <div className="text-center">
              <Button
                onClick={onJoin}
                disabled={disabled || !canJoinNow}
                size="lg"
                className={`px-12 py-4 text-lg font-semibold ${
                  canJoinNow 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                {disabled ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Preparing...
                  </>
                ) : canJoinNow ? (
                  <>
                    <Video className="w-5 h-5 mr-2" />
                    Join Video Session
                  </>
                ) : (
                  <>
                    <Clock className="w-5 h-5 mr-2" />
                    Wait for Session Time
                  </>
                )}
              </Button>
              
              {!canJoinNow && (
                <p className="text-sm text-gray-500 mt-3">
                  You can join up to 30 minutes before the scheduled time
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Help Information */}
        <Card className="mt-6">
          <CardContent className="p-6">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
              <AlertCircle className="w-5 h-5 text-blue-600 mr-2" />
              Before You Join
            </h4>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
              <ul className="space-y-2">
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Ensure your camera and microphone are working
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Check your internet connection
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Find a quiet, well-lit space
                </li>
              </ul>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Close other applications to save bandwidth
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Have your materials ready
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Use headphones for better audio quality
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}