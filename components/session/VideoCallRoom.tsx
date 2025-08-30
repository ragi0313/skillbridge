// @refresh reset

"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
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
  Users,
  Clock,
  AlertTriangle,
  Volume2,
  VolumeX,
  RefreshCw,
  Monitor,
  MessageSquare,
  Send,
  Download,
  X,
  FileText,
  Image as ImageIcon,
  Upload
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
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
  currentUser: {
    firstName: string
    lastName: string
    profilePictureUrl?: string | null
  }
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
  onLeaveCall: (reason?: string) => void
  onConnectionError: (error: string) => void
  hasJoinedSession?: boolean
}

type ConnectionState = "connecting" | "connected" | "reconnecting" | "disconnected" | "failed"
type CallQuality = "excellent" | "good" | "fair" | "poor" | "unknown"

interface ChatMessage {
  id: string
  message: string
  messageType: "text" | "file"
  timestamp: number
  senderName: string
  senderRole: "learner" | "mentor"
  senderId: string
  attachment?: ChatAttachment
}

interface ChatAttachment {
  fileName: string
  fileSize: number
  fileType: string
  fileData: string // Base64 encoded file data
  thumbnailData?: string // Base64 encoded thumbnail
}

export function VideoCallRoom({
  sessionId,
  sessionData,
  userRole,
  currentUser,
  otherParticipant,
  agoraConfig,
  onLeaveCall,
  onConnectionError,
  hasJoinedSession = false
}: VideoCallRoomProps) {
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting")
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [isRemoteVideoVisible, setIsRemoteVideoVisible] = useState(false)
  const [isRemoteAudioEnabled, setIsRemoteAudioEnabled] = useState(false)
  const [callQuality, setCallQuality] = useState<CallQuality>("unknown")
  const [participants, setParticipants] = useState<number>(1)
  const [isCallEnding, setIsCallEnding] = useState(false)
  const [connectionRetryCount, setConnectionRetryCount] = useState(0)
  const [mediaError, setMediaError] = useState<string>("")
  const [isRetryingMedia, setIsRetryingMedia] = useState(false)
  const [networkStats, setNetworkStats] = useState({
    rtt: 0,
    uplinkLoss: 0,
    downlinkLoss: 0
  })

  // Screen sharing states
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [isRemoteScreenSharing, setIsRemoteScreenSharing] = useState(false)

  // Chat states
  const [showSidebar, setShowSidebar] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [unreadCount, setUnreadCount] = useState(0)

  // File sharing states
  const [isUploading, setIsUploading] = useState(false)

  const localVideoRef = useRef<HTMLDivElement>(null)
  const remoteVideoRef = useRef<HTMLDivElement>(null)
  const screenShareRef = useRef<HTMLDivElement>(null)
  const agoraClientRef = useRef<any>(null)
  const rtmClientRef = useRef<any>(null)
  const rtmChannelRef = useRef<any>(null)
  const localTracksRef = useRef<{ videoTrack?: any; audioTrack?: any; screenTrack?: any }>({})
  const isInitializingRef = useRef<boolean>(false)
  const isCleaningUpRef = useRef<boolean>(false)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const trackingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const hasJoinedChannelRef = useRef<boolean>(false)
  const currentRemoteUsersRef = useRef<Set<string>>(new Set())
  const hasCalledLeaveRef = useRef<boolean>(false)
  const lastPingTimeRef = useRef<number>(Date.now())
  const fileInputRef = useRef<HTMLInputElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const sessionStart = new Date(sessionData.startTime)
  const sessionEnd = new Date(sessionData.endTime)

  // Enhanced ping function with better error handling and cleanup
  const pingSession = useCallback(async () => {
    // Don't ping if component is unmounting or call is ending
    if (isCleaningUpRef.current || isCallEnding) {
      return
    }
    
    try {
      const response = await fetch(`/api/sessions/${sessionId}/ping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        console.warn("[VIDEO_CALL] Session ping failed with status:", response.status)
      } else {
        const data = await response.json()
        lastPingTimeRef.current = Date.now()
        console.log("[VIDEO_CALL] Session ping successful:", data.timestamp)
      }
    } catch (error) {
      console.warn("[VIDEO_CALL] Session ping failed:", error)
    }
  }, [sessionId, isCallEnding])

  // Enhanced media cleanup with better error handling
  const cleanupLocalTracks = useCallback(async () => {
    console.log("[VIDEO_CALL] Starting local tracks cleanup")
    
    try {
      // Stop and close video track
      if (localTracksRef.current.videoTrack) {
        try {
          localTracksRef.current.videoTrack.stop()
          localTracksRef.current.videoTrack.close()
          console.log("[VIDEO_CALL] Video track cleaned up")
        } catch (error) {
          console.error("[VIDEO_CALL] Error cleaning video track:", error)
        }
        localTracksRef.current.videoTrack = undefined
      }

      // Stop and close audio track
      if (localTracksRef.current.audioTrack) {
        try {
          localTracksRef.current.audioTrack.stop()
          localTracksRef.current.audioTrack.close()
          console.log("[VIDEO_CALL] Audio track cleaned up")
        } catch (error) {
          console.error("[VIDEO_CALL] Error cleaning audio track:", error)
        }
        localTracksRef.current.audioTrack = undefined
      }

      // Stop and close screen track
      if (localTracksRef.current.screenTrack) {
        try {
          localTracksRef.current.screenTrack.stop()
          localTracksRef.current.screenTrack.close()
          console.log("[VIDEO_CALL] Screen track cleaned up")
        } catch (error) {
          console.error("[VIDEO_CALL] Error cleaning screen track:", error)
        }
        localTracksRef.current.screenTrack = undefined
      }

      // Clear video elements
      if (localVideoRef.current) {
        localVideoRef.current.innerHTML = ""
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.innerHTML = ""
      }

    } catch (error) {
      console.error("[VIDEO_CALL] Error in cleanupLocalTracks:", error)
    }
  }, [])

  // Retry media creation with fallback options
  const retryMediaCreation = useCallback(async (AgoraRTC: any, client: any) => {
    setIsRetryingMedia(true)
    setMediaError("")

    const mediaConfigs = [
      // Try with all features first
      {
        audio: { AEC: true, ANS: true, AGC: true },
        video: { encoderConfig: "720p_1", optimizationMode: "motion" },
        description: "high quality"
      },
      // Fallback to medium quality
      {
        audio: { AEC: true, ANS: false, AGC: true },
        video: { encoderConfig: "480p_1", optimizationMode: "motion" },
        description: "medium quality"
      },
      // Fallback to basic quality
      {
        audio: { AEC: false, ANS: false, AGC: false },
        video: { encoderConfig: "240p_1", optimizationMode: "motion" },
        description: "basic quality"
      },
      // Audio only
      {
        audio: true,
        video: null,
        description: "audio only"
      }
    ]

    // Clean up existing tracks first
    await cleanupLocalTracks()

    for (let i = 0; i < mediaConfigs.length; i++) {
      const config = mediaConfigs[i]
      try {
        console.log(`[VIDEO_CALL] Attempting media creation with ${config.description}`)
        
        if (config.video) {
          const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
            config.audio,
            config.video
          )
          localTracksRef.current = { audioTrack, videoTrack }
          
          if (localVideoRef.current && videoTrack) {
            videoTrack.play(localVideoRef.current)
            console.log("[VIDEO_CALL] Local video track playing")
          }
          
          await client.publish([audioTrack, videoTrack])
          console.log(`[VIDEO_CALL] Media tracks published successfully with ${config.description}`)
          setIsRetryingMedia(false)
          return true
        } else {
          // Audio only
          const audioTrack = await AgoraRTC.createMicrophoneTrack(config.audio)
          localTracksRef.current = { audioTrack }
          setIsVideoEnabled(false) // Disable video UI
          
          await client.publish([audioTrack])
          console.log("[VIDEO_CALL] Audio-only track published successfully")
          setMediaError("Camera not available - audio only mode")
          setIsRetryingMedia(false)
          return true
        }
      } catch (error) {
        console.error(`[VIDEO_CALL] Media creation failed with ${config.description}:`, error)
        if (i === mediaConfigs.length - 1) {
          // Last attempt failed
          setMediaError("Could not access camera or microphone. You can still receive audio/video from others.")
          setIsRetryingMedia(false)
          return false
        }
        // Continue to next config
        continue
      }
    }
    
    setIsRetryingMedia(false)
    return false
  }, [cleanupLocalTracks])

  // Comprehensive cleanup function
  const performCleanup = useCallback(async (reason: string = "component_cleanup") => {
    if (isCleaningUpRef.current) {
      console.log("[VIDEO_CALL] Cleanup already in progress")
      return
    }

    isCleaningUpRef.current = true
    console.log(`[VIDEO_CALL] Starting cleanup: ${reason}`)

    try {
      // Clear intervals first
      if (trackingIntervalRef.current) {
        clearInterval(trackingIntervalRef.current)
        trackingIntervalRef.current = null
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }

      // Clean up local tracks
      await cleanupLocalTracks()

      // Clean up RTM
      if (rtmChannelRef.current) {
        try {
          await rtmChannelRef.current.leave()
          console.log("[VIDEO_CALL] Left RTM channel during cleanup")
        } catch (error) {
          console.error("[VIDEO_CALL] Error leaving RTM channel:", error)
        }
        rtmChannelRef.current = null
      }
      
      if (rtmClientRef.current) {
        try {
          await rtmClientRef.current.logout()
          console.log("[VIDEO_CALL] Logged out of RTM during cleanup")
        } catch (error) {
          console.error("[VIDEO_CALL] Error logging out of RTM:", error)
        }
        rtmClientRef.current = null
      }
      
      // Clean up Agora client
      if (agoraClientRef.current && hasJoinedChannelRef.current) {
        try {
          await agoraClientRef.current.leave()
          console.log("[VIDEO_CALL] Left Agora channel during cleanup")
          hasJoinedChannelRef.current = false
          
          // Wait a moment for cleanup to propagate
          await new Promise(resolve => setTimeout(resolve, 1000))
        } catch (error) {
          console.error("[VIDEO_CALL] Error leaving channel:", error)
        }
      }

      // Clear client references
      agoraClientRef.current = null
      
    } catch (error) {
      console.error("[VIDEO_CALL] Error during cleanup:", error)
    } finally {
      isCleaningUpRef.current = false
    }
  }, [cleanupLocalTracks])

  // Handle leaving the call
  const handleLeaveCall = useCallback(async (reason: string = "user_action") => {
    if (isCallEnding) return
    
    setIsCallEnding(true)
    console.log("[VIDEO_CALL] Leaving call with reason:", reason)

    // Call the leave API before cleanup (unless it's a page refresh)
    const isPageRefresh = reason === "page_refresh" || reason === "beforeunload"
    
    if (hasJoinedSession && !hasCalledLeaveRef.current && !isPageRefresh) {
      hasCalledLeaveRef.current = true
      try {
        await fetch(`/api/sessions/${sessionId}/leave`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            reason,
            isPageRefresh: false
          })
        })
        console.log("[VIDEO_CALL] Successfully left session via API")
      } catch (error) {
        console.error("[VIDEO_CALL] Error calling leave API:", error)
        // Continue with cleanup even if API call fails
      }
    }

    // Perform cleanup
    await performCleanup(reason)
    
    // Call the parent callback
    onLeaveCall(reason)
  }, [sessionId, hasJoinedSession, performCleanup, onLeaveCall, isCallEnding])

  // Session timer with proper cleanup
  const sessionTimer = useRealTimeTimer({
    startTime: sessionStart,
    endTime: sessionEnd,
    onTimeExpired: () => handleLeaveCall("session_ended")
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
      const tracksToPublish = []
      if (localTracksRef.current.audioTrack) {
        tracksToPublish.push(localTracksRef.current.audioTrack)
      }
      if (localTracksRef.current.videoTrack) {
        tracksToPublish.push(localTracksRef.current.videoTrack)
      }
      if (localTracksRef.current.screenTrack) {
        tracksToPublish.push(localTracksRef.current.screenTrack)
      }

      if (tracksToPublish.length > 0) {
        await agoraClientRef.current.publish(tracksToPublish)
        console.log("[VIDEO_CALL] Republished local tracks")
      }

      setConnectionState("connected")
      setConnectionRetryCount(0)
    } catch (error) {
      console.error("[VIDEO_CALL] Reconnection failed:", error)
      
      reconnectTimeoutRef.current = setTimeout(() => {
        attemptReconnection()
      }, 5000)
    }
  }, [agoraConfig, connectionRetryCount, onConnectionError, isCallEnding])

  // Initialize Agora
  useEffect(() => {
    const initializeAgora = async () => {
      if (isInitializingRef.current || isCleaningUpRef.current || agoraClientRef.current) {
        console.log("[VIDEO_CALL] Agora initialization already in progress or completed")
        return
      }
      
      const isReconnection = sessionStorage.getItem(`agora_connected_${sessionId}`) === 'true'
      if (isReconnection) {
        console.log("[VIDEO_CALL] Detected reconnection scenario")
        // Clear the flag and add extra delay
        sessionStorage.removeItem(`agora_connected_${sessionId}`)
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
      
      isInitializingRef.current = true
      
      try {
        console.log("[VIDEO_CALL] Initializing Agora SDK...")
        
        // Validate config before proceeding
        if (!agoraConfig.appId || !agoraConfig.channel || !agoraConfig.token || !agoraConfig.uid) {
          throw new Error("Invalid Agora configuration - missing required fields")
        }

        const AgoraRTC = await import("agora-rtc-sdk-ng")
        
        AgoraRTC.default.enableLogUpload()
        AgoraRTC.default.setLogLevel(2)
        
        const client = AgoraRTC.default.createClient({ 
          mode: "rtc", 
          codec: "vp8",
          role: "host"
        })
        
        agoraClientRef.current = client
        
        // Event listeners
        client.on("user-published", async (user: any, mediaType: "video" | "audio") => {
          try {
            console.log(`[VIDEO_CALL] User published ${mediaType}:`, user.uid)
            await client.subscribe(user, mediaType)
            
            if (mediaType === "video" && user.videoTrack) {
              // Check if this is screen sharing based on video track characteristics
              const isScreenShare = user.videoTrack._trackMediaType === 'screentrack' || 
                                   user.videoTrack.isScreenTrack || 
                                   (user.videoTrack.getMediaStreamTrack && 
                                    user.videoTrack.getMediaStreamTrack().getSettings().displaySurface)
              
              setIsRemoteVideoVisible(true)
              setIsRemoteScreenSharing(isScreenShare)
              
              if (remoteVideoRef.current) {
                user.videoTrack.play(remoteVideoRef.current)
              }
              
              console.log(`[VIDEO_CALL] Remote ${isScreenShare ? 'screen share' : 'camera'} started`)
            }
            
            if (mediaType === "audio" && user.audioTrack) {
              setIsRemoteAudioEnabled(true)
              user.audioTrack.play()
            }
            
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
            setIsRemoteScreenSharing(false)
            console.log("[VIDEO_CALL] Remote video/screen share stopped")
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
          
          if (currentRemoteUsersRef.current.size === 0) {
            setIsRemoteVideoVisible(false)
            setIsRemoteAudioEnabled(false)
          }
        })

        client.on("connection-state-changed", (currentState: string, revState: string, reason?: string) => {
          console.log(`[VIDEO_CALL] Connection state changed: ${revState} -> ${currentState}, reason: ${reason}`)
          setConnectionState(currentState.toLowerCase() as ConnectionState)
          
          if (currentState === "DISCONNECTED" && !isCallEnding && !isCleaningUpRef.current) {
            console.log("[VIDEO_CALL] Unexpected disconnection, attempting reconnection")
            attemptReconnection()
          } else if (currentState === "FAILED") {
            onConnectionError("Connection failed. Please check your internet connection.")
          }
        })

        client.on("exception", (evt: any) => {
          // Filter out non-critical stats exceptions
          if (!evt || Object.keys(evt).length === 0) {
            console.log("[VIDEO_CALL] Non-critical Agora stats exception (ignored)")
            return
          }
          
          console.error("[VIDEO_CALL] Agora exception:", evt)
          
          if (evt && evt.code) {
            switch (evt.code) {
              case "WEBSOCKET_DISCONNECTED":
                if (!isCallEnding) {
                  console.log("[VIDEO_CALL] WebSocket disconnected, attempting reconnection")
                  attemptReconnection()
                }
                break
              case "NETWORK_ERROR":
                console.log("[VIDEO_CALL] Network error detected")
                setCallQuality("poor")
                break
              case "INVALID_OPERATION":
                console.log("[VIDEO_CALL] Invalid operation, ignoring")
                break
              default:
                console.log(`[VIDEO_CALL] Unhandled exception code: ${evt.code}`)
            }
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
            sessionStorage.setItem(`agora_connected_${sessionId}`, 'true')
            break
          } catch (error: any) {
            joinAttempts++
            console.error(`[VIDEO_CALL] Join attempt ${joinAttempts} failed:`, error)
            
            // Handle specific error codes
            if (error.code === "INVALID_TOKEN" || error.message?.includes("token")) {
              console.error("[VIDEO_CALL] Token error detected, cannot retry")
              throw new Error("Authentication failed. Please refresh the page and try again.")
            }
            
            if (error.code === "UID_CONFLICT") {
              console.log("[VIDEO_CALL] UID conflict, retrying with UID 0")
              agoraConfig.uid = 0
              await new Promise(resolve => setTimeout(resolve, 1000))
              continue
            }
            
            if (error.code === "INVALID_CHANNEL_NAME") {
              throw new Error("Invalid channel configuration. Please contact support.")
            }
            
            if (joinAttempts >= maxJoinAttempts) {
              throw new Error(`Failed to join after ${maxJoinAttempts} attempts: ${error.message || error.code || 'Unknown error'}`)
            }
            
            // Wait before retry with exponential backoff
            await new Promise(resolve => setTimeout(resolve, 1000 * joinAttempts))
          }
        }

        if (!hasJoinedChannelRef.current) {
          throw new Error("Failed to join channel after all attempts")
        }

        // Create and publish local tracks with comprehensive error handling
        try {
          const mediaSuccess = await retryMediaCreation(AgoraRTC.default, client)
          if (!mediaSuccess) {
            console.warn("[VIDEO_CALL] Failed to create media tracks, continuing without local media")
            setMediaError("Camera/microphone access failed. You can still receive audio/video from others.")
          }
        } catch (mediaError) {
          console.error("[VIDEO_CALL] Error in media creation:", mediaError)
          setMediaError("Media initialization failed. You can still participate in receive-only mode.")
          // Continue without local media - user can still receive remote streams
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

        // Initialize RTM for chat and file sharing
        try {
          console.log("[VIDEO_CALL] Initializing Agora RTM...")
          const AgoraRTM = await import("agora-rtm-sdk")
          
          const rtmClient = new AgoraRTM.default.RTM(agoraConfig.appId, agoraConfig.uid.toString())
          rtmClientRef.current = rtmClient
          
          // Login to RTM
          await rtmClient.login()
          console.log("[VIDEO_CALL] RTM login successful")
          
          // Subscribe to channel messages
          const streamChannel = rtmClient.createStreamChannel(agoraConfig.channel)
          rtmChannelRef.current = streamChannel
          
          // Set up RTM event listeners
          streamChannel.on('message', (eventArgs: any) => {
            console.log("[VIDEO_CALL] Received RTM message:", eventArgs)
            const { message, publisher } = eventArgs
            if (message && message.stringData) {
              handleRTMMessage({ text: message.stringData }, publisher)
            }
          })
          
          streamChannel.on('presence', (eventArgs: any) => {
            console.log("[VIDEO_CALL] RTM presence event:", eventArgs)
            if (eventArgs.eventType === 'REMOTE_JOIN') {
              console.log("[VIDEO_CALL] RTM member joined:", eventArgs.publisher)
            } else if (eventArgs.eventType === 'REMOTE_LEAVE') {
              console.log("[VIDEO_CALL] RTM member left:", eventArgs.publisher)
            }
          })
          
          // Join RTM channel
          await streamChannel.join()
          console.log("[VIDEO_CALL] RTM channel joined successfully")
          
        } catch (rtmError) {
          console.error("[VIDEO_CALL] RTM initialization failed:", rtmError)
          setMediaError("Chat functionality unavailable. Video call will continue normally.")
        }

        setConnectionState("connected")
        console.log("[VIDEO_CALL] Agora initialization completed successfully")

        // Start session tracking with proper cleanup handling
        const startPing = () => {
          // Clear any existing interval first
          if (trackingIntervalRef.current) {
            clearInterval(trackingIntervalRef.current)
            trackingIntervalRef.current = null
          }
          
          // Only start if not cleaning up
          if (!isCleaningUpRef.current && !isCallEnding) {
            trackingIntervalRef.current = setInterval(() => {
              if (!isCleaningUpRef.current && !isCallEnding) {
                pingSession()
              }
            }, 30000)
          }
        }
        
        startPing()

      } catch (error) {
        console.error("[VIDEO_CALL] Failed to initialize Agora:", error)
        setConnectionState("failed")
        onConnectionError(`Failed to connect to video call: ${error instanceof Error ? error.message : 'Unknown error'}`)
      } finally {
        isInitializingRef.current = false
      }
    }

    initializeAgora()

    const handleBeforeUnload = () => {
      if (!isCleaningUpRef.current) {
        performCleanup("beforeunload")
      }
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log("[VIDEO_CALL] Page hidden")
      } else {
        console.log("[VIDEO_CALL] Page visible")
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      performCleanup("component_unmount")
    }
  }, [agoraConfig, sessionId, onConnectionError, attemptReconnection, performCleanup, isCallEnding, pingSession, retryMediaCreation])

  // FIXED: Improved video toggle with better track management
  const toggleVideo = useCallback(async () => {
    if (!agoraClientRef.current || isCallEnding) return
    
    try {
      if (isVideoEnabled && localTracksRef.current.videoTrack) {
        // Disable existing video
        await localTracksRef.current.videoTrack.setEnabled(false)
        setIsVideoEnabled(false)
        console.log("[VIDEO_CALL] Video disabled")
      } else {
        // Enable or create video track
        if (localTracksRef.current.videoTrack) {
          // Re-enable existing track
          await localTracksRef.current.videoTrack.setEnabled(true)
          setIsVideoEnabled(true)
          console.log("[VIDEO_CALL] Video re-enabled")
        } else {
          // Create new video track
          try {
            const AgoraRTC = await import("agora-rtc-sdk-ng")
            const videoTrack = await AgoraRTC.default.createCameraVideoTrack({
              encoderConfig: "480p_1",
              optimizationMode: "motion"
            })
            
            localTracksRef.current.videoTrack = videoTrack
            if (localVideoRef.current) {
              videoTrack.play(localVideoRef.current)
            }
            
            // Only publish if not currently screen sharing
            if (!isScreenSharing) {
              await agoraClientRef.current.publish([videoTrack])
            }
            
            setIsVideoEnabled(true)
            setMediaError("")
            console.log("[VIDEO_CALL] Video track recreated and enabled")
          } catch (error) {
            console.error("[VIDEO_CALL] Error recreating video track:", error)
            setMediaError("Failed to enable camera")
          }
        }
      }
    } catch (error) {
      console.error("[VIDEO_CALL] Error toggling video:", error)
      setMediaError("Failed to toggle video")
    }
  }, [isVideoEnabled, isCallEnding, isScreenSharing])

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

  const handleRetryMedia = useCallback(async () => {
    if (isRetryingMedia || !agoraClientRef.current) return
    
    try {
      const AgoraRTC = await import("agora-rtc-sdk-ng")
      await retryMediaCreation(AgoraRTC.default, agoraClientRef.current)
    } catch (error) {
      console.error("[VIDEO_CALL] Error retrying media:", error)
    }
  }, [isRetryingMedia, retryMediaCreation])

  // FIXED: Enhanced screen sharing functionality with proper error handling
  const toggleScreenShare = useCallback(async () => {
    if (!agoraClientRef.current) {
      console.warn("[VIDEO_CALL] No Agora client available for screen sharing")
      return
    }

    // Prevent multiple simultaneous calls
    if (isRetryingMedia) {
      console.log("[VIDEO_CALL] Screen share toggle blocked - media retry in progress")
      return
    }

    try {
      const AgoraRTC = await import("agora-rtc-sdk-ng")

      if (isScreenSharing) {
        // Stop screen sharing
        console.log("[VIDEO_CALL] Stopping screen share...")
        
        if (localTracksRef.current.screenTrack) {
          try {
            // Unpublish screen track first
            await agoraClientRef.current.unpublish([localTracksRef.current.screenTrack])
            console.log("[VIDEO_CALL] Screen track unpublished")
            
            // Stop and close screen track
            localTracksRef.current.screenTrack.stop()
            localTracksRef.current.screenTrack.close()
            localTracksRef.current.screenTrack = undefined
            console.log("[VIDEO_CALL] Screen track stopped and closed")
          } catch (error) {
            console.error("[VIDEO_CALL] Error stopping screen track:", error)
            // Continue with cleanup even if error occurs
            localTracksRef.current.screenTrack = undefined
          }
        }

        setIsScreenSharing(false)

        // Resume camera video if it was enabled before screen sharing
        if (isVideoEnabled) {
          try {
            console.log("[VIDEO_CALL] Recreating camera track after screen share...")
            
            // Clean up any existing video track first
            if (localTracksRef.current.videoTrack) {
              try {
                localTracksRef.current.videoTrack.stop()
                localTracksRef.current.videoTrack.close()
              } catch (cleanupError) {
                console.log("[VIDEO_CALL] Error cleaning existing video track:", cleanupError)
              }
              localTracksRef.current.videoTrack = undefined
            }
            
            const videoTrack = await AgoraRTC.default.createCameraVideoTrack({
              encoderConfig: "480p_1",
              optimizationMode: "motion"
            })
            
            localTracksRef.current.videoTrack = videoTrack
            
            if (localVideoRef.current) {
              videoTrack.play(localVideoRef.current)
            }
            
            // Wait a moment before publishing to avoid conflicts
            await new Promise(resolve => setTimeout(resolve, 500))
            await agoraClientRef.current.publish([videoTrack])
            
            console.log("[VIDEO_CALL] Camera video resumed after screen share")
          } catch (error) {
            console.error("[VIDEO_CALL] Error resuming camera video:", error)
            setMediaError("Failed to resume camera after screen sharing")
          }
        }

        console.log("[VIDEO_CALL] Screen sharing stopped")
        
      } else {
        // Start screen sharing
        console.log("[VIDEO_CALL] Starting screen share...")
        
        // Clear any previous errors
        setMediaError("")
        
        let screenTrack: any = null
        
        try {
          // Create screen share track with proper error handling
          console.log("[VIDEO_CALL] Creating screen video track...")
          const screenResult = await AgoraRTC.default.createScreenVideoTrack({
            encoderConfig: "1080p_1",
            optimizationMode: "detail"
          })
          
          // Handle both single track and array return types
          if (Array.isArray(screenResult)) {
            // If it returns [videoTrack, audioTrack], we only want the video track
            screenTrack = screenResult[0]
            console.log("[VIDEO_CALL] Screen track created (from array)")
          } else {
            // Single video track
            screenTrack = screenResult
            console.log("[VIDEO_CALL] Screen track created (single)")
          }

          // Verify we have a valid screen track
          if (!screenTrack || typeof screenTrack.play !== 'function') {
            console.error("[VIDEO_CALL] Invalid screen track received")
            throw new Error("Invalid screen track created")
          }

        } catch (screenError: any) {
          console.error("[VIDEO_CALL] Screen share creation failed:", screenError)
          
          // Handle specific error cases based on error properties
          const errorName = screenError.name || screenError.code || ''
          const errorMessage = screenError.message || ''
          const errorCode = screenError.code || ''
          
          // Check for various forms of permission denied or user cancellation
          const isPermissionDenied = 
            errorName.includes('NotAllowedError') || 
            errorMessage.includes('Permission denied') || 
            errorMessage.includes('denied by user') ||
            errorCode === 'PERMISSION_DENIED' ||
            errorName.includes('PERMISSION_DENIED')
          
          const isUserCancelled = 
            errorName.includes('AbortError') || 
            errorMessage.includes('aborted') || 
            errorMessage.includes('cancelled') ||
            errorMessage.includes('User cancelled')
          
          const isNotSupported = 
            errorName.includes('NotSupportedError') || 
            errorMessage.includes('not supported')
          
          if (isPermissionDenied || isUserCancelled) {
            // User denied permission or cancelled - don't show error message
            console.log("[VIDEO_CALL] Screen sharing permission denied or cancelled by user")
            return
          } else if (isNotSupported) {
            setMediaError("Screen sharing is not supported in this browser.")
            return
          } else {
            // Other errors
            console.log("[VIDEO_CALL] Screen sharing failed with error:", errorName, errorMessage, errorCode)
            setMediaError("Failed to start screen sharing. Please try again.")
            return
          }
        }

        try {
          // Stop camera video if it's currently published
          if (localTracksRef.current.videoTrack) {
            console.log("[VIDEO_CALL] Unpublishing camera track for screen share...")
            await agoraClientRef.current.unpublish([localTracksRef.current.videoTrack])
            console.log("[VIDEO_CALL] Camera track unpublished for screen share")
          }

          // Store screen track and publish it
          localTracksRef.current.screenTrack = screenTrack
          
          // Wait a moment to avoid publishing conflicts
          await new Promise(resolve => setTimeout(resolve, 300))
          
          console.log("[VIDEO_CALL] Publishing screen track...")
          await agoraClientRef.current.publish([screenTrack])
          
          if (localVideoRef.current) {
            screenTrack.play(localVideoRef.current)
          }

          setIsScreenSharing(true)
          console.log("[VIDEO_CALL] Screen sharing started successfully")

          // Listen for screen share end (when user stops from browser or system)
          if (screenTrack.on && typeof screenTrack.on === 'function') {
            screenTrack.on("track-ended", async () => {
              console.log("[VIDEO_CALL] Screen share ended by user/system")
              
              // Update state immediately
              setIsScreenSharing(false)
              
              // Clean up the screen track
              if (localTracksRef.current.screenTrack) {
                try {
                  // Unpublish if still connected
                  if (agoraClientRef.current && hasJoinedChannelRef.current) {
                    await agoraClientRef.current.unpublish([localTracksRef.current.screenTrack])
                    console.log("[VIDEO_CALL] Screen track unpublished after track-ended")
                  }
                  
                  localTracksRef.current.screenTrack.stop()
                  localTracksRef.current.screenTrack.close()
                  localTracksRef.current.screenTrack = undefined
                  console.log("[VIDEO_CALL] Screen track cleaned up after track-ended")
                } catch (error) {
                  console.error("[VIDEO_CALL] Error cleaning up ended screen track:", error)
                  localTracksRef.current.screenTrack = undefined
                }
              }
              
              // Resume camera video if it was enabled before screen sharing
              if (isVideoEnabled && agoraClientRef.current) {
                try {
                  console.log("[VIDEO_CALL] Recreating camera track after browser stop...")
                  
                  // Clean up any existing video track first
                  if (localTracksRef.current.videoTrack) {
                    try {
                      localTracksRef.current.videoTrack.stop()
                      localTracksRef.current.videoTrack.close()
                    } catch (cleanupError) {
                      console.log("[VIDEO_CALL] Error cleaning existing video track:", cleanupError)
                    }
                    localTracksRef.current.videoTrack = undefined
                  }
                  
                  const videoTrack = await AgoraRTC.default.createCameraVideoTrack({
                    encoderConfig: "480p_1",
                    optimizationMode: "motion"
                  })
                  
                  localTracksRef.current.videoTrack = videoTrack
                  
                  if (localVideoRef.current) {
                    videoTrack.play(localVideoRef.current)
                  }
                  
                  // Wait a moment before publishing to avoid conflicts
                  await new Promise(resolve => setTimeout(resolve, 500))
                  
                  if (hasJoinedChannelRef.current) {
                    await agoraClientRef.current.publish([videoTrack])
                    console.log("[VIDEO_CALL] Camera video resumed after browser stop")
                  }
                } catch (error) {
                  console.error("[VIDEO_CALL] Error resuming camera after browser stop:", error)
                }
              }
            })
          }

        } catch (publishError: any) {
          console.error("[VIDEO_CALL] Failed to publish screen share:", publishError)
          
          // Clean up screen track if publishing failed
          if (screenTrack) {
            try {
              screenTrack.stop()
              screenTrack.close()
            } catch (cleanupError) {
              console.error("[VIDEO_CALL] Error cleaning up failed screen track:", cleanupError)
            }
          }
          
          localTracksRef.current.screenTrack = undefined
          
          // Check if it's a multiple video tracks error
          if (publishError.code === 'CAN_NOT_PUBLISH_MULTIPLE_VIDEO_TRACKS' || 
              publishError.message?.includes('multiple video tracks')) {
            setMediaError("Cannot publish screen share while camera is active. Please try again.")
          } else {
            setMediaError("Failed to share screen. Please try again.")
          }
          
          // Try to republish camera track if it was unpublished
          if (localTracksRef.current.videoTrack && isVideoEnabled) {
            try {
              await new Promise(resolve => setTimeout(resolve, 500))
              await agoraClientRef.current.publish([localTracksRef.current.videoTrack])
              console.log("[VIDEO_CALL] Camera track republished after screen share failure")
            } catch (error) {
              console.error("[VIDEO_CALL] Failed to republish camera track:", error)
            }
          }
        }
      }
    } catch (error) {
      console.error("[VIDEO_CALL] Screen sharing error:", error)
      setMediaError("Screen sharing failed due to an unexpected error.")
      
      // Ensure we're not stuck in screen sharing state
      setIsScreenSharing(false)
      
      // Clean up any screen track that might exist
      if (localTracksRef.current.screenTrack) {
        try {
          localTracksRef.current.screenTrack.stop()
          localTracksRef.current.screenTrack.close()
          localTracksRef.current.screenTrack = undefined
        } catch (cleanupError) {
          console.error("[VIDEO_CALL] Error cleaning up screen track after error:", cleanupError)
        }
      }
    }
  }, [isScreenSharing, isVideoEnabled, isRetryingMedia])

  // RTM message handler
  const handleRTMMessage = useCallback((message: any, peerId: string) => {
    try {
      const messageData = JSON.parse(message.text)
      const newMessage: ChatMessage = {
        id: messageData.id || Date.now().toString(),
        message: messageData.message,
        messageType: messageData.messageType || 'text',
        timestamp: messageData.timestamp || Date.now(),
        senderName: messageData.senderName,
        senderRole: messageData.senderRole,
        senderId: peerId,
        attachment: messageData.attachment
      }
      
      setChatMessages(prev => [...prev, newMessage])
    } catch (error) {
      console.error('Failed to parse RTM message:', error)
    }
  }, [])

  // RTM-based messaging
  const sendMessage = useCallback(async (message: string, file?: File) => {
    if (!message.trim() && !file) return
    if (!rtmChannelRef.current) {
      console.error("[VIDEO_CALL] RTM channel not available for sending message")
      setMediaError('Chat is not connected. Please try again.')
      return
    }

    setIsUploading(!!file)
    
    try {
      // Get current user name
      const currentUserName = `${currentUser.firstName} ${currentUser.lastName}`
      
      let messageData: any = {
        id: Date.now().toString(),
        message: message.trim(),
        messageType: file ? 'file' : 'text',
        timestamp: Date.now(),
        senderName: currentUserName,
        senderRole: userRole,
        senderId: agoraConfig.uid.toString()
      }

      if (file) {
        // Check file size limit (RTM has message size limits)
        if (file.size > 5 * 1024 * 1024) { // 5MB limit for RTM
          setMediaError('File too large. Maximum size is 5MB.')
          setIsUploading(false)
          return
        }

        // Convert file to base64 for RTM transmission
        const fileData = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
        
        messageData = {
          ...messageData,
          message: file.name,
          attachment: {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            fileData: fileData
          }
        }
      }

      console.log("[VIDEO_CALL] Sending RTM message:", messageData)

      // Send via RTM stream channel
      await rtmChannelRef.current.publishMessage(JSON.stringify(messageData))
      
      console.log("[VIDEO_CALL] RTM message sent successfully")
      
      // Add to local messages (sender's copy)
      const localMessage: ChatMessage = {
        ...messageData,
        senderId: 'self'
      }
      setChatMessages(prev => [...prev, localMessage])
      setNewMessage("")
      
    } catch (error) {
      console.error('[VIDEO_CALL] Failed to send RTM message:', error)
      setMediaError('Failed to send message. Please check your connection and try again.')
    } finally {
      setIsUploading(false)
    }
  }, [rtmChannelRef, userRole, currentUser, agoraConfig.uid])

  const handleSendMessage = useCallback(() => {
    if (newMessage.trim()) {
      sendMessage(newMessage)
    }
  }, [newMessage, sendMessage])

  const handleFileUpload = useCallback((file: File) => {
    if (file.size > 5 * 1024 * 1024) { // 5MB limit for RTM
      setMediaError('File size must be less than 5MB')
      return
    }
    sendMessage('', file)
  }, [sendMessage])

  const downloadFile = useCallback(async (attachment: ChatAttachment) => {
    try {
      // Convert base64 data back to blob
      const response = await fetch(attachment.fileData)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = attachment.fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Failed to download file:', error)
    }
  }, [])

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatEndRef.current && showSidebar) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
    // Update unread count if sidebar is closed and message is from other user
    const lastMessage = chatMessages[chatMessages.length - 1]
    if (!showSidebar && lastMessage && lastMessage.senderId !== 'self') {
      setUnreadCount(prev => prev + 1)
    } else if (showSidebar) {
      setUnreadCount(0)
    }
  }, [chatMessages, showSidebar])

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

      {/* Main Content Area */}
      <div className="flex-1 flex relative">
        {/* Video Area */}
        <div className={`flex-1 relative bg-slate-900 ${showSidebar ? 'mr-80' : ''}`}>
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
            
            {/* Screen share indicator */}
            {isRemoteScreenSharing && (
              <div className="absolute top-4 left-4">
                <Badge className="bg-blue-600 text-white">
                  <Monitor className="h-3 w-3 mr-1" />
                  Screen Sharing
                </Badge>
              </div>
            )}
            
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
            {(!isVideoEnabled || !localTracksRef.current.videoTrack) && !isScreenSharing && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                <div className="text-center">
                  <VideoOff className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                  <p className="text-slate-400">
                    {!localTracksRef.current.videoTrack ? "Camera not available" : "Your video is disabled"}
                  </p>
                  {mediaError && !localTracksRef.current.videoTrack && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={handleRetryMedia}
                      disabled={isRetryingMedia}
                    >
                      {isRetryingMedia ? (
                        <>
                          <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin mr-2" />
                          Retrying...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-3 w-3 mr-2" />
                          Retry Camera
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            )}
            
            {/* Screen sharing indicator */}
            {isScreenSharing && (
              <div className="absolute top-4 left-4">
                <Badge className="bg-green-600 text-white">
                  <Monitor className="h-3 w-3 mr-1" />
                  You're sharing
                </Badge>
              </div>
            )}
            
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
            variant={isVideoEnabled && localTracksRef.current.videoTrack ? "default" : "destructive"}
            size="lg"
            onClick={toggleVideo}
            className="rounded-full w-12 h-12 p-0"
            disabled={isCallEnding || isRetryingMedia || isScreenSharing}
          >
            {isVideoEnabled && localTracksRef.current.videoTrack ? (
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
            variant={isScreenSharing ? "default" : "outline"}
            size="lg"
            onClick={toggleScreenShare}
            className="rounded-full w-12 h-12 p-0"
            disabled={isCallEnding || (!isScreenSharing && isRemoteScreenSharing)}
            title={
              isScreenSharing 
                ? "Stop Screen Share" 
                : isRemoteScreenSharing 
                  ? "Other participant is sharing screen"
                  : "Share Screen"
            }
          >
            <Monitor className={`h-5 w-5 ${
              isScreenSharing 
                ? 'text-green-400' 
                : isRemoteScreenSharing 
                  ? 'text-orange-400' 
                  : ''
            }`} />
          </Button>

          <Button
            variant={showSidebar ? "default" : "outline"}
            size="lg"
            onClick={() => setShowSidebar(!showSidebar)}
            className="rounded-full w-12 h-12 p-0 relative"
            disabled={isCallEnding}
            title="Toggle Chat"
          >
            <MessageSquare className={`h-5 w-5 ${showSidebar ? 'text-blue-400' : ''}`} />
            {unreadCount > 0 && !showSidebar && (
              <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center p-1">
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </Button>

          <Separator orientation="vertical" className="h-8 bg-slate-600" />

          <Button
            variant="destructive"
            size="lg"
            onClick={() => handleLeaveCall("user_action")}
            className="rounded-full px-8"
            disabled={isCallEnding}
          >
            <Phone className="h-5 w-5 mr-2 rotate-[135deg]" />
            {isCallEnding ? "Leaving..." : "Leave Call"}
          </Button>
        </div>

        {networkStats.rtt > 0 && (
          <div className="flex items-center justify-center space-x-6 mt-3 text-xs text-slate-400">
            <span>RTT: {networkStats.rtt}ms</span>
            <span>Upload Loss: {networkStats.uplinkLoss}%</span>
            <span>Download Loss: {networkStats.downlinkLoss}%</span>
          </div>
        )}
      </div>

      {/* Media Error Alert */}
      {mediaError && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50">
          <Alert className="bg-orange-900/20 border-orange-600/30 max-w-md">
            <AlertTriangle className="h-4 w-4 text-orange-400" />
            <AlertDescription className="text-orange-300 flex items-center justify-between">
              <span>{mediaError}</span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setMediaError("")}
                className="ml-2 h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

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

        {/* Chat/Files Sidebar */}
        {showSidebar && (
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-slate-800 border-l border-slate-700 flex flex-col">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Chat & Files</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSidebar(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 flex flex-col">
              <div className="p-4 border-b border-slate-700">
                <h4 className="text-sm font-medium text-slate-300">Session Chat</h4>
              </div>

              {/* Chat Content */}
              <div className="flex-1 flex flex-col m-0 p-0">
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-3">
                    {chatMessages.map((message) => (
                      <div key={message.id} className={`flex flex-col space-y-1 ${message.senderId === 'self' ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-center space-x-2 text-xs text-slate-400">
                          <span>{message.senderName}</span>
                          <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
                        </div>
                        {message.messageType === 'text' ? (
                          <div className={`rounded-lg p-3 max-w-[90%] ${
                            message.senderId === 'self' 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-slate-700 text-slate-200'
                          }`}>
                            <p className="text-sm">{message.message}</p>
                          </div>
                        ) : (
                          <div className={`rounded-lg p-3 max-w-[90%] flex items-center space-x-2 ${
                            message.senderId === 'self' 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-slate-700 text-slate-200'
                          }`}>
                            {message.attachment?.fileType?.startsWith('image/') ? (
                              <ImageIcon className="h-4 w-4 text-current" />
                            ) : (
                              <FileText className="h-4 w-4 text-current" />
                            )}
                            <div className="flex-1">
                              <p className="text-sm">{message.attachment?.fileName}</p>
                              <p className="text-xs opacity-70">
                                {message.attachment?.fileSize ? `${(message.attachment.fileSize / 1024).toFixed(1)} KB` : 'Unknown size'}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => message.attachment && downloadFile(message.attachment)}
                              className="text-current hover:bg-white/20"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                </ScrollArea>

                {/* Chat Input with File Upload */}
                <div className="p-4 border-t border-slate-700">
                  <div className="space-y-2">
                    {/* File upload area */}
                    <div 
                      className="border-2 border-dashed border-slate-600 rounded-lg p-3 text-center hover:border-slate-500 transition-colors cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                      onDrop={(e) => {
                        e.preventDefault()
                        const file = e.dataTransfer.files[0]
                        if (file) handleFileUpload(file)
                      }}
                      onDragOver={(e) => e.preventDefault()}
                    >
                      <Upload className="h-5 w-5 text-slate-400 mx-auto mb-1" />
                      <p className="text-xs text-slate-400">Click or drag files here to share</p>
                      <p className="text-xs text-slate-500 mt-1">Max 5MB</p>
                    </div>
                    
                    {/* Text input */}
                    <div className="flex space-x-2">
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleSendMessage()
                          }
                        }}
                        disabled={isCallEnding || isUploading}
                      />
                      <Button
                        size="sm"
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim() || isCallEnding || isUploading}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {isUploading ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) {
              handleFileUpload(file)
              // Reset the input
              if (fileInputRef.current) {
                fileInputRef.current.value = ''
              }
            }
          }}
          accept="*/*"
        />
      </div>
    </div>
  )
}