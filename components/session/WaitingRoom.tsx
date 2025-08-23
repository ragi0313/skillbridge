"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Video, VideoOff, Mic, MicOff, Settings, Users, Clock, CheckCircle, AlertCircle } from "lucide-react"
import { SessionCountdown } from "@/components/session/SessionCountdown"
import { toast } from "@/lib/toast"

interface WaitingRoomProps {
  sessionId: string
  userRole: "learner" | "mentor"
  sessionData: {
    scheduledDate: Date
    durationMinutes: number
    status: string
    otherParticipant: {
      firstName: string
      lastName: string
      profilePictureUrl?: string
      title?: string
    }
    isReconnection?: boolean
    previouslyJoinedAt?: Date | null
    previouslyLeftAt?: Date | null
  }
}

export default function WaitingRoom({ sessionId, userRole, sessionData }: WaitingRoomProps) {
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [otherParticipantJoined, setOtherParticipantJoined] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<"checking" | "ready" | "error">("checking")
  const [isJoining, setIsJoining] = useState(false)
  
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const otherRole = userRole === "learner" ? "mentor" : "learner"
  
  // Check if user can join the waiting room (30 minutes before)
  const canJoinWaitingRoom = () => {
    const now = new Date()
    const sessionStart = new Date(sessionData.scheduledDate)
    const joinWindowStart = new Date(sessionStart.getTime() - 30 * 60 * 1000)
    return now >= joinWindowStart && ["confirmed", "upcoming", "ongoing"].includes(sessionData.status)
  }
  
  // Check if it's time to enter the actual video call (session start time)
  const canEnterVideoCall = () => {
    const now = new Date()
    const sessionStart = new Date(sessionData.scheduledDate)
    return now >= sessionStart && ["confirmed", "upcoming", "ongoing"].includes(sessionData.status)
  }
  
  // Legacy function for backward compatibility
  const canJoinNow = canJoinWaitingRoom

  const getSessionStatusInfo = () => {
    if (sessionData.status === "upcoming") {
      return {
        title: "Session Ready",
        message: "Your session is ready to join. The mentor has confirmed your booking and you can enter the waiting room.",
        color: "blue",
        icon: "clock"
      }
    } else if (sessionData.status === "confirmed") {
      return {
        title: "Session Confirmed",
        message: "Your session is confirmed and ready to join when the time comes.",
        color: "green",
        icon: "check"
      }
    } else if (sessionData.status === "ongoing") {
      return {
        title: "Session In Progress",
        message: "The session is currently active. Join now to participate.",
        color: "red",
        icon: "live"
      }
    }
    return {
      title: "Session Ready",
      message: "Preparing for your session...",
      color: "gray",
      icon: "clock"
    }
  }

  // Initialize camera and microphone
  useEffect(() => {
    const initializeMedia = async () => {
      try {
        setConnectionStatus("checking")
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        })
        
        streamRef.current = stream
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream
        }
        
        setConnectionStatus("ready")
      } catch (error) {
        console.error("Media access error:", error)
        setConnectionStatus("error")
        toast.error("Unable to access camera or microphone. Please check your permissions.")
      }
    }

    initializeMedia()

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  // Toggle video
  const toggleVideo = async () => {
    if (streamRef.current) {
      const videoTracks = streamRef.current.getVideoTracks()
      if (videoTracks.length > 0) {
        const newState = !isVideoEnabled
        videoTracks.forEach(track => track.enabled = newState)
        setIsVideoEnabled(newState)
      }
    }
  }

  // Toggle audio
  const toggleAudio = async () => {
    if (streamRef.current) {
      const audioTracks = streamRef.current.getAudioTracks()
      if (audioTracks.length > 0) {
        const newState = !isAudioEnabled
        audioTracks.forEach(track => track.enabled = newState)
        setIsAudioEnabled(newState)
      }
    }
  }

  // State to track if user has joined the session
  const [hasJoinedSession, setHasJoinedSession] = useState(false)

  // Handle joining the session
  const handleJoinSession = async () => {
    if (!canJoinWaitingRoom()) {
      toast.error("Cannot join session yet. Please wait for the join window to open.")
      return
    }

    // If it's time for the video call, transition directly
    if (canEnterVideoCall()) {
      setIsJoining(true)
      try {
        const response = await fetch(`/api/sessions/${sessionId}/join`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        })

        if (response.ok) {
          window.location.reload() // Transition to video call
        } else {
          const errorData = await response.json()
          toast.error(errorData.error || "Failed to join session")
          setIsJoining(false)
        }
      } catch (error) {
        console.error("Error joining session:", error)
        toast.error("Failed to join session. Please try again.")
        setIsJoining(false)
      }
      return
    }

    // Otherwise, just mark as joined and stay in waiting room
    setIsJoining(true)
    try {
      const response = await fetch(`/api/sessions/${sessionId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        setHasJoinedSession(true)
        setIsJoining(false)
        toast.success("Joined waiting room! You'll automatically enter the call when the session starts.")
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || "Failed to join session")
        setIsJoining(false)
      }
    } catch (error) {
      console.error("Error joining session:", error)
      toast.error("Failed to join session. Please try again.")
      setIsJoining(false)
    }
  }

  // Auto-transition to video call when session time arrives (for users already in waiting room)
  useEffect(() => {
    if (hasJoinedSession) {
      const checkSessionTime = () => {
        if (canEnterVideoCall()) {
          toast.success("🚀 Session is starting! Entering video call...")
          setTimeout(() => {
            window.location.reload()
          }, 1500) // Give user 1.5 seconds to see the message
        }
      }

      const interval = setInterval(checkSessionTime, 1000) // Check every second
      return () => clearInterval(interval)
    }
  }, [hasJoinedSession, sessionData.scheduledDate])

  // Poll for other participant status (simplified - in real implementation, use websockets)
  useEffect(() => {
    const checkParticipantStatus = async () => {
      try {
        // This would be a real API call to check if other participant has joined
        // For now, we'll simulate it based on session status
        setOtherParticipantJoined(sessionData.status === "ongoing")
      } catch (error) {
        console.error("Error checking participant status:", error)
      }
    }

    const interval = setInterval(checkParticipantStatus, 5000)
    return () => clearInterval(interval)
  }, [sessionData.status])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Video Preview */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Video className="h-5 w-5" />
                <span>Camera Preview</span>
                <Badge variant={connectionStatus === "ready" ? "default" : connectionStatus === "error" ? "destructive" : "secondary"}>
                  {connectionStatus === "ready" && <CheckCircle className="h-3 w-3 mr-1" />}
                  {connectionStatus === "error" && <AlertCircle className="h-3 w-3 mr-1" />}
                  {connectionStatus === "checking" && <Clock className="h-3 w-3 mr-1" />}
                  {connectionStatus === "ready" ? "Ready" : connectionStatus === "error" ? "Error" : "Checking..."}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
                
                {!isVideoEnabled && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                    <div className="text-center text-white">
                      <VideoOff className="h-12 w-12 mx-auto mb-2" />
                      <p>Camera Off</p>
                    </div>
                  </div>
                )}

                {/* Controls overlay */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4">
                  <Button
                    variant={isAudioEnabled ? "secondary" : "destructive"}
                    size="sm"
                    onClick={toggleAudio}
                    className="rounded-full w-12 h-12"
                  >
                    {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                  </Button>
                  
                  <Button
                    variant={isVideoEnabled ? "secondary" : "destructive"}
                    size="sm"
                    onClick={toggleVideo}
                    className="rounded-full w-12 h-12"
                  >
                    {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Session Info & Join Controls */}
        <div className="space-y-6">
          
          {/* Session Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                {(() => {
                  const statusInfo = getSessionStatusInfo()
                  return (
                    <>
                      {statusInfo.icon === "clock" && <Clock className="h-5 w-5 text-blue-500" />}
                      {statusInfo.icon === "check" && <CheckCircle className="h-5 w-5 text-green-500" />}
                      {statusInfo.icon === "live" && <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse" />}
                      <span>{statusInfo.title}</span>
                      <Badge variant={statusInfo.color === "blue" ? "default" : statusInfo.color === "green" ? "outline" : "secondary"} className={
                        statusInfo.color === "blue" ? "bg-blue-100 text-blue-700" :
                        statusInfo.color === "green" ? "bg-green-100 text-green-700 border-green-200" :
                        statusInfo.color === "red" ? "bg-red-100 text-red-700" : ""
                      }>
                        {sessionData.status === "upcoming" ? "Ready" : 
                         sessionData.status === "confirmed" ? "Confirmed" :
                         sessionData.status === "ongoing" ? "Live" : "Ready"}
                      </Badge>
                    </>
                  )
                })()} 
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                {getSessionStatusInfo().message}
              </p>
            </CardContent>
          </Card>

          {/* Session Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Session Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={sessionData.otherParticipant.profilePictureUrl} />
                  <AvatarFallback>
                    {sessionData.otherParticipant.firstName[0]}
                    {sessionData.otherParticipant.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {sessionData.otherParticipant.firstName} {sessionData.otherParticipant.lastName}
                  </p>
                  <p className="text-sm text-gray-600">
                    {sessionData.otherParticipant.title || `Your ${otherRole}`}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">
                    {new Date(sessionData.scheduledDate).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{sessionData.durationMinutes} minutes</span>
                </div>
              </div>

              <SessionCountdown
                sessionDate={sessionData.scheduledDate}
                status={sessionData.status}
                showJoinButton={true}
                className="justify-center"
              />
            </CardContent>
          </Card>

          {/* Participant Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Participants</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">You</span>
                <Badge variant={sessionData.isReconnection ? "secondary" : "default"} 
                       className={sessionData.isReconnection ? "bg-orange-100 text-orange-700" : "bg-green-600"}>
                  {sessionData.isReconnection ? (
                    <>
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Reconnecting
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Ready
                    </>
                  )}
                </Badge>
              </div>
              
              {sessionData.isReconnection && sessionData.previouslyLeftAt && (
                <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
                  Connection lost at {new Date(sessionData.previouslyLeftAt).toLocaleTimeString()}. 
                  Click "Reconnect" to rejoin the session.
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {sessionData.otherParticipant.firstName}
                </span>
                <Badge variant={otherParticipantJoined ? "default" : "secondary"}>
                  {otherParticipantJoined ? (
                    <>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Joined
                    </>
                  ) : (
                    <>
                      <Clock className="h-3 w-3 mr-1" />
                      Waiting
                    </>
                  )}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Join Button */}
          <Card>
            <CardContent className="pt-6">
              <Button
                onClick={handleJoinSession}
                disabled={(!canJoinWaitingRoom() && !canEnterVideoCall()) || connectionStatus !== "ready" || isJoining || (hasJoinedSession && !canEnterVideoCall())}
                className="w-full h-12 text-lg font-semibold"
                size="lg"
              >
                {isJoining ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Joining...
                  </>
                ) : hasJoinedSession ? (
                  <>
                    <Video className="h-5 w-5 mr-2" />
                    Enter Room
                  </>
                ) : (
                  <>
                    <Video className="h-5 w-5 mr-2" />
                    {sessionData.isReconnection ? "Reconnect to Session" : 
                     canEnterVideoCall() ? "Join Video Call" :
                     sessionData.status === "ongoing" ? "Join Ongoing Session" :
                     sessionData.status === "upcoming" ? "Enter Waiting Room" : "Join Session"}
                  </>
                )}
              </Button>
              
              {!canJoinWaitingRoom() && !hasJoinedSession && (
                <p className="text-sm text-gray-600 text-center mt-2">
                  {sessionData.status === "upcoming" 
                    ? "Join window opens 30 minutes before the scheduled time"
                    : "You can join 30 minutes before the scheduled time"}
                </p>
              )}
              
              {hasJoinedSession && !canEnterVideoCall() && (
                <p className="text-sm text-green-600 text-center mt-2">
                  ✅ You're in the waiting room! The session will start automatically when the countdown reaches zero.
                </p>
              )}
              
              {hasJoinedSession && canEnterVideoCall() && (
                <p className="text-sm text-blue-600 text-center mt-2">
                  🚀 Session time has arrived! Click "Enter Room" to join the video call.
                </p>
              )}
              
              {sessionData.status === "upcoming" && canJoinNow() && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
                  <div className="flex items-center space-x-2 text-blue-700">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Session is ready!</span>
                  </div>
                  <p className="text-xs text-blue-600 mt-1">
                    You can now join the session. The video call will start at the scheduled time.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}