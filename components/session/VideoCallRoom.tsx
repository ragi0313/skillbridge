"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Phone,
  Settings,
  Users,
  Clock,
  AlertTriangle,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX
} from "lucide-react"
import { useRealTimeTimer } from "@/lib/hooks/useRealTimeTimer"

interface VideoCallRoomProps {
  sessionId: string
  sessionData: {
    id: number
    scheduledDate: string
    startTime: string
    endTime: string
    status: string
    durationMinutes: number
  }
  userRole: "learner" | "mentor"
  otherParticipant: {
    firstName: string
    lastName: string
    profilePictureUrl?: string | null
    title: string
  }
  agoraConfig: {
    appId: string
    channel: string
    token: string
    uid: number
  }
  onEndCall: () => void
  onConnectionError: (error: string) => void
}

type ConnectionState = "connecting" | "connected" | "reconnecting" | "disconnected" | "failed"
type CallQuality = "excellent" | "good" | "fair" | "poor" | "unknown"

export function VideoCallRoom({
  sessionId,
  sessionData,
  userRole,
  otherParticipant,
  agoraConfig,
  onEndCall,
  onConnectionError
}: VideoCallRoomProps) {
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting")
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [isRemoteVideoVisible, setIsRemoteVideoVisible] = useState(false)
  const [isRemoteAudioEnabled, setIsRemoteAudioEnabled] = useState(false)
  const [callQuality, setCallQuality] = useState<CallQuality>("unknown")
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [participants, setParticipants] = useState<number>(1)
  const [isCallEnding, setIsCallEnding] = useState(false)
  const [connectionRetryCount, setConnectionRetryCount] = useState(0)
  const [networkStats, setNetworkStats] = useState({
    rtt: 0,
    uplinkLoss: 0,
    downlinkLoss: 0
  })

  const localVideoRef = useRef<HTMLDivElement>(null)
  const remoteVideoRef = useRef<HTMLDivElement>(null)
  const agoraClientRef = useRef<any>(null)
  const localTracksRef = useRef<{ videoTrack?: any; audioTrack?: any }>({})
  const isInitializingRef = useRef<boolean>(false)
  const isCleaningUpRef = useRef<boolean>(false)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const trackingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const hasJoinedChannelRef = useRef<boolean>(false)
  const currentRemoteUsersRef = useRef<Set<string>>(new Set())

  const sessionStart = new Date(sessionData.startTime)
  const sessionEnd = new Date(sessionData.endTime)

  // Comprehensive cleanup function
  const performCleanup = useCallback(async (reason: string = "component_cleanup") => {
    if (isCleaningUpRef.current) {
      console.log("[VIDEO_CALL] Cleanup already in progress")
      return
    }

    isCleaningUpRef.current = true
    console.log(`[VIDEO_CALL] Starting cleanup: ${reason}`)

    try {
      // Clear any pending timers
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
      
      if (trackingIntervalRef.current) {
        clearInterval(trackingIntervalRef.current)
        trackingIntervalRef.current = null
      }

      // Stop and close local tracks
      if (localTracksRef.current.audioTrack) {
        try {
          localTracksRef.current.audioTrack.stop()
          localTracksRef.current.audioTrack.close()
          console.log("[VIDEO_CALL] Audio track stopped")
        } catch (error) {
          console.error("[VIDEO_CALL] Error stopping audio track:", error)
        }
      }

      if (localTracksRef.current.videoTrack) {
        try {
          localTracksRef.current.videoTrack.stop()
          localTracksRef.current.videoTrack.close()
          console.log("[VIDEO_CALL] Video track stopped")
        } catch (error) {
          console.error("[VIDEO_CALL] Error stopping video track:", error)
        }
      }

      // Leave Agora channel
      if (agoraClientRef.current && hasJoinedChannelRef.current) {
        try {
          if (agoraClientRef.current.connectionState !== "DISCONNECTED") {
            await agoraClientRef.current.leave()
            console.log("[VIDEO_CALL] Left Agora channel")
          }
        } catch (error) {
          console.error("[VIDEO_CALL] Error leaving channel:", error)
        }
      }

      // Clear video elements
      if (localVideoRef.current) {
        localVideoRef.current.innerHTML = ""
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.innerHTML = ""
      }

      // Reset refs and state
      localTracksRef.current = {}
      agoraClientRef.current = null
      hasJoinedChannelRef.current = false
      currentRemoteUsersRef.current.clear()

      console.log("[VIDEO_CALL] Cleanup completed successfully")
    } catch (error) {
      console.error("[VIDEO_CALL] Error during cleanup:", error)
    } finally {
      isCleaningUpRef.current = false
    }
  }, [])

  // Handle call end with proper session tracking
  const handleEndCall = useCallback(async () => {
    if (isCallEnding) return
    
    setIsCallEnding(true)
    console.log("[VIDEO_CALL] Ending call...")

    try {
      // Call the session leave API first
      await fetch(`/api/sessions/${sessionId}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      console.log("[VIDEO_CALL] Successfully left session via API")
    } catch (error) {
      console.error("[VIDEO_CALL] Error calling leave API:", error)
      // Continue with cleanup even if API call fails
    }

    try {
      // End the session via API
      await fetch(`/api/sessions/${sessionId}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'completed' })
      })
      console.log("[VIDEO_CALL] Session ended via API")
    } catch (error) {
      console.error("[VIDEO_CALL] Error ending session via API:", error)
      // Continue anyway
    }

    // Perform cleanup
    await performCleanup("call_ended")
    
    // Call the parent callback
    onEndCall()
  }, [sessionId, onEndCall, performCleanup, isCallEnding])

  // Session timer with proper cleanup
  const sessionTimer = useRealTimeTimer({
    startTime: sessionStart,
    endTime: sessionEnd,
    onTimeExpired: handleEndCall
  })

  // Connection retry logic
  const attemptReconnection = useCallback(async () => {
    if (connectionRetryCount >= 3 || isCleaningUpRef.current || isCallEnding) {
      console.log("[VIDEO_CALL] Max reconnection attempts reached or call ending")
      onConnectionError("Unable to reconnect to the video call")
      return
    }

    setConnectionRetryCount(prev => prev + 1)
    setConnectionState("reconnecting")
    
    console.log(`[VIDEO_CALL] Attempting reconnection ${connectionRetryCount + 1}/3`)

    try {
      // Clean up existing connection first
      if (agoraClientRef.current && hasJoinedChannelRef.current) {
        await agoraClientRef.current.leave()
        hasJoinedChannelRef.current = false
      }

      // Wait a moment before reconnecting
      await new Promise(resolve => setTimeout(resolve, 2000))

      if (isCleaningUpRef.current || isCallEnding) return

      // Rejoin the channel
      const actualUid = await agoraClientRef.current.join(
        agoraConfig.appId, 
        agoraConfig.channel, 
        agoraConfig.token, 
        agoraConfig.uid
      )
      
      hasJoinedChannelRef.current = true
      console.log(`[VIDEO_CALL] Reconnected with UID: ${actualUid}`)

      // Republish local tracks if they exist
      if (localTracksRef.current.audioTrack && localTracksRef.current.videoTrack) {
        await agoraClientRef.current.publish([
          localTracksRef.current.audioTrack,
          localTracksRef.current.videoTrack
        ])
        console.log("[VIDEO_CALL] Republished local tracks")
      }

      setConnectionState("connected")
      setConnectionRetryCount(0) // Reset on successful reconnection
    } catch (error) {
      console.error("[VIDEO_CALL] Reconnection failed:", error)
      
      // Schedule another retry
      reconnectTimeoutRef.current = setTimeout(() => {
        attemptReconnection()
      }, 5000)
    }
  }, [agoraConfig, connectionRetryCount, onConnectionError, isCallEnding])

  // Initialize Agora with better error handling
  useEffect(() => {
    const initializeAgora = async () => {
      if (isInitializingRef.current || isCleaningUpRef.current || agoraClientRef.current) {
        console.log("[VIDEO_CALL] Agora initialization already in progress")
        return
      }
      
      isInitializingRef.current = true
      
      try {
        console.log("[VIDEO_CALL] Initializing Agora SDK...")
        const AgoraRTC = await import("agora-rtc-sdk-ng")
        const client = AgoraRTC.default.createClient({ 
          mode: "rtc", 
          codec: "vp8",
          role: "host" // Ensure both users can publish
        })
        
        agoraClientRef.current = client

        // Set up comprehensive event listeners
        client.on("user-published", async (user: any, mediaType: "video" | "audio") => {
          try {
            console.log(`[VIDEO_CALL] User published ${mediaType}:`, user.uid)
            await client.subscribe(user, mediaType)
            
            if (mediaType === "video" && user.videoTrack) {
              setIsRemoteVideoVisible(true)
              if (remoteVideoRef.current) {
                user.videoTrack.play(remoteVideoRef.current)
              }
            }
            
            if (mediaType === "audio" && user.audioTrack) {
              setIsRemoteAudioEnabled(true)
              user.audioTrack.play()
            }
            
            // Track remote users
            currentRemoteUsersRef.current.add(user.uid.toString())
            setParticipants(currentRemoteUsersRef.current.size + 1)
          } catch (error) {
            console.error("[VIDEO_CALL] Error handling user published:", error)
          }
        })

        client.on("user-unpublished", (user: any, mediaType: "video" | "audio") => {
          console.log(`[VIDEO_CALL] User unpublished ${mediaType}:`, user.uid)
          
          if (mediaType === "video") {
            setIsRemoteVideoVisible(false)
          }
          if (mediaType === "audio") {
            setIsRemoteAudioEnabled(false)
          }
        })

        client.on("user-joined", (user: any) => {
          console.log("[VIDEO_CALL] User joined:", user.uid)
          currentRemoteUsersRef.current.add(user.uid.toString())
          setParticipants(currentRemoteUsersRef.current.size + 1)
        })

        client.on("user-left", (user: any) => {
          console.log("[VIDEO_CALL] User left:", user.uid)
          currentRemoteUsersRef.current.delete(user.uid.toString())
          setParticipants(currentRemoteUsersRef.current.size + 1)
          
          // If this was the only remote user, reset remote states
          if (currentRemoteUsersRef.current.size === 0) {
            setIsRemoteVideoVisible(false)
            setIsRemoteAudioEnabled(false)
          }
        })

        client.on("connection-state-changed", (currentState: string, revState: string, reason?: string) => {
          console.log(`[VIDEO_CALL] Connection state changed: ${revState} -> ${currentState}, reason: ${reason}`)
          setConnectionState(currentState as ConnectionState)
          
          if (currentState === "DISCONNECTED" && !isCallEnding && !isCleaningUpRef.current) {
            console.log("[VIDEO_CALL] Unexpected disconnection, attempting reconnection")
            attemptReconnection()
          } else if (currentState === "FAILED") {
            onConnectionError("Connection failed. Please check your internet connection.")
          }
        })

        client.on("exception", (evt: any) => {
          console.error("[VIDEO_CALL] Agora exception:", evt)
          if (evt.code === "WEBSOCKET_DISCONNECTED" && !isCallEnding) {
            attemptReconnection()
          }
        })

        // Join channel with retry logic
        let joinAttempts = 0
        const maxJoinAttempts = 3
        
        while (joinAttempts < maxJoinAttempts && !isCleaningUpRef.current) {
          try {
            console.log(`[VIDEO_CALL] Joining channel attempt ${joinAttempts + 1}/${maxJoinAttempts}`)
            
            const actualUid = await client.join(
              agoraConfig.appId, 
              agoraConfig.channel, 
              agoraConfig.token, 
              agoraConfig.uid
            )
            
            hasJoinedChannelRef.current = true
            console.log(`[VIDEO_CALL] Successfully joined channel with UID: ${actualUid}`)
            break
          } catch (error: any) {
            joinAttempts++
            console.error(`[VIDEO_CALL] Join attempt ${joinAttempts} failed:`, error)
            
            if (error.code === "UID_CONFLICT" && joinAttempts < maxJoinAttempts) {
              console.log("[VIDEO_CALL] UID conflict, retrying with random UID")
              agoraConfig.uid = 0 // Use random UID
              continue
            }
            
            if (joinAttempts >= maxJoinAttempts) {
              throw new Error(`Failed to join after ${maxJoinAttempts} attempts: ${error.message}`)
            }
            
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        }

        if (!hasJoinedChannelRef.current) {
          throw new Error("Failed to join channel after all attempts")
        }

        // Create and publish local tracks with error handling
        try {
          console.log("[VIDEO_CALL] Creating local tracks...")
          const [audioTrack, videoTrack] = await AgoraRTC.default.createMicrophoneAndCameraTracks(
            {
              // Audio constraints - use Agora's audio processing
              AEC: true, // Acoustic Echo Cancellation
              ANS: true, // Automatic Noise Suppression
              AGC: true, // Automatic Gain Control
            },
            {
              // Video constraints
              encoderConfig: "720p_1",
              optimizationMode: "motion"
            }
          )
          
          localTracksRef.current = { audioTrack, videoTrack }

          // Play local video
          if (localVideoRef.current) {
            videoTrack.play(localVideoRef.current)
            console.log("[VIDEO_CALL] Local video track playing")
          }

          // Publish tracks
          await client.publish([audioTrack, videoTrack])
          console.log("[VIDEO_CALL] Local tracks published successfully")
        } catch (mediaError) {
          console.error("[VIDEO_CALL] Error creating/publishing local tracks:", mediaError)
          // Continue without local media - user can still receive remote streams
          onConnectionError("Could not access camera/microphone. You can still receive audio/video from others.")
        }

        // Monitor network quality
        client.on("network-quality", (stats: any) => {
          setNetworkStats({
            rtt: stats.rtt || 0,
            uplinkLoss: stats.uplinkNetworkQuality || 0,
            downlinkLoss: stats.downlinkNetworkQuality || 0
          })
          
          const quality = Math.max(stats.uplinkNetworkQuality || 0, stats.downlinkNetworkQuality || 0)
          if (quality <= 2) setCallQuality("excellent")
          else if (quality <= 3) setCallQuality("good")
          else if (quality <= 4) setCallQuality("fair")
          else if (quality <= 5) setCallQuality("poor")
          else setCallQuality("unknown")
        })

        setConnectionState("connected")
        console.log("[VIDEO_CALL] Agora initialization completed successfully")

        // Start session tracking
        trackingIntervalRef.current = setInterval(async () => {
          try {
            // Ping the session to maintain tracking
            await fetch(`/api/sessions/${sessionId}/ping`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            })
          } catch (error) {
            console.error("[VIDEO_CALL] Session ping failed:", error)
          }
        }, 30000) // Ping every 30 seconds

      } catch (error) {
        console.error("[VIDEO_CALL] Failed to initialize Agora:", error)
        setConnectionState("failed")
        onConnectionError(`Failed to connect to video call: ${error instanceof Error ? error.message : 'Unknown error'}`)
      } finally {
        isInitializingRef.current = false
      }
    }

    initializeAgora()

    // Handle browser events
    const handleBeforeUnload = () => {
      if (hasJoinedChannelRef.current && agoraClientRef.current) {
        // Synchronous cleanup for page unload
        try {
          if (localTracksRef.current.audioTrack) {
            localTracksRef.current.audioTrack.stop()
            localTracksRef.current.audioTrack.close()
          }
          if (localTracksRef.current.videoTrack) {
            localTracksRef.current.videoTrack.stop()
            localTracksRef.current.videoTrack.close()
          }
          agoraClientRef.current.leave()
        } catch (error) {
          console.error("[VIDEO_CALL] Error in beforeunload cleanup:", error)
        }
      }
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log("[VIDEO_CALL] Page hidden - reducing video quality")
        // Could implement video quality reduction here
      } else {
        console.log("[VIDEO_CALL] Page visible - restoring video quality")
        // Could restore video quality here
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Cleanup on unmount
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      performCleanup("component_unmount")
    }
  }, [agoraConfig, sessionId, onConnectionError, attemptReconnection, performCleanup, isCallEnding])

  // Media control functions
  const toggleVideo = useCallback(async () => {
    if (localTracksRef.current.videoTrack && !isCallEnding) {
      try {
        const newState = !isVideoEnabled
        await localTracksRef.current.videoTrack.setEnabled(newState)
        setIsVideoEnabled(newState)
        console.log(`[VIDEO_CALL] Video ${newState ? 'enabled' : 'disabled'}`)
      } catch (error) {
        console.error("[VIDEO_CALL] Error toggling video:", error)
      }
    }
  }, [isVideoEnabled, isCallEnding])

  const toggleAudio = useCallback(async () => {
    if (localTracksRef.current.audioTrack && !isCallEnding) {
      try {
        const newState = !isAudioEnabled
        await localTracksRef.current.audioTrack.setEnabled(newState)
        setIsAudioEnabled(newState)
        console.log(`[VIDEO_CALL] Audio ${newState ? 'enabled' : 'disabled'}`)
      } catch (error) {
        console.error("[VIDEO_CALL] Error toggling audio:", error)
      }
    }
  }, [isAudioEnabled, isCallEnding])

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
        setIsFullscreen(true)
      } else {
        await document.exitFullscreen()
        setIsFullscreen(false)
      }
    } catch (error) {
      console.error("[VIDEO_CALL] Error toggling fullscreen:", error)
    }
  }, [])

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Helper functions
  const getConnectionStatusColor = (state: ConnectionState) => {
    switch (state) {
      case "connected": return "text-green-400"
      case "connecting": return "text-yellow-400"
      case "reconnecting": return "text-orange-400"
      case "disconnected": return "text-red-400"
      case "failed": return "text-red-500"
      default: return "text-gray-400"
    }
  }

  const getQualityColor = (quality: CallQuality) => {
    switch (quality) {
      case "excellent": return "text-green-400"
      case "good": return "text-blue-400" 
      case "fair": return "text-yellow-400"
      case "poor": return "text-red-400"
      default: return "text-gray-400"
    }
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  }

  const formatSessionTimeRemaining = () => {
    if ('timeRemaining' in sessionTimer) {
      const minutes = Math.floor(sessionTimer.timeRemaining / 60)
      const seconds = sessionTimer.timeRemaining % 60
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return "00:00"
  }

  const formatTimeElapsed = () => {
    if ('timeElapsed' in sessionTimer) {
      const minutes = Math.floor(sessionTimer.timeElapsed / 60)
      const seconds = sessionTimer.timeElapsed % 60
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return "00:00"
  }

  const getTimeRemaining = () => {
    if ('timeRemaining' in sessionTimer) {
      return sessionTimer.timeRemaining
    }
    return 0
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="bg-slate-900/95 border-b border-slate-700/50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Badge variant="outline" className="text-green-400 border-green-400">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
              LIVE SESSION
            </Badge>
            <div className="flex items-center space-x-2 text-sm text-slate-300">
              <Clock className="h-4 w-4" />
              <span>Time Remaining: {formatSessionTimeRemaining()}</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-slate-400">
              <span>Elapsed: {formatTimeElapsed()}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-300">{participants}</span>
            </div>
            <Badge 
              variant="outline" 
              className={`${getConnectionStatusColor(connectionState)} border-current`}
            >
              {connectionState}
              {connectionState === "reconnecting" && connectionRetryCount > 0 && 
                ` (${connectionRetryCount}/3)`
              }
            </Badge>
            <Badge 
              variant="outline" 
              className={`${getQualityColor(callQuality)} border-current`}
            >
              {callQuality}
            </Badge>
          </div>
        </div>
      </div>

      {/* Video Area */}
      <div className="flex-1 relative bg-slate-900">
        {(connectionState === "connecting" || connectionState === "reconnecting") && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <Card className="bg-slate-800/90 border-slate-600">
              <CardContent className="p-6 text-center">
                <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-slate-200">
                  {connectionState === "connecting" ? "Connecting to video call..." : "Reconnecting..."}
                </p>
                {connectionRetryCount > 0 && (
                  <p className="text-slate-400 text-sm mt-2">
                    Attempt {connectionRetryCount}/3
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {connectionState === "failed" && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <Alert className="bg-red-900/20 border-red-600/30 max-w-md">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-300">
                Failed to connect to the video call. Please check your internet connection and try again.
              </AlertDescription>
            </Alert>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 h-full">
          {/* Remote Video */}
          <div className="relative bg-slate-800 rounded-lg overflow-hidden">
            <div ref={remoteVideoRef} className="w-full h-full min-h-[300px]" />
            {!isRemoteVideoVisible && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Avatar className="h-24 w-24 mx-auto mb-4">
                    <AvatarImage src={otherParticipant.profilePictureUrl || ""} />
                    <AvatarFallback className="bg-slate-700 text-slate-200 text-2xl">
                      {getInitials(otherParticipant.firstName, otherParticipant.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="text-xl font-semibold text-white mb-1">
                    {otherParticipant.firstName} {otherParticipant.lastName}
                  </h3>
                  <p className="text-slate-400">{otherParticipant.title}</p>
                  <p className="text-sm text-slate-500 mt-2">
                    {participants === 1 ? "Waiting to join..." : "Video disabled"}
                  </p>
                </div>
              </div>
            )}
            
            {/* Remote Audio Indicator */}
            <div className="absolute bottom-4 left-4">
              {isRemoteAudioEnabled ? (
                <Volume2 className="h-5 w-5 text-green-400" />
              ) : (
                <VolumeX className="h-5 w-5 text-red-400" />
              )}
            </div>
          </div>

          {/* Local Video */}
          <div className="relative bg-slate-800 rounded-lg overflow-hidden">
            <div ref={localVideoRef} className="w-full h-full min-h-[300px]" />
            {!isVideoEnabled && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                <div className="text-center">
                  <VideoOff className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                  <p className="text-slate-400">Your video is disabled</p>
                </div>
              </div>
            )}
            
            {/* Local Video Label */}
            <div className="absolute bottom-4 right-4">
              <Badge variant="outline" className="text-blue-400 border-blue-400">
                You ({userRole})
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-slate-900/95 border-t border-slate-700/50 p-4">
        <div className="flex items-center justify-center space-x-4">
          <Button
            variant={isVideoEnabled ? "default" : "destructive"}
            size="lg"
            onClick={toggleVideo}
            className="rounded-full w-12 h-12 p-0"
            disabled={isCallEnding}
          >
            {isVideoEnabled ? (
              <Video className="h-5 w-5" />
            ) : (
              <VideoOff className="h-5 w-5" />
            )}
          </Button>

          <Button
            variant={isAudioEnabled ? "default" : "destructive"}
            size="lg"
            onClick={toggleAudio}
            className="rounded-full w-12 h-12 p-0"
            disabled={isCallEnding}
          >
            {isAudioEnabled ? (
              <Mic className="h-5 w-5" />
            ) : (
              <MicOff className="h-5 w-5" />
            )}
          </Button>

          <Button
            variant="outline"
            size="lg"
            onClick={toggleFullscreen}
            className="rounded-full w-12 h-12 p-0"
            disabled={isCallEnding}
          >
            {isFullscreen ? (
              <Minimize2 className="h-5 w-5" />
            ) : (
              <Maximize2 className="h-5 w-5" />
            )}
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="rounded-full w-12 h-12 p-0"
            disabled
          >
            <Settings className="h-5 w-5" />
          </Button>

          <Separator orientation="vertical" className="h-8 bg-slate-600" />

          <Button
            variant="destructive"
            size="lg"
            onClick={handleEndCall}
            className="rounded-full px-8"
            disabled={isCallEnding}
          >
            <Phone className="h-5 w-5 mr-2 rotate-[135deg]" />
            {isCallEnding ? "Ending..." : "End Call"}
          </Button>
        </div>

        {/* Network Stats */}
        {networkStats.rtt > 0 && (
          <div className="flex items-center justify-center space-x-6 mt-3 text-xs text-slate-400">
            <span>RTT: {networkStats.rtt}ms</span>
            <span>Upload Loss: {networkStats.uplinkLoss}%</span>
            <span>Download Loss: {networkStats.downlinkLoss}%</span>
          </div>
        )}
      </div>

      {/* Low Time Warning */}
      {getTimeRemaining() <= 300 && getTimeRemaining() > 0 && (
        <div className="absolute top-20 right-4">
          <Alert className="bg-orange-900/20 border-orange-600/30">
            <AlertTriangle className="h-4 w-4 text-orange-400" />
            <AlertDescription className="text-orange-300">
              Session ending in {formatSessionTimeRemaining()}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Connection Issues Alert */}
      {(connectionState === "reconnecting" || connectionState === "disconnected") && (
        <div className="absolute top-20 left-4">
          <Alert className="bg-yellow-900/20 border-yellow-600/30">
            <AlertTriangle className="h-4 w-4 text-yellow-400" />
            <AlertDescription className="text-yellow-300">
              {connectionState === "reconnecting" 
                ? `Reconnecting... (${connectionRetryCount}/3)`
                : "Connection lost. Attempting to reconnect..."
              }
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  )
}