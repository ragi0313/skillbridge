"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { VideoOff, MessageCircle } from "lucide-react"
import { toast } from "@/lib/toast"

import WaitingRoom from "@/components/session/WaitingRoom"
import ChatPanel from "@/components/video/ChatPanel"
import SessionRatingModal from "@/components/session/SessionRatingModal"

import { ConnectionStatus } from "./ConnectionStatus"
import { VideoControls } from "./VideoControls"
import { VideoDisplay } from "./VideoDisplay"
import { useAgoraClient } from "./hooks/useAgoraClient"
import { useMediaControls } from "./hooks/useMediaControls"
import { VideoCallLogger } from "./utils/logger"
import { CallState, VideoCallProps, SessionAccessData, toSafeError } from "./types"

export default function VideoCall({ sessionId, userRole, agoraChannel }: VideoCallProps) {
  const router = useRouter()
  
  // State management
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sessionAccessData, setSessionAccessData] = useState<SessionAccessData | null>(null)
  const [showWaitingRoom, setShowWaitingRoom] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [isSubmittingRating, setIsSubmittingRating] = useState(false)
  
  const [callState, setCallState] = useState<CallState>({
    isConnected: false,
    isVideoEnabled: true,
    isAudioEnabled: true,
    isScreenSharing: false,
    participantCount: 0,
    connectionQuality: "excellent",
    callDuration: 0,
    isReconnecting: false,
    connectionLost: false,
    lastDisconnectTime: null,
    remoteUsers: [],
    disconnectionCount: 0,
    poorQualityDuration: 0,
    lastPoorQualityStart: null,
    reconnectionFailures: 0,
    technicalIssuesDetected: false,
  })

  // Refs
  const localVideoRef = useRef<HTMLDivElement | null>(null)
  const remoteVideoRef = useRef<HTMLDivElement | null>(null)
  const callStartTimeRef = useRef<Date | null>(null)
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Navigation handler
  const handleCallEnd = useCallback(() => {
    const redirectPath = userRole === "learner" ? "/learner/sessions" : "/mentor/sessions"
    router.push(redirectPath)
  }, [userRole, router])

  // Session tracking
  const trackSessionJoin = useCallback(async () => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (response.ok) {
        const data = await response.json()
        VideoCallLogger.log("Session join tracked", data)
        return data
      }
    } catch (error) {
      VideoCallLogger.error("Failed to track session join", error)
    }
    return null
  }, [sessionId])

  const trackSessionLeave = useCallback(async () => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (response.ok) {
        const data = await response.json()
        VideoCallLogger.log("Session leave tracked", data)
        return data
      }
    } catch (error) {
      VideoCallLogger.error("Failed to track session leave", error)
    }
    return null
  }, [sessionId])

  // Initialize hooks
  const agoraClient = useAgoraClient({
    sessionId,
    callState,
    setCallState,
    localVideoRef,
    remoteVideoRef,
    callStartTimeRef,
    sessionAccessData,
    trackSessionJoin,
  })

  const mediaControls = useMediaControls({
    callState,
    setCallState,
    clientRef: agoraClient.clientRef,
    localVideoRef,
    localVideoTrackRef: agoraClient.localVideoTrackRef,
    localAudioTrackRef: agoraClient.localAudioTrackRef,
    screenTrackRef: agoraClient.screenTrackRef,
    safePublish: agoraClient.safePublish,
  })

  // Technical issues detection
  const checkTechnicalIssues = useCallback(() => {
    const issues = {
      excessiveDisconnections: callState.disconnectionCount >= 8,
      prolongedPoorQuality: callState.poorQualityDuration >= 300,
      multipleReconnectionFailures: callState.reconnectionFailures >= 5,
    }

    const hasTechnicalIssues = Object.values(issues).some(Boolean)
    
    if (hasTechnicalIssues && !callState.technicalIssuesDetected) {
      VideoCallLogger.log("Technical issues detected automatically", issues)
      setCallState(prev => ({ ...prev, technicalIssuesDetected: true }))
      
      toast.error("Severe technical issues detected. Session will be ended with automatic refund.")
      
      setTimeout(() => {
        leaveCall('technical_issues')
      }, 5000)
      
      return true
    }
    
    return false
  }, [callState])

  // Session access check
  const checkSessionAccess = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true)
      
      const response = await fetch(`/api/sessions/${sessionId}/join`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      })

      const data = await response.json()
      
      if (!response.ok) {
        if (response.status === 400 && data.waitingMinutes) {
          setSessionAccessData(data)
          setShowWaitingRoom(true)
          setIsLoading(false)
          return false
        } else {
          throw new Error(data.error || "Failed to access session")
        }
      }

      setSessionAccessData(data)
      setShowWaitingRoom(false)
      return true
    } catch (error) {
      const safeError = toSafeError(error)
      VideoCallLogger.error("Session access check failed", error)
      setError(safeError.message || "Failed to check session access")
      setIsLoading(false)
      return false
    }
  }, [sessionId])

  // Cleanup function
  const cleanupVideoCall = useCallback(async () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current)
      durationIntervalRef.current = null
    }

    if (agoraClient.localVideoTrackRef.current) {
      agoraClient.localVideoTrackRef.current.close()
      agoraClient.localVideoTrackRef.current = null
    }
    if (agoraClient.localAudioTrackRef.current) {
      agoraClient.localAudioTrackRef.current.close()
      agoraClient.localAudioTrackRef.current = null
    }
    if (agoraClient.screenTrackRef.current) {
      agoraClient.screenTrackRef.current.close()
      agoraClient.screenTrackRef.current = null
    }

    if (agoraClient.clientRef.current) {
      await agoraClient.clientRef.current.leave()
      agoraClient.clientRef.current = null
    }

    setCallState((prev) => ({ ...prev, isConnected: false }))
  }, [agoraClient])

  // Leave call without completing session
  const leaveCallOnly = useCallback(async () => {
    try {
      VideoCallLogger.log("User leaving call (session remains ongoing)")
      await trackSessionLeave()
      await cleanupVideoCall()
      handleCallEnd()
    } catch (error) {
      VideoCallLogger.error("Error leaving call", error)
      handleCallEnd()
    }
  }, [handleCallEnd, trackSessionLeave, cleanupVideoCall])

  // Complete session and leave
  const leaveCall = useCallback(async (endType: 'technical_issues' = 'technical_issues') => {
    try {
      VideoCallLogger.log(`Completing session with endType: ${endType}`)
      
      await trackSessionLeave()
      
      if (endType === 'technical_issues') {
        // Complete session for technical issues
        const response = await fetch(`/api/sessions/${sessionId}/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endType })
        })

        if (response.ok) {
          toast.success("Session ended due to technical issues. Refund processed.")
        }
      }

      await cleanupVideoCall()
      handleCallEnd()
    } catch (error) {
      VideoCallLogger.error("Error in leaveCall", error)
      handleCallEnd()
    }
  }, [sessionId, trackSessionLeave, cleanupVideoCall, handleCallEnd])

  // Handle rating submission
  const handleRatingSubmit = useCallback(async (rating: number, reviewText?: string) => {
    setIsSubmittingRating(true)
    VideoCallLogger.debug('Submitting mentor rating', { sessionId, rating, hasReviewText: !!reviewText })
    
    try {
      const requestBody = {
        sessionId: parseInt(sessionId),
        rating,
        reviewText: reviewText || ""
      }

      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      const responseData = await response.json()

      if (!response.ok) {
        throw new Error(responseData.error || responseData.details || 'Failed to submit mentor rating')
      }

      toast.success('Thank you for rating your mentor!')
      setShowRatingModal(false)
      await leaveCallOnly()
      
    } catch (error) {
      VideoCallLogger.error('Error submitting rating', error)
      toast.error(toSafeError(error).message || 'Failed to submit rating')
    } finally {
      setIsSubmittingRating(false)
    }
  }, [sessionId, leaveCallOnly])

  // Initialize call
  const initializeCall = useCallback(async () => {
    VideoCallLogger.log(`initializeCall called for session ${sessionId}`)
    try {
      setIsLoading(true)

      const canAccess = await checkSessionAccess()
      if (!canAccess) return

      await agoraClient.createClient()
      await mediaControls.createMediaTracks()

      setIsLoading(false)
      setCallState((prev) => ({ ...prev, isConnected: true }))
      toast.success("Connected to video call")
    } catch (error) {
      const safeError = toSafeError(error)
      VideoCallLogger.error("Failed to initialize Agora call", error)
      if (safeError.message !== "Rate limited") {
        toast.error(safeError.message || "Failed to connect to video call")
      }
      setError(safeError.message || "Failed to connect to video call")
      setIsLoading(false)
    }
  }, [sessionId, checkSessionAccess, agoraClient, mediaControls])

  // Format duration utility
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Effects
  useEffect(() => {
    if (callState.isConnected) {
      const interval = setInterval(checkTechnicalIssues, 5000)
      return () => clearInterval(interval)
    }
  }, [checkTechnicalIssues, callState.isConnected])

  useEffect(() => {
    if (callState.isConnected && callStartTimeRef.current && !durationIntervalRef.current) {
      durationIntervalRef.current = setInterval(() => {
        if (callStartTimeRef.current) {
          const now = new Date()
          const duration = Math.floor((now.getTime() - callStartTimeRef.current.getTime()) / 1000)
          setCallState((prev) => ({ ...prev, callDuration: duration }))
        }
      }, 1000)
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
        durationIntervalRef.current = null
      }
    }
  }, [callState.isConnected])

  // Initialize call on mount - only once!
  useEffect(() => {
    let isInitialized = false
    
    const initCall = async () => {
      if (!isInitialized) {
        isInitialized = true
        await initializeCall()
      }
    }
    
    initCall()

    return () => {
      if (agoraClient.clientRef.current) {
        try {
          cleanupVideoCall()
        } catch (error) {
          VideoCallLogger.error('Cleanup error', error)
        }
      }
    }
  }, [sessionId])

  // Error state
  if (error) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-8 text-center">
          <div className="text-red-500 mb-4">
            <VideoOff className="h-12 w-12 mx-auto mb-2" />
            <h3 className="text-lg font-semibold">Connection Error</h3>
          </div>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </CardContent>
      </Card>
    )
  }

  // Waiting room state
  if (showWaitingRoom && sessionAccessData && sessionAccessData.sessionDetails) {
    const sessionData = {
      scheduledDate: new Date(sessionAccessData.sessionDetails.scheduledDate),
      durationMinutes: sessionAccessData.sessionDetails.durationMinutes,
      status: sessionAccessData.sessionDetails.status,
      otherParticipant: {
        firstName: "Other",
        lastName: "Participant",
        profilePictureUrl: undefined,
        title: userRole === "learner" ? "Mentor" : "Learner",
      },
    }

    return (
      <WaitingRoom
        sessionId={sessionId}
        userRole={userRole}
        sessionData={sessionData}
      />
    )
  }

  return (
    <div className="w-full h-full flex bg-gray-900">
      {/* Main Video Area */}
      <div className={`${isChatOpen ? 'flex-1' : 'w-full'} flex flex-col`}>
        {/* Connection Status */}
        <ConnectionStatus callState={callState} formatDuration={formatDuration} />
        
        {/* Chat Toggle */}
        <div className="flex items-center justify-end p-2 bg-gray-800">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={`text-white hover:bg-gray-700 ${isChatOpen ? 'bg-gray-700' : ''}`}
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Chat
          </Button>
        </div>

        {/* Video Display */}
        <VideoDisplay
          callState={callState}
          localVideoRef={localVideoRef}
          remoteVideoRef={remoteVideoRef}
          isLoading={isLoading}
          onReconnect={() => window.location.reload()}
          onLeaveCall={leaveCallOnly}
        />

        {/* Video Controls */}
        <VideoControls
          callState={callState}
          onToggleVideo={mediaControls.toggleVideo}
          onToggleAudio={mediaControls.toggleAudio}
          onToggleScreenShare={mediaControls.toggleScreenShare}
          onLeaveCall={leaveCallOnly}
        />
      </div>

      {/* Chat Panel */}
      {isChatOpen && (
        <div className="w-80 h-full">
          <ChatPanel
            sessionId={sessionId}
            userRole={userRole}
            isOpen={isChatOpen}
            onToggle={() => setIsChatOpen(false)}
            participantCount={callState.participantCount + 1}
          />
        </div>
      )}

      {/* Rating Modal */}
      {userRole === 'learner' && (
        <SessionRatingModal
          isOpen={showRatingModal}
          onClose={() => {
            if (!isSubmittingRating) {
              setShowRatingModal(false)
              leaveCallOnly()
            }
          }}
          onSubmit={handleRatingSubmit}
          sessionId={sessionId}
          mentorName={sessionAccessData?.otherParticipant?.name || "your mentor"}
          isSubmitting={isSubmittingRating}
        />
      )}
    </div>
  )
}