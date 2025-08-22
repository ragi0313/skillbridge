"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Video, VideoOff, Mic, MicOff, Monitor, PhoneOff, Users, Wifi, WifiOff, CheckCircle, WrenchIcon, AlertTriangle, LogOut } from "lucide-react"
import { toast } from "@/lib/toast"
import WaitingRoom from "./WaitingRoom"

interface VideoCallProps {
  sessionId: string
  userRole: "learner" | "mentor"
}

interface TokenResponse {
  token: string
  channel: string  // API returns 'channel', not 'channelName'
  appId: string
  uid: number
  role: string
  sessionDetails?: any
}

interface CallState {
  isConnected: boolean
  isVideoEnabled: boolean
  isAudioEnabled: boolean
  isScreenSharing: boolean
  participantCount: number
  connectionQuality: "excellent" | "good" | "poor"
  callDuration: number
  isReconnecting: boolean
  connectionLost: boolean
  lastDisconnectTime: Date | null
  remoteUsers: any[] // Track remote users for session completion logic
  // Technical issues tracking
  disconnectionCount: number
  poorQualityDuration: number // seconds
  lastPoorQualityStart: Date | null
  reconnectionFailures: number
  technicalIssuesDetected: boolean
}

export default function VideoCall({ sessionId, userRole }: VideoCallProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tokenData, setTokenData] = useState<TokenResponse | null>(null)
  const [sessionAccessData, setSessionAccessData] = useState<any>(null)
  const [showWaitingRoom, setShowWaitingRoom] = useState(false)
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
    // Technical issues tracking
    disconnectionCount: 0,
    poorQualityDuration: 0,
    lastPoorQualityStart: null,
    reconnectionFailures: 0,
    technicalIssuesDetected: false,
  })

  const localVideoRef = useRef<HTMLDivElement>(null)
  const remoteVideoRef = useRef<HTMLDivElement>(null)
  const clientRef = useRef<any>(null)
  const localVideoTrackRef = useRef<any>(null)
  const localAudioTrackRef = useRef<any>(null)
  const screenTrackRef = useRef<any>(null)
  const callStartTimeRef = useRef<Date | null>(null)
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const poorQualityTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Handle call end navigation
  const handleCallEnd = useCallback(() => {
    const redirectPath = userRole === "learner" ? "/learner/sessions" : "/mentor/sessions"
    router.push(redirectPath)
  }, [userRole, router])

  // Check for technical issues automatically
  const checkTechnicalIssues = useCallback(() => {
    const issues = {
      excessiveDisconnections: callState.disconnectionCount >= 5,
      prolongedPoorQuality: callState.poorQualityDuration >= 120, // 2 minutes
      multipleReconnectionFailures: callState.reconnectionFailures >= 3,
    }

    const hasTechnicalIssues = Object.values(issues).some(Boolean)
    
    if (hasTechnicalIssues && !callState.technicalIssuesDetected) {
      console.log("Technical issues detected automatically:", issues)
      setCallState(prev => ({ ...prev, technicalIssuesDetected: true }))
      
      toast.error("Technical issues detected. Session will be ended with automatic refund.")
      
      // Auto-end session with technical issues after a delay
      setTimeout(() => {
        leaveCall('technical_issues')
      }, 3000)
      
      return true
    }
    
    return false
  }, [callState.disconnectionCount, callState.poorQualityDuration, callState.reconnectionFailures, callState.technicalIssuesDetected])

  // Run technical issues check periodically
  useEffect(() => {
    if (callState.isConnected) {
      const interval = setInterval(checkTechnicalIssues, 5000) // Check every 5 seconds
      return () => clearInterval(interval)
    }
  }, [checkTechnicalIssues, callState.isConnected])


  // Format call duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Track session join status
  const trackSessionJoin = useCallback(async () => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (response.ok) {
        const data = await response.json()
        console.log("Session join tracked:", data)
        return data
      }
    } catch (error) {
      console.error("Failed to track session join:", error)
    }
    return null
  }, [sessionId])

  // Track session leave status
  const trackSessionLeave = useCallback(async () => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (response.ok) {
        const data = await response.json()
        console.log("Session leave tracked:", data)
        return data
      }
    } catch (error) {
      console.error("Failed to track session leave:", error)
    }
    return null
  }, [sessionId])

  // Check session access first
  const checkSessionAccess = useCallback(async () => {
    try {
      setIsLoading(true)
      
      const response = await fetch(`/api/sessions/${sessionId}/join`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      })

      const data = await response.json()
      
      if (!response.ok) {
        if (response.status === 400 && data.waitingMinutes) {
          // Show waiting room
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
    } catch (error: any) {
      console.error("Session access check failed:", error)
      setError(error.message || "Failed to check session access")
      setIsLoading(false)
      return false
    }
  }, [sessionId])

  // Initialize Agora client and join channel
  const initializeCall = useCallback(async () => {
    try {
      setIsLoading(true)

      // Check session access first
      const canAccess = await checkSessionAccess()
      if (!canAccess) return

      // Load Agora SDK
      if (typeof window !== "undefined" && !(window as any).AgoraRTC) {
        const script = document.createElement("script")
        script.src = "https://download.agora.io/sdk/release/AgoraRTC_N-4.20.0.js"
        script.async = true

        await new Promise<void>((resolve, reject) => {
          script.onload = () => resolve()
          script.onerror = () => reject(new Error("Failed to load Agora SDK"))
          document.head.appendChild(script)
        })
      }

      const AgoraRTC = (window as any).AgoraRTC

      // Get Agora token from API
      const response = await fetch("/api/agora/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        if (response.status === 429) {
          toast.rateLimited(errorData.retryAfter)
          throw new Error("Rate limited")
        }
        throw new Error(errorData.error || "Failed to get Agora token")
      }

      const data: TokenResponse = await response.json()
      console.log("Received token data:", data)
      
      // Validate required fields
      if (!data.channel || !data.token || !data.appId) {
        throw new Error(`Missing required Agora data: channel=${data.channel}, token=${!!data.token}, appId=${data.appId}`)
      }
      
      setTokenData(data)

      // Create Agora client
      const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" })
      clientRef.current = client

      // Set up event listeners
      client.on("user-published", async (user: any, mediaType: "video" | "audio") => {
        try {
          await client.subscribe(user, mediaType)

          if (mediaType === "video" && remoteVideoRef.current) {
            user.videoTrack?.play(remoteVideoRef.current)
          }
          if (mediaType === "audio") {
            user.audioTrack?.play()
          }

          setCallState((prev) => {
            const userExists = prev.remoteUsers.some(u => u.uid === user.uid)
            if (!userExists) {
              return { 
                ...prev, 
                participantCount: prev.participantCount + 1,
                remoteUsers: [...prev.remoteUsers, user]
              }
            }
            return prev
          })
          toast.success("Participant joined the call")
        } catch (err) {
          console.error("Error handling user published:", err)
        }
      })

      client.on("user-unpublished", (user: any, mediaType: "video" | "audio") => {
        if (mediaType === "video") {
          user.videoTrack?.stop()
        }
        // Don't remove user from remoteUsers on unpublish, only on user-left
        toast.info("Participant stopped sharing media")
      })

      client.on("user-left", (user: any) => {
        setCallState((prev) => ({
          ...prev, 
          participantCount: Math.max(0, prev.participantCount - 1),
          remoteUsers: prev.remoteUsers.filter(u => u.uid !== user.uid)
        }))
        toast.info("Participant left the call")
      })

      client.on("connection-state-change", (curState: string) => {
        console.log("Connection state changed:", curState)

        if (curState === "CONNECTED") {
          setCallState((prev) => ({ 
            ...prev, 
            isConnected: true, 
            isReconnecting: false,
            connectionLost: false 
          }))
          // Set session start time - prioritize actual call start time, then scheduled time
          if (!callStartTimeRef.current && sessionAccessData?.sessionDetails) {
            if (sessionAccessData.sessionDetails.agoraCallStartedAt) {
              // Use the actual time the call was started (persists across reconnections)
              callStartTimeRef.current = new Date(sessionAccessData.sessionDetails.agoraCallStartedAt)
            } else if (sessionAccessData.sessionDetails.scheduledDate) {
              // Fall back to scheduled time if no actual start time recorded yet
              const scheduledStart = new Date(sessionAccessData.sessionDetails.scheduledDate)
              const now = new Date()
              callStartTimeRef.current = scheduledStart.getTime() <= now.getTime() ? scheduledStart : now
            } else {
              // Final fallback to current time
              callStartTimeRef.current = new Date()
            }
          } else if (!callStartTimeRef.current) {
            // Fallback to current time if no session data available
            callStartTimeRef.current = new Date()
          }
          if (callState.connectionLost) {
            toast.success("Connection restored!")
          }
        } else if (curState === "DISCONNECTED") {
          setCallState((prev) => ({ 
            ...prev, 
            isConnected: false,
            connectionLost: true,
            lastDisconnectTime: new Date(),
            disconnectionCount: prev.disconnectionCount + 1
          }))
          toast.error("Connection lost. Attempting to reconnect...")
          
          // Attempt automatic reconnection after 3 seconds
          setTimeout(async () => {
            if (clientRef.current && tokenData) {
              try {
                setCallState((prev) => ({ ...prev, isReconnecting: true }))
                await clientRef.current.join(tokenData.appId, tokenData.channel, tokenData.token, tokenData.uid)
                console.log("Automatic reconnection successful")
              } catch (reconnectError) {
                console.error("Automatic reconnection failed:", reconnectError)
                setCallState((prev) => ({ 
                  ...prev, 
                  isReconnecting: false,
                  reconnectionFailures: prev.reconnectionFailures + 1
                }))
                toast.error("Reconnection failed. Please try refreshing the page.")
              }
            }
          }, 3000)
        } else if (curState === "RECONNECTING") {
          setCallState((prev) => ({ ...prev, isReconnecting: true }))
          toast.info("Reconnecting...")
        }
      })

      client.on("network-quality", (stats: any) => {
        const quality = stats.uplinkNetworkQuality > 3 ? "poor" : stats.uplinkNetworkQuality > 1 ? "good" : "excellent"
        
        setCallState((prev) => {
          const now = new Date()
          let updatedState = { ...prev, connectionQuality: quality }
          
          // Track poor quality duration
          if (quality === "poor") {
            if (!prev.lastPoorQualityStart) {
              updatedState.lastPoorQualityStart = now
            }
          } else {
            if (prev.lastPoorQualityStart) {
              const poorDuration = Math.floor((now.getTime() - prev.lastPoorQualityStart.getTime()) / 1000)
              updatedState.poorQualityDuration = prev.poorQualityDuration + poorDuration
              updatedState.lastPoorQualityStart = null
            }
          }
          
          return updatedState
        })
      })

      // Join the channel
      await client.join(data.appId, data.channel, data.token, data.uid)

      // Track session join for no-show detection
      const joinData = await trackSessionJoin()
      
      // Create and publish local tracks with proper error handling
      try {
        const [localAudioTrack, localVideoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks()

        localVideoTrackRef.current = localVideoTrack
        localAudioTrackRef.current = localAudioTrack

        // Play local video
        if (localVideoRef.current) {
          localVideoTrack.play(localVideoRef.current)
        }

        // Publish tracks
        await client.publish([localVideoTrack, localAudioTrack])
      } catch (mediaError: any) {
        console.error("Media device error:", mediaError)
        
        // Handle specific device errors
        if (mediaError.name === 'NotFoundError' || mediaError.code === 'DEVICE_NOT_FOUND') {
          toast.error("Camera or microphone not found. Please check your devices and try again.")
        } else if (mediaError.name === 'NotAllowedError' || mediaError.code === 'PERMISSION_DENIED') {
          toast.error("Camera and microphone access denied. Please allow permissions and refresh.")
        } else if (mediaError.name === 'NotReadableError' || mediaError.code === 'DEVICE_IN_USE') {
          toast.error("Camera or microphone is being used by another application.")
        } else {
          toast.error("Failed to access camera or microphone. Please check your devices.")
        }
        
        // Try to create audio-only track if video fails
        try {
          const audioTrack = await AgoraRTC.createMicrophoneAudioTrack()
          localAudioTrackRef.current = audioTrack
          await client.publish([audioTrack])
          
          toast.info("Connected with audio only. Video unavailable.")
          setCallState((prev) => ({ ...prev, isVideoEnabled: false }))
        } catch (audioError) {
          console.error("Audio track creation also failed:", audioError)
          toast.error("Failed to access any media devices. Please check your permissions.")
          throw new Error("No media devices available")
        }
      }

      setIsLoading(false)
      setCallState((prev) => ({ ...prev, isConnected: true }))
      toast.success("Connected to video call")
    } catch (err: any) {
      console.error("Failed to initialize Agora call:", err)
      if (err.message !== "Rate limited") {
        toast.error(err.message || "Failed to connect to video call")
      }
      setError(err.message || "Failed to connect to video call")
      setIsLoading(false)
    }
  }, [sessionId])

  // Toggle video
  const toggleVideo = useCallback(async () => {
    if (localVideoTrackRef.current) {
      const newState = !callState.isVideoEnabled
      await localVideoTrackRef.current.setEnabled(newState)
      setCallState((prev) => ({ ...prev, isVideoEnabled: newState }))
      toast.info(newState ? "Camera turned on" : "Camera turned off")
    }
  }, [callState.isVideoEnabled])

  // Toggle audio
  const toggleAudio = useCallback(async () => {
    if (localAudioTrackRef.current) {
      const newState = !callState.isAudioEnabled
      await localAudioTrackRef.current.setEnabled(newState)
      setCallState((prev) => ({ ...prev, isAudioEnabled: newState }))
      toast.info(newState ? "Microphone unmuted" : "Microphone muted")
    }
  }, [callState.isAudioEnabled])

  // Toggle screen share
  const toggleScreenShare = useCallback(async () => {
    try {
      if (!clientRef.current) return

      const AgoraRTC = (window as any).AgoraRTC

      if (callState.isScreenSharing) {
        // Stop screen sharing, switch back to camera
        try {
          if (screenTrackRef.current) {
            await clientRef.current.unpublish([screenTrackRef.current])
            screenTrackRef.current.close()
            screenTrackRef.current = null
          }

          // Create new camera track
          const videoTrack = await AgoraRTC.createCameraVideoTrack()
          localVideoTrackRef.current = videoTrack

          // Publish camera track
          await clientRef.current.publish([videoTrack])

          if (localVideoRef.current) {
            videoTrack.play(localVideoRef.current)
          }

          setCallState((prev) => ({ ...prev, isScreenSharing: false }))
          toast.info("Screen sharing stopped")
        } catch (stopError: any) {
          console.error("Error stopping screen share:", stopError)
          setCallState((prev) => ({ ...prev, isScreenSharing: false }))
        }
      } else {
        // Start screen sharing
        try {
          const screenTrack = await AgoraRTC.createScreenVideoTrack({
            encoderConfig: "1080p_1"
          })
          
          screenTrackRef.current = screenTrack

          // Properly unpublish and close camera track
          if (localVideoTrackRef.current) {
            try {
              await clientRef.current.unpublish([localVideoTrackRef.current])
              localVideoTrackRef.current.close()
              localVideoTrackRef.current = null
            } catch (unpublishError) {
              console.log("Error unpublishing camera track:", unpublishError)
            }
          }

          // Publish screen track
          await clientRef.current.publish([screenTrack])

          // Play screen track in local video
          if (localVideoRef.current) {
            screenTrack.play(localVideoRef.current)
          }

          // Handle screen share end
          screenTrack.on("track-ended", () => {
            console.log("Screen share ended by user")
            if (callState.isScreenSharing) {
              toggleScreenShare()
            }
          })

          setCallState((prev) => ({ ...prev, isScreenSharing: true }))
          toast.success("Screen sharing started")
        } catch (screenError: any) {
          // Handle screen sharing cancellation or permission denied
          if (screenError.name === 'NotAllowedError' || 
              screenError.code === 'PERMISSION_DENIED' || 
              (screenError.message && screenError.message.includes('NotAllowedError')) ||
              screenError.toString().includes('Permission denied')) {
            // Don't log as error for user cancellation
            return 
          } else {
            console.error("Screen sharing error:", screenError)
            toast.error("Failed to start screen sharing")
          }
        }
      }
    } catch (err: any) {
      // Only log non-permission errors
      if (!err.message?.includes('NotAllowedError') && !err.toString().includes('Permission denied')) {
        console.error("Screen share error:", err)
        toast.error("Failed to toggle screen share")
      }
    }
  }, [callState.isScreenSharing])

  // Complete session
  const completeSession = useCallback(async (endType: 'completed' | 'technical_issues') => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endType })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to complete session")
      }

      const message = endType === 'technical_issues' 
        ? "Session ended due to technical issues. Refund processed." 
        : "Session completed successfully!"
      toast.success(message)
    } catch (error) {
      console.error("Error completing session:", error)
      toast.error(error instanceof Error ? error.message : "Failed to complete session")
    }
  }, [sessionId])

  // Leave call
  const leaveCall = useCallback(async (endType: 'completed' | 'technical_issues' = 'completed') => {
    try {
      // Track user leaving the session
      await trackSessionLeave()
      
      // Check if we should actually complete the session
      // Only complete if both participants were present or there are technical issues
      if (endType === 'completed' && callState.remoteUsers.length === 0) {
        console.log("Only one participant in call - skipping completion, will be handled by no-show detection")
        // Don't try to complete the session if no remote users joined
        // The automated no-show detection will handle this appropriately
      } else {
        // Complete the session since both participants were present or there are technical issues
        await completeSession(endType)
      }

      // Stop duration timer
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
        durationIntervalRef.current = null
      }

      // Close local tracks
      if (localVideoTrackRef.current) {
        localVideoTrackRef.current.close()
        localVideoTrackRef.current = null
      }
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.close()
        localAudioTrackRef.current = null
      }
      if (screenTrackRef.current) {
        screenTrackRef.current.close()
        screenTrackRef.current = null
      }

      // Leave channel
      if (clientRef.current) {
        await clientRef.current.leave()
        clientRef.current = null
      }

      setCallState((prev) => ({ ...prev, isConnected: false }))
      handleCallEnd()
    } catch (err: any) {
      console.error("Error leaving call:", err)
      handleCallEnd()
    }
  }, [handleCallEnd, completeSession, trackSessionLeave, callState.remoteUsers.length])

  // Auto-complete session when scheduled duration is reached
  useEffect(() => {
    if (callState.isConnected && sessionAccessData?.sessionDetails?.scheduledDate && sessionAccessData?.sessionDetails?.durationMinutes) {
      const scheduledStart = new Date(sessionAccessData.sessionDetails.scheduledDate)
      const scheduledEnd = new Date(scheduledStart.getTime() + sessionAccessData.sessionDetails.durationMinutes * 60 * 1000)
      
      const checkAutoCompletion = () => {
        const now = new Date()
        if (now >= scheduledEnd && !callState.technicalIssuesDetected) {
          console.log("Auto-completing session - scheduled duration reached")
          toast.info("Scheduled session time has ended. Completing session...")
          setTimeout(() => {
            leaveCall('completed')
          }, 2000)
        }
      }

      const interval = setInterval(checkAutoCompletion, 10000) // Check every 10 seconds
      return () => clearInterval(interval)
    }
  }, [callState.isConnected, callState.technicalIssuesDetected, sessionAccessData, leaveCall])

  // Call duration timer
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

  // Initialize call on mount
  useEffect(() => {
    initializeCall()

    return () => {
      leaveCall()
    }
  }, [initializeCall, leaveCall])

  // Get quality color and icon
  const getQualityColor = () => {
    switch (callState.connectionQuality) {
      case "excellent":
        return "text-green-500"
      case "good":
        return "text-yellow-500"
      case "poor":
        return "text-red-500"
      default:
        return "text-gray-500"
    }
  }

  const getQualityIcon = () => {
    return callState.connectionQuality === "poor" ? <WifiOff className="h-4 w-4" /> : <Wifi className="h-4 w-4" />
  }

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

  // Show waiting room if user cannot join yet
  if (showWaitingRoom && sessionAccessData && sessionAccessData.sessionDetails) {
    return (
      <WaitingRoom
        sessionId={sessionId}
        userRole={userRole}
        sessionDetails={sessionAccessData.sessionDetails}
        userName={sessionAccessData.userName || "User"}
        onJoinSession={() => {
          setShowWaitingRoom(false)
          initializeCall()
        }}
        canJoin={sessionAccessData.canJoin || false}
        waitingMinutes={sessionAccessData.waitingMinutes}
      />
    )
  }

  return (
    <div className="w-full h-full flex flex-col bg-gray-900">
      {/* Call Status Bar */}
      <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <Badge variant={callState.isConnected ? "default" : "secondary"} 
                 className={callState.isConnected ? "bg-green-600 text-white" : 
                          callState.isReconnecting ? "bg-orange-600 text-white" :
                          callState.connectionLost ? "bg-red-600 text-white" : "bg-blue-600 text-white"}>
            {callState.isConnected ? "Connected" : 
             callState.isReconnecting ? "Reconnecting..." :
             callState.connectionLost ? "Connection Lost" : "Connecting..."}
          </Badge>
          {callState.isConnected && (
            <>
              <div className="flex items-center space-x-1 text-sm text-gray-300">
                <Users className="h-4 w-4" />
                <span>{callState.participantCount + 1} participants</span>
              </div>
              <div className="text-sm font-mono text-gray-300">{formatDuration(callState.callDuration)}</div>
              <div className={`flex items-center space-x-1 ${getQualityColor()}`}>
                {getQualityIcon()}
                <span className="text-sm capitalize">{callState.connectionQuality}</span>
              </div>
            </>
          )}
        </div>
        {tokenData && (
          <div className="text-sm text-gray-400">
            Channel: {tokenData.channel} • Role: {tokenData.role}
          </div>
        )}
      </div>

      {/* Video Container - Full Height */}
      <div className="flex-1 bg-gray-900 relative">
          {/* Remote Video (Main) */}
          <div ref={remoteVideoRef} className="w-full h-full bg-gray-800 flex items-center justify-center">
            {callState.participantCount === 0 && (
              <div className="text-center text-white">
                <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Waiting for other participant...</p>
                <p className="text-sm opacity-75">They will appear here when they join</p>
              </div>
            )}
          </div>

          {/* Local Video (Picture-in-Picture) */}
          <div className="absolute top-4 right-4 w-48 h-36 bg-gray-700 rounded-lg overflow-hidden border-2 border-white shadow-lg">
            <div ref={localVideoRef} className="w-full h-full bg-gray-800 flex items-center justify-center">
              {!callState.isVideoEnabled && (
                <div className="text-center text-white">
                  <VideoOff className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-xs">Camera Off</p>
                </div>
              )}
            </div>

            {/* Local Video Status Indicators */}
            <div className="absolute bottom-2 left-2 flex space-x-1">
              {!callState.isAudioEnabled && (
                <div className="bg-red-500 rounded-full p-1">
                  <MicOff className="h-3 w-3 text-white" />
                </div>
              )}
              {callState.isScreenSharing && (
                <div className="bg-blue-500 rounded-full p-1">
                  <Monitor className="h-3 w-3 text-white" />
                </div>
              )}
            </div>
          </div>

          {/* Screen Share Indicator */}
          {callState.isScreenSharing && (
            <div className="absolute top-4 left-4 bg-blue-600 text-white px-3 py-1 rounded-full text-sm flex items-center">
              <Monitor className="h-4 w-4 mr-2" />
              You're sharing your screen
            </div>
          )}

          {/* Connection Lost Overlay */}
          {callState.connectionLost && !callState.isReconnecting && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-95 z-50">
              <div className="text-center text-white bg-gray-800 p-8 rounded-lg border border-gray-600 max-w-md">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500" />
                <h3 className="text-xl font-semibold mb-2">Connection Lost</h3>
                <p className="text-gray-300 mb-6">
                  Your connection to the video call was interrupted. 
                  {callState.lastDisconnectTime && (
                    <span className="block text-sm mt-2">
                      Lost at {callState.lastDisconnectTime.toLocaleTimeString()}
                    </span>
                  )}
                </p>
                <div className="space-y-3">
                  <Button 
                    onClick={() => window.location.reload()}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    Reconnect to Session
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => leaveCall('completed')}
                    className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    Leave Session
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Reconnecting Overlay */}
          {callState.isReconnecting && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-80 z-40">
              <div className="text-center text-white">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
                <p className="text-lg">Reconnecting to session...</p>
                <p className="text-sm text-gray-300 mt-2">Please wait while we restore your connection</p>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-90">
              <div className="text-center text-white">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
                <p className="text-lg">Connecting to video call...</p>
                <p className="text-sm opacity-75">Please allow camera and microphone access</p>
              </div>
            </div>
          )}
        </div>

      {/* Control Bar */}
      {callState.isConnected && (
        <div className="flex items-center justify-center space-x-4 p-6 bg-gray-800 border-t border-gray-700">
          <Button
            variant={callState.isAudioEnabled ? "outline" : "destructive"}
            size="lg"
            onClick={toggleAudio}
            className="rounded-full w-14 h-14"
          >
            {callState.isAudioEnabled ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
          </Button>

          <Button
            variant={callState.isVideoEnabled ? "outline" : "destructive"}
            size="lg"
            onClick={toggleVideo}
            className="rounded-full w-14 h-14"
          >
            {callState.isVideoEnabled ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
          </Button>

          <Button
            variant={callState.isScreenSharing ? "default" : "outline"}
            size="lg"
            onClick={toggleScreenShare}
            className="rounded-full w-14 h-14"
          >
            <Monitor className="h-6 w-6" />
          </Button>

          <div className="flex-1" />



          {/* End Call */}
          <Button
            variant="destructive" 
            size="lg"
            onClick={() => leaveCall('completed')}
            className="rounded-full w-14 h-14 bg-red-600 hover:bg-red-700"
            title="End Call"
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
        </div>
      )}
    </div>
  )
}