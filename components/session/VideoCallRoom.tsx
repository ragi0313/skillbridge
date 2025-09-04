// @refresh reset

"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import {  Video,  VideoOff,  Mic,  MicOff,  Phone, Users, Clock, AlertTriangle, Volume2,  VolumeX,  RefreshCw,  Monitor, MessageSquare,
  Send,
  Download,
  X,
  FileText,
  Image as ImageIcon,
  Upload,
  PenTool
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useRealTimeTimer } from "@/lib/hooks/useRealTimeTimer"
import { Whiteboard } from "@/components/whiteboard/Whiteboard"
// Simple REST-based chat - much more reliable than Agora Chat

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
  const [isChatInitialized, setIsChatInitialized] = useState(false)

  // File sharing states
  const [isUploading, setIsUploading] = useState(false)

  // Whiteboard states
  const [showWhiteboard, setShowWhiteboard] = useState(false)

  const localVideoRef = useRef<HTMLDivElement>(null)
  const remoteVideoRef = useRef<HTMLDivElement>(null)
  const screenShareRef = useRef<HTMLDivElement>(null)
  const agoraClientRef = useRef<any>(null)
  const chatPollIntervalRef = useRef<NodeJS.Timeout | null>(null)
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
  const chatInitializedRef = useRef<boolean>(false)

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

  // Poll for new chat messages from REST API
  const pollChatMessages = useCallback(async () => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/chat`)
      if (response.ok) {
        const data = await response.json()
        const allMessages = data.messages || []
        
        // Get current user identifier
        const currentUserId = `${userRole}-${currentUser.firstName} ${currentUser.lastName}`
        
        // Filter messages to only include ones from other users
        const otherUserMessages = allMessages.filter((msg: ChatMessage) => 
          msg.senderId !== currentUserId
        )
        
        if (otherUserMessages.length > 0) {
          setChatMessages((prev: ChatMessage[]) => {
            // Get current message IDs to avoid duplicates
            const existingIds = prev.map(msg => msg.id)
            
            // Filter out messages we already have
            const newMessages = otherUserMessages.filter((msg: ChatMessage) => 
              !existingIds.includes(msg.id)
            )
            
            if (newMessages.length > 0) {
              console.log(`[VIDEO_CALL] Adding ${newMessages.length} new messages from other users`)
              
              // Add the new messages from other users
              const updatedMessages = [...prev]
              newMessages.forEach((msg: ChatMessage) => {
                updatedMessages.push({
                  ...msg,
                  senderId: msg.senderId // Keep original senderId from API
                })
              })
              
              // Sort by timestamp to maintain order
              return updatedMessages.sort((a: ChatMessage, b: ChatMessage) => a.timestamp - b.timestamp)
            }
            
            return prev // No new messages
          })
        }
      }
    } catch (error) {
      console.error("[VIDEO_CALL] Error polling chat messages:", error)
    }
  }, [sessionId, currentUser])

  // Initialize REST-based chat polling
  const initializeChat = useCallback(async () => {
    if (chatInitializedRef.current) {
      return
    }
    
    try {
      console.log("[VIDEO_CALL] Initializing REST-based chat...")
      
      // Start polling for messages every 3 seconds to reduce API calls
      chatPollIntervalRef.current = setInterval(pollChatMessages, 3000)
      
      // Do an initial poll to get existing messages
      await pollChatMessages()
      chatInitializedRef.current = true
      setIsChatInitialized(true)
      
      console.log("[VIDEO_CALL] REST chat initialized successfully - polling every 3 seconds")
      
    } catch (error) {
      console.error("[VIDEO_CALL] Failed to initialize chat:", error)
    }
  }, [pollChatMessages])


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

      // Clean up chat polling
      if (chatPollIntervalRef.current) {
        try {
          console.log("[VIDEO_CALL] Stopping chat polling...")
          clearInterval(chatPollIntervalRef.current)
          chatPollIntervalRef.current = null
          console.log("[VIDEO_CALL] Chat polling cleanup completed")
        } catch (error) {
          console.error("[VIDEO_CALL] Error during chat cleanup:", error)
        }
        chatInitializedRef.current = false
        setIsChatInitialized(false)
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
        
        // Track video call entry in backend before starting Agora
        try {
          console.log("[VIDEO_CALL] Tracking video call entry...")
          const response = await fetch(`/api/sessions/${sessionId}/enter-video`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          })

          if (response.ok) {
            const data = await response.json()
            console.log("[VIDEO_CALL] Video call entry tracked:", data.message)
          } else {
            console.warn("[VIDEO_CALL] Failed to track video call entry:", response.status)
            // Don't throw error here - allow video call to continue even if tracking fails
          }
        } catch (error) {
          console.error("[VIDEO_CALL] Error tracking video call entry:", error)
          // Don't throw error here - allow video call to continue even if tracking fails
        }
        
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
            
            // Initialize chat when first user joins
            if (currentRemoteUsersRef.current.size === 1 && !chatInitializedRef.current) {
              // Initialize chat immediately when other user joins
              initializeChat()
            }
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
              case "NETWORK_DISCONNECTED":
                if (!isCallEnding) {
                  console.log("[VIDEO_CALL] Network disconnected, attempting reconnection")
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

        // Initialize REST-based chat immediately after RTC connection
        setTimeout(() => {
          if (!isCleaningUpRef.current && !isCallEnding) {
            initializeChat()
          }
        }, 1000) // Reduced delay

        setConnectionState("connected")
        console.log("[VIDEO_CALL] Agora initialization completed successfully")
        
        // Always initialize chat after successful connection
        if (!chatInitializedRef.current) {
          setTimeout(initializeChat, 500)
        }

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
  }, [agoraConfig, sessionId, onConnectionError, attemptReconnection, performCleanup, isCallEnding, pingSession, retryMediaCreation, initializeChat])

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

  // REST-based chat messaging - much more reliable!
  const sendMessage = useCallback(async (message: string, file?: File) => {
    if (!message.trim() && !file) return

    setIsUploading(!!file)
    
    try {
      console.log("[VIDEO_CALL] Sending message via REST API...")
      
      const currentUserName = `${currentUser.firstName} ${currentUser.lastName}`
      
      let attachment = undefined
      if (file) {
        // For file sharing, convert to base64
        const reader = new FileReader()
        const fileData = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string)
          reader.readAsDataURL(file)
        })
        
        attachment = {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          fileData: fileData
        }
      }
      
      // Send message to API
      const response = await fetch(`/api/sessions/${sessionId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: file ? file.name : message.trim(),
          messageType: file ? 'file' : 'text',
          senderName: currentUserName,
          senderRole: userRole,
          attachment
        })
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`)
      }
      
      const result = await response.json()
      console.log("[VIDEO_CALL] Message sent successfully:", result)
      
      // Add to local messages (sender's copy)
      const localMessage: ChatMessage = {
        id: result.message?.id || Date.now().toString(),
        message: file ? file.name : message.trim(),
        messageType: file ? 'file' : 'text',
        timestamp: Date.now(),
        senderName: currentUserName,
        senderRole: userRole,
        senderId: `${userRole}-${currentUserName}`, // Use same format as API
        attachment: file ? {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          fileData: URL.createObjectURL(file)
        } : undefined
      }
      
      setChatMessages((prev: ChatMessage[]) => {
        // Check if message already exists to avoid duplicates
        if (prev.some(msg => msg.id === localMessage.id)) {
          return prev
        }
        return [...prev, localMessage].sort((a, b) => a.timestamp - b.timestamp)
      })
      
      setNewMessage("")
      
      // Clear any previous errors
      setMediaError("")
      
    } catch (error) {
      console.error('[VIDEO_CALL] Failed to send message:', error)
      
      // Don't show error for network issues during message sending
      if (error instanceof Error && !error.message.includes('Failed to fetch')) {
        setMediaError(`Failed to send message: ${error.message}`)
      } else {
        console.warn('[VIDEO_CALL] Network error while sending message, will retry on next poll')
      }
    } finally {
      setIsUploading(false)
    }
  }, [userRole, currentUser, sessionId])

  const handleSendMessage = useCallback(() => {
    if (newMessage.trim()) {
      sendMessage(newMessage)
    }
  }, [newMessage, sendMessage])

  const handleFileUpload = useCallback((file: File) => {
    if (file.size > 10 * 1024 * 1024) { // 10MB limit for Agora Chat
      setMediaError('File size must be less than 10MB')
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
    const currentUserId = `${userRole}-${currentUser.firstName} ${currentUser.lastName}`
    if (!showSidebar && lastMessage && lastMessage.senderId !== currentUserId) {
      setUnreadCount((prev: number) => prev + 1)
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800 flex flex-col">
      {/* Modern Header */}
      <div className="bg-gray-900/95 backdrop-blur-lg border-b border-gray-700/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <Badge className="bg-red-600 hover:bg-red-600 text-white font-medium px-3 py-1">
              <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse" />
              LIVE
            </Badge>
            <div className="flex items-center space-x-2 text-sm font-medium text-gray-300">
              <Clock className="h-4 w-4" />
              <span className="font-mono">{formatSessionTimeRemaining()}</span>
            </div>
            <div className="h-4 w-px bg-gray-600" />
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <span>Elapsed: </span>
              <span className="font-mono text-gray-300">{formatTimeElapsed()}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2 text-sm">
              <div className="flex items-center justify-center w-8 h-8 bg-gray-700 rounded-full">
                <Users className="h-4 w-4 text-gray-300" />
              </div>
              <span className="text-gray-300 font-medium">{participants}</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium ${
                connectionState === 'connected' ? 'bg-green-600/20 text-green-400 border border-green-600/30' :
                connectionState === 'connecting' ? 'bg-yellow-600/20 text-yellow-400 border border-yellow-600/30' :
                connectionState === 'reconnecting' ? 'bg-orange-600/20 text-orange-400 border border-orange-600/30' :
                'bg-red-600/20 text-red-400 border border-red-600/30'
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${
                  connectionState === 'connected' ? 'bg-green-400' :
                  connectionState === 'connecting' ? 'bg-yellow-400 animate-pulse' :
                  connectionState === 'reconnecting' ? 'bg-orange-400 animate-pulse' :
                  'bg-red-400'
                }`} />
                <span className="capitalize">{connectionState}</span>
                {connectionState === "reconnecting" && connectionRetryCount > 0 && 
                  <span className="ml-1">({connectionRetryCount}/3)</span>
                }
              </div>
              <div className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                callQuality === 'excellent' ? 'bg-green-600/20 text-green-400 border border-green-600/30' :
                callQuality === 'good' ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30' :
                callQuality === 'fair' ? 'bg-yellow-600/20 text-yellow-400 border border-yellow-600/30' :
                callQuality === 'poor' ? 'bg-red-600/20 text-red-400 border border-red-600/30' :
                'bg-gray-600/20 text-gray-400 border border-gray-600/30'
              }`}>
                {callQuality}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex relative">
        {/* Modern Video Area */}
        <div className={`flex-1 relative bg-gray-900 ${showSidebar ? 'mr-80' : ''}`}>
        {(connectionState === "connecting" || connectionState === "reconnecting") && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-gray-900/80 backdrop-blur-sm">
            <Card className="bg-gray-800/95 border-gray-600/50 shadow-2xl">
              <CardContent className="p-8 text-center">
                <div className="relative mb-6">
                  <div className="animate-spin w-10 h-10 border-3 border-blue-500/30 border-t-blue-500 rounded-full mx-auto" />
                  <div className="absolute inset-0 animate-ping w-10 h-10 border-2 border-blue-500/20 rounded-full mx-auto" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {connectionState === "connecting" ? "Connecting..." : "Reconnecting..."}
                </h3>
                <p className="text-gray-300 text-sm">
                  {connectionState === "connecting" ? "Joining the video call" : "Attempting to restore connection"}
                </p>
                {connectionRetryCount > 0 && (
                  <div className="mt-4 flex items-center justify-center space-x-2">
                    <div className="text-orange-400 text-sm font-medium">
                      Attempt {connectionRetryCount}/3
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {connectionState === "failed" && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-gray-900/80 backdrop-blur-sm">
            <Alert className="bg-red-900/30 border-red-500/50 shadow-2xl max-w-md backdrop-blur-sm">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <AlertDescription className="text-red-200 text-sm leading-relaxed">
                <div className="font-semibold mb-1">Connection Failed</div>
                Unable to connect to the video call. Please check your internet connection and try again.
              </AlertDescription>
            </Alert>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 h-full">
          {/* Remote Video - Modern Design */}
          <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-gray-700/50">
            <div ref={remoteVideoRef} className="w-full h-full min-h-[320px] rounded-2xl" />
            {!isRemoteVideoVisible && (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800/50 to-gray-900/50">
                <div className="text-center">
                  <div className="relative mb-6">
                    <Avatar className="h-28 w-28 mx-auto border-4 border-white/10 shadow-2xl">
                      <AvatarImage src={otherParticipant.profilePictureUrl || ""} className="object-cover" />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-3xl font-bold">
                        {getInitials(otherParticipant.firstName, otherParticipant.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    {participants === 1 && (
                      <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                        <div className="w-3 h-3 bg-yellow-300 rounded-full animate-pulse" />
                      </div>
                    )}
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {otherParticipant.firstName} {otherParticipant.lastName}
                  </h3>
                  <p className="text-gray-300 font-medium mb-3">{otherParticipant.title}</p>
                  <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
                    participants === 1 
                      ? 'bg-yellow-600/20 text-yellow-300 border border-yellow-600/30' 
                      : 'bg-gray-600/20 text-gray-300 border border-gray-600/30'
                  }`}>
                    {participants === 1 ? "Joining..." : "Camera off"}
                  </div>
                </div>
              </div>
            )}
            
            {/* Modern Screen Share Indicator */}
            {isRemoteScreenSharing && (
              <div className="absolute top-4 left-4">
                <div className="bg-blue-600/90 backdrop-blur-sm text-white px-3 py-2 rounded-xl font-medium text-sm flex items-center space-x-2 shadow-lg border border-blue-500/30">
                  <Monitor className="h-4 w-4" />
                  <span>Screen Share</span>
                </div>
              </div>
            )}
            
            {/* Modern Audio Indicator */}
            <div className="absolute bottom-4 left-4">
              <div className={`p-2.5 rounded-full backdrop-blur-sm shadow-lg border ${
                isRemoteAudioEnabled 
                  ? 'bg-green-600/20 border-green-500/30' 
                  : 'bg-red-600/20 border-red-500/30'
              }`}>
                {isRemoteAudioEnabled ? (
                  <Volume2 className="h-5 w-5 text-green-400" />
                ) : (
                  <VolumeX className="h-5 w-5 text-red-400" />
                )}
              </div>
            </div>
            
            {/* Participant Name Overlay */}
            <div className="absolute bottom-4 right-4">
              <div className="bg-black/50 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-sm font-medium">
                {otherParticipant.firstName} {otherParticipant.lastName}
              </div>
            </div>
          </div>

          {/* Local Video - Modern Design */}
          <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-gray-700/50">
            <div ref={localVideoRef} className="w-full h-full min-h-[320px] rounded-2xl" />
            {(!isVideoEnabled || !localTracksRef.current.videoTrack) && !isScreenSharing && (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800/50 to-gray-900/50">
                <div className="text-center">
                  <div className="mb-6">
                    <div className="w-20 h-20 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-gray-600/50">
                      <VideoOff className="h-10 w-10 text-gray-400" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {!localTracksRef.current.videoTrack ? "Camera Unavailable" : "Camera Off"}
                  </h3>
                  <p className="text-gray-300 text-sm mb-4">
                    {!localTracksRef.current.videoTrack ? "Unable to access your camera" : "Your camera is currently disabled"}
                  </p>
                  {mediaError && !localTracksRef.current.videoTrack && (
                    <Button 
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-medium" 
                      size="sm"
                      onClick={handleRetryMedia}
                      disabled={isRetryingMedia}
                    >
                      {isRetryingMedia ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                          Retrying...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Retry Camera
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            )}
            
            {/* Modern Screen Share Indicator */}
            {isScreenSharing && (
              <div className="absolute top-4 left-4">
                <div className="bg-green-600/90 backdrop-blur-sm text-white px-3 py-2 rounded-xl font-medium text-sm flex items-center space-x-2 shadow-lg border border-green-500/30">
                  <Monitor className="h-4 w-4" />
                  <span>You're presenting</span>
                </div>
              </div>
            )}
            
            {/* Modern User Badge */}
            <div className="absolute bottom-4 right-4">
              <div className="bg-black/50 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full" />
                <span>You ({userRole})</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Controls Bar */}
      <div className="bg-gray-900/95 backdrop-blur-lg border-t border-gray-700/50 px-8 py-6">
        <div className="flex items-center justify-center space-x-6">
          {/* Video Control */}
          <div className="relative group">
            <Button
              onClick={toggleVideo}
              disabled={isCallEnding || isRetryingMedia || isScreenSharing}
              className={`relative w-14 h-14 rounded-full transition-all duration-200 shadow-lg border-2 ${
                isVideoEnabled && localTracksRef.current.videoTrack
                  ? 'bg-gray-700 hover:bg-gray-600 border-gray-600 text-white'
                  : 'bg-red-600 hover:bg-red-700 border-red-500 text-white'
              } ${isCallEnding || isRetryingMedia || isScreenSharing ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
            >
              {isVideoEnabled && localTracksRef.current.videoTrack ? (
                <Video className="h-6 w-6" />
              ) : (
                <VideoOff className="h-6 w-6" />
              )}
            </Button>
            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                {isVideoEnabled && localTracksRef.current.videoTrack ? 'Turn off camera' : 'Turn on camera'}
              </div>
            </div>
          </div>

          {/* Audio Control */}
          <div className="relative group">
            <Button
              onClick={toggleAudio}
              disabled={isCallEnding}
              className={`relative w-14 h-14 rounded-full transition-all duration-200 shadow-lg border-2 ${
                isAudioEnabled
                  ? 'bg-gray-700 hover:bg-gray-600 border-gray-600 text-white'
                  : 'bg-red-600 hover:bg-red-700 border-red-500 text-white'
              } ${isCallEnding ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
            >
              {isAudioEnabled ? (
                <Mic className="h-6 w-6" />
              ) : (
                <MicOff className="h-6 w-6" />
              )}
            </Button>
            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                {isAudioEnabled ? 'Mute' : 'Unmute'}
              </div>
            </div>
          </div>

          {/* Screen Share Control */}
          <div className="relative group">
            <Button
              onClick={toggleScreenShare}
              disabled={isCallEnding || (!isScreenSharing && isRemoteScreenSharing)}
              className={`relative w-14 h-14 rounded-full transition-all duration-200 shadow-lg border-2 ${
                isScreenSharing
                  ? 'bg-green-600 hover:bg-green-700 border-green-500 text-white'
                  : isRemoteScreenSharing
                    ? 'bg-orange-600 hover:bg-orange-700 border-orange-500 text-white opacity-50 cursor-not-allowed'
                    : 'bg-gray-700 hover:bg-gray-600 border-gray-600 text-white hover:scale-105'
              }`}
            >
              <Monitor className="h-6 w-6" />
              {isScreenSharing && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
              )}
            </Button>
            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                {isScreenSharing
                  ? 'Stop sharing'
                  : isRemoteScreenSharing
                    ? 'Other is sharing'
                    : 'Share screen'
                }
              </div>
            </div>
          </div>

          {/* Chat Control */}
          <div className="relative group">
            <Button
              onClick={() => setShowSidebar(!showSidebar)}
              disabled={isCallEnding}
              className={`relative w-14 h-14 rounded-full transition-all duration-200 shadow-lg border-2 ${
                showSidebar
                  ? 'bg-blue-600 hover:bg-blue-700 border-blue-500 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 border-gray-600 text-white'
              } ${isCallEnding ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
            >
              <MessageSquare className="h-6 w-6" />
              {unreadCount > 0 && !showSidebar && (
                <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center font-bold">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </div>
              )}
            </Button>
            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                {showSidebar ? 'Hide chat' : 'Show chat'}
              </div>
            </div>
          </div>

          {/* Whiteboard Control */}
          <div className="relative group">
            <Button
              onClick={() => setShowWhiteboard(!showWhiteboard)}
              disabled={isCallEnding}
              className={`relative w-14 h-14 rounded-full transition-all duration-200 shadow-lg border-2 ${
                showWhiteboard
                  ? 'bg-purple-600 hover:bg-purple-700 border-purple-500 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 border-gray-600 text-white'
              } ${isCallEnding ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
            >
              <PenTool className="h-6 w-6" />
              {showWhiteboard && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-400 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
              )}
            </Button>
            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                {showWhiteboard ? 'Hide whiteboard' : 'Show whiteboard'}
              </div>
            </div>
          </div>

          {/* Separator */}
          <div className="h-8 w-px bg-gray-600" />

          {/* Leave Call Button */}
          <div className="relative group">
            <Button
              onClick={() => handleLeaveCall("user_action")}
              disabled={isCallEnding}
              className={`relative bg-red-600 hover:bg-red-700 border-2 border-red-500 text-white px-6 py-3 rounded-full transition-all duration-200 shadow-lg font-medium ${
                isCallEnding ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
              }`}
            >
              <Phone className="h-5 w-5 mr-2 rotate-[135deg]" />
              <span className="text-sm font-medium">
                {isCallEnding ? "Leaving..." : "End call"}
              </span>
            </Button>
          </div>
        </div>

        {/* Network Stats */}
        {networkStats.rtt > 0 && (
          <div className="flex items-center justify-center space-x-8 mt-6 pt-4 border-t border-gray-700/50">
            <div className="flex items-center space-x-2 text-xs">
              <div className="w-2 h-2 bg-blue-400 rounded-full" />
              <span className="text-gray-400">Latency:</span>
              <span className="text-gray-300 font-mono">{networkStats.rtt}ms</span>
            </div>
            <div className="flex items-center space-x-2 text-xs">
              <div className="w-2 h-2 bg-green-400 rounded-full" />
              <span className="text-gray-400">Upload:</span>
              <span className="text-gray-300 font-mono">{networkStats.uplinkLoss}% loss</span>
            </div>
            <div className="flex items-center space-x-2 text-xs">
              <div className="w-2 h-2 bg-orange-400 rounded-full" />
              <span className="text-gray-400">Download:</span>
              <span className="text-gray-300 font-mono">{networkStats.downlinkLoss}% loss</span>
            </div>
          </div>
        )}
      </div>

      {/* Modern Media Error Alert */}
      {mediaError && (
        <div className="absolute top-24 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-orange-900/30 backdrop-blur-lg border border-orange-500/50 rounded-xl shadow-2xl max-w-md">
            <div className="p-4 flex items-start space-x-3">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-orange-400 mt-0.5" />
              </div>
              <div className="flex-1">
                <h4 className="text-orange-200 font-medium text-sm mb-1">Media Issue</h4>
                <p className="text-orange-300/90 text-sm leading-relaxed">{mediaError}</p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setMediaError("")}
                className="flex-shrink-0 h-6 w-6 p-0 text-orange-400 hover:text-orange-300 hover:bg-orange-500/20"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modern Low Time Warning */}
      {getTimeRemaining() <= 300 && getTimeRemaining() > 0 && (
        <div className="absolute top-24 right-6">
          <div className="bg-orange-900/30 backdrop-blur-lg border border-orange-500/50 rounded-xl shadow-2xl">
            <div className="p-4 flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-orange-600/20 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-orange-400" />
                </div>
              </div>
              <div>
                <h4 className="text-orange-200 font-medium text-sm mb-1">Session Ending Soon</h4>
                <p className="text-orange-300/90 text-sm">
                  <span className="font-mono font-bold">{formatSessionTimeRemaining()}</span> remaining
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modern Connection Issues Alert */}
      {(connectionState === "reconnecting" || connectionState === "disconnected") && (
        <div className="absolute top-24 left-6">
          <div className="bg-yellow-900/30 backdrop-blur-lg border border-yellow-500/50 rounded-xl shadow-2xl">
            <div className="p-4 flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-600/20 rounded-full flex items-center justify-center">
                  <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
                </div>
              </div>
              <div>
                <h4 className="text-yellow-200 font-medium text-sm mb-1">
                  {connectionState === "reconnecting" ? "Reconnecting" : "Connection Lost"}
                </h4>
                <p className="text-yellow-300/90 text-sm">
                  {connectionState === "reconnecting" 
                    ? `Attempt ${connectionRetryCount}/3`
                    : "Attempting to restore connection..."
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

        {/* Modern Chat/Files Sidebar */}
        {showSidebar && (
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-gray-900/95 backdrop-blur-lg border-l border-gray-700/50 flex flex-col shadow-2xl">
            <div className="p-6 border-b border-gray-700/50 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-600/20 rounded-lg flex items-center justify-center">
                  <MessageSquare className="h-4 w-4 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Chat & Files</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSidebar(false)}
                className="text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg p-2"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 flex flex-col">
              <div className="px-6 py-4 border-b border-gray-700/50">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-300">Messages</h4>
                  {!isChatInitialized ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                      <span className="text-xs text-gray-400">Connecting...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full" />
                      <span className="text-xs text-gray-400">Connected</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Modern Chat Content */}
              <div className="flex-1 flex flex-col">
                <ScrollArea className="flex-1 px-6 py-4">
                  <div className="space-y-4">
                    {chatMessages.map((message) => {
                      const currentUserId = `${userRole}-${currentUser.firstName} ${currentUser.lastName}`
                      const isOwnMessage = message.senderId === currentUserId
                      return (
                      <div key={message.id} className={`flex flex-col space-y-2 ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <span className="font-medium">{message.senderName}</span>
                          <span>•</span>
                          <span>{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        {message.messageType === 'text' ? (
                          <div className={`rounded-2xl px-4 py-2.5 max-w-[85%] shadow-sm ${
                            isOwnMessage 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-gray-700/80 text-gray-100 border border-gray-600/50'
                          }`}>
                            <p className="text-sm leading-relaxed">{message.message}</p>
                          </div>
                        ) : (
                          <div className={`rounded-2xl p-4 max-w-[85%] flex items-center space-x-3 shadow-sm border ${
                            isOwnMessage 
                              ? 'bg-blue-600 text-white border-blue-500/50' 
                              : 'bg-gray-700/80 text-gray-100 border-gray-600/50'
                          }`}>
                            <div className={`p-2 rounded-lg ${
                              isOwnMessage ? 'bg-blue-500/30' : 'bg-gray-600/50'
                            }`}>
                              {message.attachment?.fileType?.startsWith('image/') ? (
                                <ImageIcon className="h-5 w-5" />
                              ) : (
                                <FileText className="h-5 w-5" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{message.attachment?.fileName}</p>
                              <p className="text-xs opacity-75 mt-1">
                                {message.attachment?.fileSize ? `${(message.attachment.fileSize / 1024).toFixed(1)} KB` : 'Unknown size'}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => message.attachment && downloadFile(message.attachment)}
                              className={`p-2 rounded-lg ${isOwnMessage ? 'hover:bg-blue-500/30' : 'hover:bg-gray-600/50'}`}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                      )
                    })}
                    <div ref={chatEndRef} />
                  </div>
                </ScrollArea>

                {/* Modern Chat Input */}
                <div className="p-6 border-t border-gray-700/50 bg-gray-800/30">
                  <div className="space-y-4">
                    {/* File upload area */}
                    <div 
                      className="border-2 border-dashed border-gray-600/50 rounded-xl p-4 text-center hover:border-gray-500/70 hover:bg-gray-800/50 transition-all duration-200 cursor-pointer group"
                      onClick={() => fileInputRef.current?.click()}
                      onDrop={(e: React.DragEvent<HTMLDivElement>) => {
                        e.preventDefault()
                        const file = e.dataTransfer.files[0]
                        if (file) handleFileUpload(file)
                      }}
                      onDragOver={(e: React.DragEvent<HTMLDivElement>) => e.preventDefault()}
                    >
                      <Upload className="h-6 w-6 text-gray-400 group-hover:text-gray-300 mx-auto mb-2 transition-colors" />
                      <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">Drop files here or click to upload</p>
                      <p className="text-xs text-gray-500 mt-1">Max 10MB • Images, documents, etc.</p>
                    </div>
                    
                    {/* Text input */}
                    <div className="flex space-x-3">
                      <div className="flex-1 relative">
                        <Input
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Type a message..."
                          className="bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-400 rounded-xl pl-4 pr-4 py-3 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25"
                          onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault()
                              handleSendMessage()
                            }
                          }}
                          disabled={isCallEnding || isUploading || !isChatInitialized}
                        />
                      </div>
                      <Button
                        size="sm"
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim() || isCallEnding || isUploading || !isChatInitialized}
                        className="bg-blue-600 hover:bg-blue-700 px-4 py-3 rounded-xl shadow-lg transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                      >
                        {isUploading ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Send className="h-5 w-5" />
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

        {/* Whiteboard */}
        <Whiteboard
          sessionId={sessionId}
          userRole={userRole}
          currentUser={currentUser}
          isVisible={showWhiteboard}
          onClose={() => setShowWhiteboard(false)}
        />
      </div>
    </div>
  )
}