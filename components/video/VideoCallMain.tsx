"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { VideoDisplay } from "./VideoDisplay"
import { VideoControls } from "./VideoControls"
import { ConnectionStatus } from "./ConnectionStatus"
import { WaitingRoom } from "./WaitingRoom"
import { SessionRatingModal } from "../session/SessionRatingModal"
import { useAgoraClient } from "./hooks/useAgoraClient"
import { useSessionUpdates } from "@/lib/hooks/useSessionUpdates"
import { SessionAccessData } from "@/types/session"
import { toast } from "@/lib/toast"
import { 
  Phone, 
  PhoneOff, 
  AlertTriangle, 
  Clock, 
  Users,
  Wifi,
  WifiOff 
} from "lucide-react"

interface VideoCallMainProps {
  sessionId: string
}

export function VideoCallMain({ sessionId }: VideoCallMainProps) {
  const [sessionData, setSessionData] = useState<SessionAccessData | null>(null)
  const [agoraToken, setAgoraToken] = useState<string | null>(null)
  const [callStarted, setCallStarted] = useState(false)
  const [callEnded, setCallEnded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [sessionCompleted, setSessionCompleted] = useState(false)
  
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const endTimeRef = useRef<Date | null>(null)
  const forceDisconnectRef = useRef(false)

  // Agora client hook
  const {
    client,
    localVideoTrack,
    localAudioTrack,
    remoteUsers,
    isConnected: agoraConnected,
    isVideoEnabled,
    isAudioEnabled,
    connectionState,
    networkQuality,
    participantCount,
    error: agoraError,
    join: joinAgora,
    leave: leaveAgora,
    toggleVideo,
    toggleAudio,
    reconnect: reconnectAgora
  } = useAgoraClient({
    onUserJoined: (user) => {
      console.log(`[VIDEO_CALL] User ${user.uid} joined`)
      toast.success(`${sessionData?.userRole === 'learner' ? 'Mentor' : 'Learner'} joined the call`)
    },
    onUserLeft: (user) => {
      console.log(`[VIDEO_CALL] User ${user.uid} left`)
      toast.info(`${sessionData?.userRole === 'learner' ? 'Mentor' : 'Learner'} left the call`)
    },
    maxParticipants: 2
  })

  // Session updates hook
  const { isConnected: sseConnected, lastMessage } = useSessionUpdates({
    onSessionUpdate: (data) => {
      if (data.sessionId.toString() === sessionId) {
        if (data.type === 'force_disconnect') {
          handleForceDisconnect(data.message || 'Session ended by system')
        } else if (data.type === 'session_terminated') {
          handleSessionComplete()
        }
      }
    },
    enableToasts: true
  })

  // Load session access data
  const loadSessionData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/sessions/${sessionId}/join`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to load session')
      }

      const data = await response.json()
      setSessionData(data)

      // Calculate time remaining for session
      if (data.sessionDetails.scheduledDate && data.sessionDetails.durationMinutes) {
        const scheduledStart = new Date(data.sessionDetails.scheduledDate)
        const sessionEnd = new Date(scheduledStart.getTime() + data.sessionDetails.durationMinutes * 60 * 1000)
        endTimeRef.current = sessionEnd
        
        const now = new Date()
        const remaining = Math.max(0, Math.floor((sessionEnd.getTime() - now.getTime()) / 1000))
        setTimeRemaining(remaining)
      }

      // Generate Agora token
      const tokenResponse = await fetch('/api/agora/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: data.channel,
          role: data.userRole
        })
      })

      if (!tokenResponse.ok) {
        throw new Error('Failed to generate video token')
      }

      const tokenData = await tokenResponse.json()
      setAgoraToken(tokenData.token)

    } catch (err: any) {
      console.error('[VIDEO_CALL] Error loading session:', err)
      setError(err.message || 'Failed to load session data')
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  // Handle joining the video call
  const handleJoinCall = useCallback(async () => {
    if (!sessionData || !agoraToken) {
      setError('Session data or token not available')
      return
    }

    try {
      // Record join in database
      const joinResponse = await fetch(`/api/sessions/${sessionId}/join`, {
        method: 'POST'
      })

      if (!joinResponse.ok) {
        const errorData = await joinResponse.json()
        if (errorData.code === 'ALREADY_CONNECTED') {
          setError('You are already connected from another device/browser. This is a 1-on-1 session.')
          return
        }
        throw new Error(errorData.error || 'Failed to join session')
      }

      // Join Agora channel
      await joinAgora({
        appId: process.env.NEXT_PUBLIC_AGORA_APP_ID!,
        channel: sessionData.channel,
        token: agoraToken,
        uid: Date.now() // Generate unique UID
      })

      setCallStarted(true)
      toast.success('Connected to video call')

    } catch (err: any) {
      console.error('[VIDEO_CALL] Error joining call:', err)
      setError(err.message || 'Failed to join video call')
    }
  }, [sessionData, agoraToken, sessionId, joinAgora])

  // Handle leaving the video call
  const handleLeaveCall = useCallback(async () => {
    try {
      // Leave Agora channel
      await leaveAgora()

      // Record leave in database
      await fetch(`/api/sessions/${sessionId}/leave`, {
        method: 'POST'
      })

      setCallStarted(false)
      toast.info('Left video call')

    } catch (err: any) {
      console.error('[VIDEO_CALL] Error leaving call:', err)
      toast.error('Error leaving call')
    }
  }, [leaveAgora, sessionId])

  // Handle session completion
  const handleSessionComplete = useCallback(() => {
    setSessionCompleted(true)
    setCallEnded(true)
    leaveAgora()
    
    if (sessionData?.userRole === 'learner') {
      setShowRatingModal(true)
    }
  }, [leaveAgora, sessionData])

  // Handle force disconnect
  const handleForceDisconnect = useCallback((reason: string) => {
    forceDisconnectRef.current = true
    setCallEnded(true)
    setError(reason)
    leaveAgora()
    toast.error(reason)
  }, [leaveAgora])

  // Handle manual session end
  const handleEndSession = useCallback(async () => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endType: 'completed' })
      })

      if (!response.ok) {
        throw new Error('Failed to end session')
      }

      handleSessionComplete()
      toast.success('Session completed successfully')

    } catch (err: any) {
      console.error('[VIDEO_CALL] Error ending session:', err)
      toast.error(err.message || 'Failed to end session')
    }
  }, [sessionId, handleSessionComplete])

  // Timer for session duration
  useEffect(() => {
    if (callStarted && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleSessionComplete()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [callStarted, timeRemaining, handleSessionComplete])

  // Load session data on mount
  useEffect(() => {
    loadSessionData()
  }, [loadSessionData])

  // Format time remaining
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md p-6 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading session...</p>
        </Card>
      </div>
    )
  }

  if (error && !callStarted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Join Session</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={loadSessionData} className="w-full">
            Try Again
          </Button>
        </Card>
      </div>
    )
  }

  if (!sessionData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Session Not Available</h3>
          <p className="text-gray-600">This session is not accessible.</p>
        </Card>
      </div>
    )
  }

  // Show waiting room if not within meeting time
  if (!sessionData.isWithinMeetingTime && !callStarted) {
    return (
      <WaitingRoom
        sessionData={sessionData}
        onJoin={handleJoinCall}
        disabled={!agoraToken}
      />
    )
  }

  if (callEnded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md p-6 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Phone className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {sessionCompleted ? 'Session Completed' : 'Call Ended'}
          </h3>
          <p className="text-gray-600 mb-4">
            {forceDisconnectRef.current 
              ? 'The session was ended by the system.' 
              : 'Thank you for your session!'}
          </p>
          <Button 
            onClick={() => window.close()} 
            className="w-full"
          >
            Close Window
          </Button>
        </Card>

        {showRatingModal && (
          <SessionRatingModal
            sessionId={parseInt(sessionId)}
            onClose={() => setShowRatingModal(false)}
          />
        )}
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Badge variant={callStarted ? "default" : "secondary"}>
              {callStarted ? 'Connected' : 'Ready to Join'}
            </Badge>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Users className="w-4 h-4" />
              <span>{participantCount}/2 participants</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {callStarted && (
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                <span>{formatTime(timeRemaining)}</span>
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              {sseConnected ? (
                <Wifi className="w-4 h-4 text-green-500" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-500" />
              )}
              <ConnectionStatus 
                connectionState={connectionState}
                networkQuality={networkQuality}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Video Display */}
      <div className="flex-1 relative">
        {callStarted ? (
          <VideoDisplay
            localVideoTrack={localVideoTrack}
            remoteUsers={remoteUsers}
            isVideoEnabled={isVideoEnabled}
            userName={sessionData.userName}
          />
        ) : (
          <div className="h-full flex items-center justify-center">
            <Card className="p-8 text-center">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Phone className="w-12 h-12 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Ready to Start Session</h3>
              <p className="text-gray-600 mb-6">
                Click the button below to join your video session with your{' '}
                {sessionData.userRole === 'learner' ? 'mentor' : 'learner'}.
              </p>
              <Button
                onClick={handleJoinCall}
                disabled={!agoraToken || loading}
                size="lg"
                className="px-8"
              >
                {loading ? 'Connecting...' : 'Join Video Call'}
              </Button>
            </Card>
          </div>
        )}
      </div>

      {/* Controls */}
      {callStarted && (
        <div className="bg-white border-t border-gray-200 p-4">
          <VideoControls
            isVideoEnabled={isVideoEnabled}
            isAudioEnabled={isAudioEnabled}
            onToggleVideo={toggleVideo}
            onToggleAudio={toggleAudio}
            onEndCall={handleLeaveCall}
            onCompleteSession={handleEndSession}
            userRole={sessionData.userRole}
          />
        </div>
      )}

      {/* Error Display */}
      {(error || agoraError) && (
        <div className="absolute top-20 right-4 bg-red-50 border border-red-200 rounded-lg p-3 max-w-sm">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-red-800">Connection Issue</h4>
              <p className="text-sm text-red-700">{error || agoraError}</p>
              {agoraError && (
                <Button
                  onClick={reconnectAgora}
                  size="sm"
                  variant="outline"
                  className="mt-2"
                >
                  Reconnect
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}