// @refresh reset

"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRealTimeTimer } from "@/lib/hooks/useRealTimeTimer"
import { Video, VideoOff, Mic, MicOff, PhoneOff, Monitor, MessageCircle, Edit3 } from "lucide-react"

import { Whiteboard } from "../whiteboard/Whiteboard"
import Logo from "../ui/logo"

interface VideoCallRoomProps {
  sessionId: string
  sessionData: {
    id: number
    scheduledDate: string
    startTime: string
    endTime: string
    status: string
    durationMinutes: number
    agoraChannelName?: string | null
    learnerJoinedAt?: string | null
    mentorJoinedAt?: string | null
  }
  userRole: "learner" | "mentor"
  currentUser: {
    firstName: string
    lastName: string
    profilePictureUrl?: string | null
    id: number
  }
  otherParticipant: {
    firstName: string
    lastName: string
    profilePictureUrl?: string | null
    title: string
    id: number
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
  hasJoinedSession = false,
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
    downlinkLoss: 0,
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

  // Chat refs for session chat (now using SSE)
  const chatInitializedRef = useRef<boolean>(false)
  const sseConnectionRef = useRef<EventSource | null>(null)
  const lastMessageTimestampRef = useRef<number>(0)

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
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
  const retryMediaCreation = useCallback(
    async (AgoraRTC: any, client: any) => {
      setIsRetryingMedia(true)
      setMediaError("")

      const mediaConfigs = [
        // Try with all features first
        {
          audio: { AEC: true, ANS: true, AGC: true },
          video: { encoderConfig: "720p_1", optimizationMode: "motion" },
          description: "high quality",
        },
        // Fallback to medium quality
        {
          audio: { AEC: true, ANS: false, AGC: true },
          video: { encoderConfig: "480p_1", optimizationMode: "motion" },
          description: "medium quality",
        },
        // Fallback to basic quality
        {
          audio: { AEC: false, ANS: false, AGC: false },
          video: { encoderConfig: "240p_1", optimizationMode: "motion" },
          description: "basic quality",
        },
        // Audio only
        {
          audio: true,
          video: null,
          description: "audio only",
        },
      ]

      // Clean up existing tracks first
      await cleanupLocalTracks()

      for (let i = 0; i < mediaConfigs.length; i++) {
        const config = mediaConfigs[i]
        try {
          console.log(`[VIDEO_CALL] Attempting media creation with ${config.description}`)

          if (config.video) {
            const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(config.audio, config.video)
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
    },
    [cleanupLocalTracks],
  )

  // Fetch session messages from API (for catching up when joining)
  const fetchSessionMessages = useCallback(async () => {
    try {
      console.log("[VIDEO_CALL] Fetching session chat history...")
      const response = await fetch(`/api/sessions/${sessionId}/chat`)
      if (response.ok) {
        const data = await response.json()
        if (data.messages && Array.isArray(data.messages)) {
          console.log(`[VIDEO_CALL] Loaded ${data.messages.length} historical messages`)
          setChatMessages(data.messages)
          // Update last message timestamp
          if (data.messages.length > 0) {
            const latestTimestamp = Math.max(...data.messages.map((m: ChatMessage) => m.timestamp))
            lastMessageTimestampRef.current = latestTimestamp
          }
        }
      }
    } catch (error) {
      console.warn("[VIDEO_CALL] Failed to fetch session messages:", error)
      // Not critical - user can still send/receive new messages
    }
  }, [sessionId])

  // Connect to SSE for real-time chat messages
  const connectToSSE = useCallback(() => {
    if (sseConnectionRef.current) {
      console.log("[VIDEO_CALL] SSE already connected")
      return
    }

    console.log("[VIDEO_CALL] Connecting to SSE for real-time chat...")

    try {
      const eventSource = new EventSource('/api/sse/session-updates')
      sseConnectionRef.current = eventSource

      eventSource.onopen = () => {
        console.log("[VIDEO_CALL] SSE connection opened")
      }

      eventSource.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data)

          // Handle chat messages for this session
          if (data.type === 'chat_message' && data.sessionId === parseInt(sessionId)) {
            console.log("[VIDEO_CALL] Received chat message via SSE:", data.message)

            const newMessage = data.message

            setChatMessages((prev: ChatMessage[]) => {
              // Check if message already exists
              if (prev.find(m => m.id === newMessage.id)) {
                return prev
              }
              return [...prev, newMessage].sort((a, b) => a.timestamp - b.timestamp)
            })

            // Update last message timestamp
            lastMessageTimestampRef.current = newMessage.timestamp

            // Update unread count if sidebar is closed
            if (!showSidebar) {
              setUnreadCount((prev: number) => prev + 1)
            }
          }
        } catch (error) {
          console.error("[VIDEO_CALL] Error parsing SSE message:", error)
        }
      })

      eventSource.onerror = (error) => {
        console.error("[VIDEO_CALL] SSE connection error:", error)
        // SSE will automatically reconnect
      }
    } catch (error) {
      console.error("[VIDEO_CALL] Failed to connect to SSE:", error)
    }
  }, [sessionId, showSidebar])

  // Disconnect from SSE
  const disconnectFromSSE = useCallback(() => {
    if (sseConnectionRef.current) {
      console.log("[VIDEO_CALL] Disconnecting from SSE")
      sseConnectionRef.current.close()
      sseConnectionRef.current = null
    }
  }, [])

  // Initialize session chat (using SSE for real-time updates)
  const initializeSessionChat = useCallback(async () => {
    if (chatInitializedRef.current || isCleaningUpRef.current) {
      console.log("[VIDEO_CALL] Chat already initialized or cleaning up, skipping...")
      return
    }

    console.log("[VIDEO_CALL] ===== STARTING CHAT INITIALIZATION (SSE MODE) =====")
    console.log("[VIDEO_CALL] Session ID:", sessionId)

    // CRITICAL: Mark as initialized IMMEDIATELY to enable chat UI
    setIsChatInitialized(true)
    chatInitializedRef.current = true
    console.log("[VIDEO_CALL] Chat enabled - users can now send messages")

    // Fetch initial messages (non-blocking)
    fetchSessionMessages()
      .then(() => {
        console.log("[VIDEO_CALL] Initial messages loaded")
      })
      .catch((error) => {
        console.warn("[VIDEO_CALL] Failed to fetch initial messages, but chat still enabled:", error)
      })

    // Connect to SSE for real-time messages
    console.log("[VIDEO_CALL] Connecting to SSE for real-time chat...")
    connectToSSE()

    console.log("[VIDEO_CALL] ===== CHAT READY =====")
  }, [sessionId, fetchSessionMessages, connectToSSE])

  // Cleanup session chat
  const cleanupSessionChat = useCallback(() => {
    console.log("[VIDEO_CALL] Cleaning up session chat...")

    try {
      // Disconnect from SSE
      disconnectFromSSE()

      // Reset state
      setIsChatInitialized(false)
      chatInitializedRef.current = false

      // Clear all chat messages (ephemeral session chat)
      setChatMessages([])
      setUnreadCount(0)

      console.log("[VIDEO_CALL] Session chat cleanup completed")
    } catch (error) {
      console.error("[VIDEO_CALL] Error during session chat cleanup:", error)
    }
  }, [disconnectFromSSE])

  // Comprehensive cleanup function
  const performCleanup = useCallback(
    async (reason = "component_cleanup") => {
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

        // Clean up session chat
        cleanupSessionChat()

        // Clean up Agora client
        if (agoraClientRef.current && hasJoinedChannelRef.current) {
          try {
            await agoraClientRef.current.leave()
            console.log("[VIDEO_CALL] Left Agora channel during cleanup")
            hasJoinedChannelRef.current = false

            // Wait a moment for cleanup to propagate
            await new Promise((resolve) => setTimeout(resolve, 1000))
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
    },
    [cleanupLocalTracks, cleanupSessionChat],
  )

  // Handle leaving the call
  const handleLeaveCall = useCallback(
    async (reason = "user_action") => {
      if (isCallEnding) return

      setIsCallEnding(true)
      console.log("[VIDEO_CALL] Leaving call with reason:", reason)

      // Call the leave API before cleanup (unless it's a page refresh)
      const isPageRefresh = reason === "page_refresh" || reason === "beforeunload"

      if (hasJoinedSession && !hasCalledLeaveRef.current && !isPageRefresh) {
        hasCalledLeaveRef.current = true
        try {
          await fetch(`/api/sessions/${sessionId}/leave`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              reason,
              isPageRefresh: false,
            }),
          })
          console.log("[VIDEO_CALL] Successfully left session via API")
        } catch (error) {
          console.warn("[VIDEO_CALL] Leave API not available (demo mode):", error)
          // Continue with cleanup even if API call fails
        }
      }

      // Perform cleanup
      await performCleanup(reason)

      // Call the parent callback
      onLeaveCall(reason)
    },
    [sessionId, hasJoinedSession, performCleanup, onLeaveCall, isCallEnding],
  )

  // Session timer with proper cleanup
  const sessionTimer = useRealTimeTimer({
    startTime: sessionStart,
    endTime: sessionEnd,
    onTimeExpired: () => {
      // Clear chat messages when session ends
      setChatMessages([])
      setUnreadCount(0)
      handleLeaveCall("session_ended")
    },
  })

  // Connection retry logic
  const attemptReconnection = useCallback(async () => {
    if (connectionRetryCount >= 3 || isCleaningUpRef.current || isCallEnding) {
      console.log("[VIDEO_CALL] Max reconnection attempts reached or call ending")
      onConnectionError("Unable to reconnect to the video call")
      return
    }

    setConnectionRetryCount((prev) => prev + 1)
    setConnectionState("reconnecting")

    console.log(`[VIDEO_CALL] Attempting reconnection ${connectionRetryCount + 1}/3`)

    try {
      // Clean up existing connection first
      if (agoraClientRef.current && hasJoinedChannelRef.current) {
        await agoraClientRef.current.leave()
        hasJoinedChannelRef.current = false
      }

      // Wait a moment before reconnecting
      await new Promise((resolve) => setTimeout(resolve, 2000))

      if (isCleaningUpRef.current || isCallEnding) return

      // Rejoin the channel
      const actualUid = await agoraClientRef.current.join(
        agoraConfig.appId,
        agoraConfig.channel,
        agoraConfig.token,
        agoraConfig.uid,
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

      const isReconnection = sessionStorage.getItem(`agora_connected_${sessionId}`) === "true"
      if (isReconnection) {
        console.log("[VIDEO_CALL] Detected reconnection scenario")
        // Clear the flag with minimal delay
        sessionStorage.removeItem(`agora_connected_${sessionId}`)
        await new Promise((resolve) => setTimeout(resolve, 500))
      }

      isInitializingRef.current = true

      try {
        console.log("[VIDEO_CALL] Initializing Agora SDK...")
        console.log("[VIDEO_CALL] Note: Join timestamp was already recorded when entering waiting room")

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
          role: "host",
        })

        agoraClientRef.current = client

        // Event listeners
        client.on("user-published", async (user: any, mediaType: "video" | "audio") => {
          try {
            console.log(`[VIDEO_CALL] User published ${mediaType}:`, user.uid)
            await client.subscribe(user, mediaType)

            if (mediaType === "video" && user.videoTrack) {
              // Check if this is screen sharing based on video track characteristics
              const isScreenShare =
                user.videoTrack._trackMediaType === "screentrack" ||
                user.videoTrack.isScreenTrack ||
                (user.videoTrack.getMediaStreamTrack &&
                  user.videoTrack.getMediaStreamTrack().getSettings().displaySurface)

              setIsRemoteVideoVisible(true)
              setIsRemoteScreenSharing(isScreenShare)

              if (remoteVideoRef.current) {
                user.videoTrack.play(remoteVideoRef.current)
              }

              console.log(`[VIDEO_CALL] Remote ${isScreenShare ? "screen share" : "camera"} started`)
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
              initializeSessionChat()
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
              agoraConfig.uid,
            )

            hasJoinedChannelRef.current = true
            console.log(`[VIDEO_CALL] Successfully joined channel with UID: ${actualUid}`)
            sessionStorage.setItem(`agora_connected_${sessionId}`, "true")
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
              await new Promise((resolve) => setTimeout(resolve, 1000))
              continue
            }

            if (error.code === "INVALID_CHANNEL_NAME") {
              throw new Error("Invalid channel configuration. Please contact support.")
            }

            if (joinAttempts >= maxJoinAttempts) {
              throw new Error(
                `Failed to join after ${maxJoinAttempts} attempts: ${error.message || error.code || "Unknown error"}`,
              )
            }

            // Wait before retry with exponential backoff
            await new Promise((resolve) => setTimeout(resolve, 1000 * joinAttempts))
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
            downlinkLoss: stats.downlinkNetworkQuality || 0,
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

        // Initialize chat immediately after successful Agora connection
        if (!chatInitializedRef.current && !isCleaningUpRef.current && !isCallEnding) {
          console.log("[VIDEO_CALL] Initializing chat immediately after Agora connection")
          // Initialize chat immediately without delay
          initializeSessionChat().catch((error) => {
            console.error("[VIDEO_CALL] Chat initialization error:", error)
            // Still mark as initialized to prevent users from being blocked
            setIsChatInitialized(true)
            chatInitializedRef.current = true
          })
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
        onConnectionError(
          `Failed to connect to video call: ${error instanceof Error ? error.message : "Unknown error"}`,
        )
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

    window.addEventListener("beforeunload", handleBeforeUnload)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      performCleanup("component_unmount")
    }
  }, [
    agoraConfig,
    sessionId,
    onConnectionError,
    attemptReconnection,
    performCleanup,
    isCallEnding,
    pingSession,
    retryMediaCreation,
    initializeSessionChat,
  ])

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
              optimizationMode: "motion",
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
        console.log(`[VIDEO_CALL] Audio ${newState ? "enabled" : "disabled"}`)
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
      setMediaError("Unable to start screen sharing. Please wait for the video call to fully initialize.")
      setTimeout(() => setMediaError(null), 3000)
      return
    }

    if (isInitializingRef.current) {
      console.warn("[VIDEO_CALL] Agora still initializing, cannot start screen share yet")
      setMediaError("Video call is still connecting. Please wait a moment and try again.")
      setTimeout(() => setMediaError(null), 3000)
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
              optimizationMode: "motion",
            })

            localTracksRef.current.videoTrack = videoTrack

            if (localVideoRef.current) {
              videoTrack.play(localVideoRef.current)
            }

            // Wait a moment before publishing to avoid conflicts
            await new Promise((resolve) => setTimeout(resolve, 500))
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
            optimizationMode: "detail",
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
          if (!screenTrack || typeof screenTrack.play !== "function") {
            console.error("[VIDEO_CALL] Invalid screen track received")
            throw new Error("Invalid screen track created")
          }
        } catch (screenError: any) {
          console.error("[VIDEO_CALL] Screen share creation failed:", screenError)

          // Handle specific error cases based on error properties
          const errorName = screenError.name || screenError.code || ""
          const errorMessage = screenError.message || ""
          const errorCode = screenError.code || ""

          // Check for various forms of permission denied or user cancellation
          const isPermissionDenied =
            errorName.includes("NotAllowedError") ||
            errorMessage.includes("Permission denied") ||
            errorMessage.includes("denied by user") ||
            errorCode === "PERMISSION_DENIED" ||
            errorName.includes("PERMISSION_DENIED")

          const isUserCancelled =
            errorName.includes("AbortError") ||
            errorMessage.includes("aborted") ||
            errorMessage.includes("cancelled") ||
            errorMessage.includes("User cancelled")

          const isNotSupported = errorName.includes("NotSupportedError") || errorMessage.includes("not supported")

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
          await new Promise((resolve) => setTimeout(resolve, 300))

          console.log("[VIDEO_CALL] Publishing screen track...")
          await agoraClientRef.current.publish([screenTrack])

          if (localVideoRef.current) {
            screenTrack.play(localVideoRef.current)
          }

          setIsScreenSharing(true)
          console.log("[VIDEO_CALL] Screen sharing started successfully")

          // Listen for screen share end (when user stops from browser or system)
          if (screenTrack.on && typeof screenTrack.on === "function") {
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
                    optimizationMode: "motion",
                  })

                  localTracksRef.current.videoTrack = videoTrack

                  if (localVideoRef.current) {
                    videoTrack.play(localVideoRef.current)
                  }

                  // Wait a moment before publishing to avoid conflicts
                  await new Promise((resolve) => setTimeout(resolve, 500))

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
          if (
            publishError.code === "CAN_NOT_PUBLISH_MULTIPLE_VIDEO_TRACKS" ||
            publishError.message?.includes("multiple video tracks")
          ) {
            setMediaError("Cannot publish screen share while camera is active. Please try again.")
          } else {
            setMediaError("Failed to share screen. Please try again.")
          }

          // Try to republish camera track if it was unpublished
          if (localTracksRef.current.videoTrack && isVideoEnabled) {
            try {
              await new Promise((resolve) => setTimeout(resolve, 500))
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

  // Session chat messaging - SSE-based real-time delivery
  // Supports text messages, images, and file attachments (up to 5MB)
  const sendMessage = useCallback(
    async (message: string, file?: File) => {
      if (!message.trim() && !file) return

      if (!isChatInitialized) {
        console.warn("[VIDEO_CALL] Chat not initialized yet, attempting to initialize now")
        // Try to initialize chat immediately if not already done
        if (!chatInitializedRef.current) {
          initializeSessionChat().catch(console.error)
        }
        setMediaError("Chat is initializing, please try again in a moment...")
        return
      }

      setIsUploading(!!file)

      try {
        console.log("[VIDEO_CALL] Sending message via API...")

        const currentUserName = `${currentUser.firstName} ${currentUser.lastName}`

        let attachment = undefined
        if (file) {
          // For file sharing (images and documents), convert to base64
          const reader = new FileReader()
          const fileData = await new Promise<string>((resolve) => {
            reader.onload = () => resolve(reader.result as string)
            reader.readAsDataURL(file)
          })

          attachment = {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            fileData: fileData,
          }
        }

        // Create the message object
        const sessionMessage: ChatMessage = {
          id: Date.now().toString(),
          message: file ? file.name : message.trim(),
          messageType: file ? "file" : "text",
          timestamp: Date.now(),
          senderName: currentUserName,
          senderRole: userRole,
          senderId: `${userRole}-${currentUserName}`,
          attachment: file
            ? {
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                fileData: URL.createObjectURL(file),
              }
            : undefined,
        }

        // Add to local messages immediately for sender
        setChatMessages((prev: ChatMessage[]) => {
          // Check if message already exists to avoid duplicates
          if (prev.some((msg) => msg.id === sessionMessage.id)) {
            return prev
          }
          return [...prev, sessionMessage].sort((a, b) => a.timestamp - b.timestamp)
        })

        // Send via the session chat API (stored in-memory, broadcasted via SSE)
        try {
          const response = await fetch(`/api/sessions/${sessionId}/chat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: file ? file.name : message.trim(),
              messageType: file ? "file" : "text",
              senderName: currentUserName,
              senderRole: userRole,
              attachment,
            }),
          })

          if (!response.ok) {
            throw new Error(`Failed to send message: ${response.status}`)
          }

          const result = await response.json()
          console.log("[VIDEO_CALL] Message sent successfully, stored and broadcasted via SSE:", result)

          // Update last message timestamp to prevent duplicates from SSE
          lastMessageTimestampRef.current = sessionMessage.timestamp
        } catch (apiError) {
          console.warn("[VIDEO_CALL] Session chat API failed, message only visible locally:", apiError)
          // Remove the message from local state if API fails
          setChatMessages((prev: ChatMessage[]) => prev.filter(msg => msg.id !== sessionMessage.id))
          throw apiError
        }

        setNewMessage("")
        setMediaError("")
      } catch (error) {
        console.error("[VIDEO_CALL] Failed to send message:", error)
        setMediaError(`Failed to send message: ${error instanceof Error ? error.message : "Unknown error"}`)
      } finally {
        setIsUploading(false)
      }
    },
    [userRole, currentUser, sessionId, isChatInitialized, initializeSessionChat],
  )

  const handleSendMessage = useCallback(() => {
    if (newMessage.trim()) {
      sendMessage(newMessage)
    }
  }, [newMessage, sendMessage])

  const handleFileUpload = useCallback(
    (file: File) => {
      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit for session chat (stored in-memory, ephemeral)
        setMediaError("File size must be less than 5MB")
        return
      }
      sendMessage("", file)
    },
    [sendMessage],
  )

  const downloadFile = useCallback(async (attachment: ChatAttachment) => {
    try {
      // Convert base64 data back to blob
      const response = await fetch(attachment.fileData)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = attachment.fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Failed to download file:", error)
    }
  }, [])

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatEndRef.current && showSidebar) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" })
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
      case "connected":
        return "text-green-400"
      case "connecting":
        return "text-yellow-400"
      case "reconnecting":
        return "text-orange-400"
      case "disconnected":
        return "text-red-400"
      case "failed":
        return "text-red-500"
      default:
        return "text-gray-400"
    }
  }

  const getQualityColor = (quality: CallQuality) => {
    switch (quality) {
      case "excellent":
        return "text-green-400"
      case "good":
        return "text-blue-400"
      case "fair":
        return "text-yellow-400"
      case "poor":
        return "text-red-400"
      default:
        return "text-gray-400"
    }
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  }

  const formatSessionTimeRemaining = () => {
    if ("timeRemaining" in sessionTimer) {
      const minutes = Math.floor(sessionTimer.timeRemaining / 60)
      const seconds = sessionTimer.timeRemaining % 60
      return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
    }
    return "00:00"
  }

  const formatTimeElapsed = () => {
    if ("timeElapsed" in sessionTimer) {
      const minutes = Math.floor(sessionTimer.timeElapsed / 60)
      const seconds = sessionTimer.timeElapsed % 60
      return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
    }
    return "00:00"
  }

  const getTimeRemaining = () => {
    if ("timeRemaining" in sessionTimer) {
      return sessionTimer.timeRemaining
    }
    return 0
  }

  const formatElapsedTime = () => {
    if ("timeElapsed" in sessionTimer) {
      const minutes = Math.floor(sessionTimer.timeElapsed / 60)
      const seconds = sessionTimer.timeElapsed % 60
      return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
    }
    return "00:00"
  }


  return (
    <div className="h-screen w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col overflow-hidden">
      <div className="flex-shrink-0 bg-black/20 backdrop-blur-xl border-b border-white/10 px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          {/* Session Info - Mobile Optimized */}
          <div className="flex items-center space-x-2 sm:space-x-6">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div>
                <Logo textColor="text-white" />
                <div className={`flex items-center gap-2 text-xs sm:text-sm font-medium ${getConnectionStatusColor(connectionState)}`}>
                   <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 animate-pulse shadow-lg shadow-green-400/50"></div>
                  <span>{connectionState === "connected"
                    ? "Connected"
                    : connectionState === "connecting"
                      ? "Connecting..."
                      : connectionState === "reconnecting"
                        ? "Reconnecting..."
                        : "Disconnected"}</span>
                </div>
              </div>
            </div>

            {/* Quality indicators - Hidden on mobile, shown on tablet+ */}
            <div className="hidden lg:flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-2 bg-black/30 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/20">
                <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                <span className="text-white font-medium">
                  {participants} participant{participants !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex items-center space-x-2 bg-black/30 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/20">
                <div className={`w-2 h-2 rounded-full ${getQualityColor(callQuality).replace("text-", "bg-")}`}></div>
                <span className="text-white font-medium">
                  {callQuality === "unknown" ? "Checking..." : callQuality}
                </span>
              </div>
            </div>
          </div>

          {/* Timer - Mobile Optimized */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="text-right">
              <div className="text-sm sm:text-lg font-mono font-semibold text-white">{formatElapsedTime()}</div>
              <div className="text-xs sm:text-sm text-white/70">
                {getTimeRemaining() > 0 ? `${formatSessionTimeRemaining()} left` : "Session ended"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area - Mobile Optimized */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Video Area - Full width on mobile */}
        <div className="flex-1 relative p-2 sm:p-4 lg:p-6">
          <div className="h-full w-full relative rounded-xl sm:rounded-2xl lg:rounded-3xl overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 shadow-2xl border border-white/10">
            {/* Remote Video */}
            <div className="absolute inset-0">
              <div ref={remoteVideoRef} className="w-full h-full bg-slate-800 rounded-3xl overflow-hidden" />

              {!isRemoteVideoVisible && (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                  <div className="text-center">
                    <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center shadow-2xl border border-white/10">
                      {otherParticipant.profilePictureUrl ? (
                        <img
                          src={otherParticipant.profilePictureUrl || "/placeholder.svg"}
                          alt={`${otherParticipant.firstName} ${otherParticipant.lastName}`}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <div className="text-4xl font-bold text-white/80">
                          {getInitials(otherParticipant.firstName, otherParticipant.lastName)}
                        </div>
                      )}
                    </div>
                    <h3 className="text-2xl font-semibold text-white mb-2">
                      {isRemoteScreenSharing
                        ? "Screen Sharing"
                        : `${otherParticipant.firstName} ${otherParticipant.lastName}`}
                    </h3>
                    <p className="text-white/70 mb-1">{otherParticipant.title}</p>
                    <p className="text-white/50 text-sm">
                      {isRemoteScreenSharing ? "Viewing shared screen" : "Camera is off"}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="absolute top-3 left-3 sm:top-6 sm:left-6">
              <div className="flex items-center space-x-2 sm:space-x-3 bg-black/40 backdrop-blur-xl rounded-xl sm:rounded-2xl px-2 sm:px-4 py-1.5 sm:py-2 border border-white/20">
                <div className="flex items-center space-x-1 sm:space-x-2">
                  {isRemoteAudioEnabled ? (
                    <Mic className="w-3 h-3 sm:w-4 sm:h-4 text-green-400" />
                  ) : (
                    <MicOff className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400" />
                  )}
                  <span className="text-white/90 text-xs sm:text-sm font-medium">
                    {isRemoteAudioEnabled ? "Audio On" : "Muted"}
                  </span>
                </div>
                {isRemoteVideoVisible && <div className="w-px h-3 sm:h-4 bg-white/20"></div>}
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <div className="w-4 h-4 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
                    <span className="text-xs font-semibold text-white">{otherParticipant.firstName.charAt(0)}</span>
                  </div>
                  <div className="hidden sm:block">
                    <div className="text-white/90 text-sm font-medium">
                      {otherParticipant.firstName} {otherParticipant.lastName}
                    </div>
                    <div className="text-white/60 text-xs">{otherParticipant.title}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Local video - Responsive positioning and sizing */}
            <div className="absolute bottom-3 right-3 sm:bottom-6 sm:right-6 w-24 h-18 sm:w-32 sm:h-24 md:w-48 md:h-32 lg:w-80 lg:h-48 rounded-lg sm:rounded-xl lg:rounded-2xl overflow-hidden bg-gradient-to-br from-slate-700 to-slate-800 shadow-2xl border border-white/20 backdrop-blur-sm">
              <div ref={localVideoRef} className="w-full h-full bg-slate-800 rounded-lg sm:rounded-xl lg:rounded-2xl overflow-hidden" />

              {(!isVideoEnabled || !localTracksRef.current.videoTrack) && (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-700/90 to-slate-800/90 backdrop-blur-sm">
                  <div className="text-center">
                    <div className="relative w-8 h-8 sm:w-12 sm:h-12 lg:w-16 lg:h-16 mx-auto mb-1 sm:mb-3">
                      <div className="absolute inset-0 rounded-full border-4 border-white/20"></div>
                      <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-400 animate-spin"></div>
                      <div className="absolute inset-2 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
                        {currentUser.profilePictureUrl ? (
                          <img
                            src={currentUser.profilePictureUrl || "/placeholder.svg"}
                            alt={`${currentUser.firstName} ${currentUser.lastName}`}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-bold text-white/80">
                            {getInitials(currentUser.firstName, currentUser.lastName)}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-white/90 text-xs sm:text-sm font-medium mb-1">
                      {!localTracksRef.current.videoTrack ? "Camera Unavailable" : "Camera Off"}
                    </p>
                    <p className="text-white/60 text-xs hidden sm:block">
                      {!localTracksRef.current.videoTrack
                        ? "Unable to access your camera"
                        : "Your camera is currently disabled"}
                    </p>

                    {mediaError && !localTracksRef.current.videoTrack && (
                      <button
                        onClick={handleRetryMedia}
                        disabled={isRetryingMedia}
                        className="mt-3 px-3 py-1.5 bg-blue-600/80 hover:bg-blue-700/80 disabled:bg-gray-600/50 text-white text-xs rounded-lg transition-all duration-200 backdrop-blur-sm border border-blue-500/30"
                      >
                        {isRetryingMedia ? (
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin"></div>
                            <span>Retrying...</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                              />
                            </svg>
                            <span>Retry Camera</span>
                          </div>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {isScreenSharing && (
                <div className="absolute top-3 left-3 bg-orange-500/90 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-lg font-medium border border-orange-400/50">
                  You're presenting
                </div>
              )}

              <div className="absolute bottom-3 left-3 right-3">
                <div className="bg-black/60 backdrop-blur-xl rounded-xl px-3 py-2 border border-white/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white text-sm font-medium">
                        {currentUser.firstName} {currentUser.lastName}
                      </div>
                      <div className="text-white/70 text-xs capitalize">{userRole}</div>
                    </div>
                    <div className="text-white/60 text-xs">You</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {showSidebar && (
          <div className="w-full md:w-96 bg-black/20 backdrop-blur-xl border-l border-white/10 flex flex-col md:relative absolute top-0 left-0 z-50 h-full">
            {/* Enhanced Sidebar Header - Mobile Optimized */}
            <div className="p-3 sm:p-6 border-b border-white/10">
              <div className="flex items-center justify-between mb-2 sm:mb-4">
                <h2 className="text-lg sm:text-xl font-semibold text-white">Chat & Files</h2>
                <div className="flex items-center space-x-2">
                  {/* Close button for mobile */}
                  <button
                    onClick={() => setShowSidebar(false)}
                    className="md:hidden p-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-green-400"></div>
                    <span className="text-white/70 text-sm hidden sm:inline">Chat Active</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.map((message) => {
                const currentUserId = `${userRole}-${currentUser.firstName} ${currentUser.lastName}`
                const isOwnMessage = message.senderId === currentUserId
                return (
                  <div key={message.id} className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                        isOwnMessage
                          ? "bg-blue-600/90 text-white backdrop-blur-sm border border-blue-500/30"
                          : "bg-white/10 text-white backdrop-blur-sm border border-white/20"
                      }`}
                    >
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-xs font-medium opacity-80">{message.senderName}</span>
                        <span className="text-xs opacity-60">•</span>
                        <span className="text-xs opacity-60">
                          {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      {message.messageType === "text" ? (
                        <p className="text-sm leading-relaxed">{message.message}</p>
                      ) : (
                        <div className="space-y-2">
                          {message.attachment?.fileType?.startsWith("image/") ? (
                            <div>
                              <img
                                src={message.attachment.fileData || "/placeholder.svg"}
                                alt={message.attachment.fileName}
                                className="max-w-full h-auto rounded-lg mb-2"
                              />
                              {message.attachment && (
                                <button
                                  onClick={() => downloadFile(message.attachment!)}
                                  className="text-xs text-white/80 hover:text-white underline"
                                >
                                  Download {message.attachment.fileName}
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2 p-2 bg-black/20 rounded-lg">
                                <svg
                                  className="w-4 h-4 text-white/70"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                  />
                                </svg>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-white truncate">
                                    {message.attachment?.fileName}
                                  </p>
                                  <p className="text-xs text-white/60">
                                    {message.attachment?.fileSize
                                      ? `${(message.attachment.fileSize / 1024).toFixed(1)} KB`
                                      : "Unknown size"}
                                  </p>
                                </div>
                              </div>
                              {message.attachment && (
                                <button
                                  onClick={() => downloadFile(message.attachment!)}
                                  className="w-full text-xs text-white/80 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg transition-colors flex items-center justify-center space-x-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  <span>Download File</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
              <div ref={chatEndRef} />
            </div>

            {/* File Upload Area */}
            <div className="p-4 border-t border-white/10">
              <div
                className="border-2 border-dashed border-white/20 rounded-xl p-4 text-center hover:border-white/40 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <svg
                  className="w-8 h-8 text-white/60 mx-auto mb-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <p className="text-white/80 text-sm font-medium">Drop files here or click to upload</p>
                <p className="text-white/60 text-xs mt-1">Max 10MB • Images, documents, etc.</p>
              </div>

              {/* Message Input */}
              <div className="flex items-center space-x-3 mt-4">
                <div className="flex-1">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                    placeholder="Type a message..."
                    className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || isUploading}
                  className="p-3 bg-blue-600/90 hover:bg-blue-700/90 disabled:bg-gray-600/50 text-white rounded-xl transition-all duration-200 backdrop-blur-sm border border-blue-500/30 hover:scale-105"
                >
                  {isUploading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFileUpload(file)
              }}
            />
          </div>
        )}
      </div>

      <div className="flex-shrink-0 bg-black/20 backdrop-blur-xl border-t border-white/10 px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-center space-x-2 sm:space-x-4">
          {/* Video Control - Mobile Optimized */}
          <button
            onClick={toggleVideo}
            disabled={isCallEnding}
            className={`group relative p-2 sm:p-3 lg:p-4 rounded-xl sm:rounded-2xl transition-all duration-300 hover:scale-110 hover:shadow-2xl border backdrop-blur-sm ${
              isVideoEnabled && localTracksRef.current.videoTrack
                ? "bg-gray-700/80 hover:bg-gray-600/80 border-gray-600/50 text-white"
                : "bg-red-600/90 hover:bg-red-700/90 border-red-500/50 text-white"
            }`}
            title={isVideoEnabled && localTracksRef.current.videoTrack ? "Turn off camera" : "Turn on camera"}
          >
            {isVideoEnabled && localTracksRef.current.videoTrack ? (
              <Video className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
            ) : (
              <VideoOff className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
            )}
            <div className="absolute -top-8 sm:-top-12 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              {isVideoEnabled && localTracksRef.current.videoTrack ? "Turn off camera" : "Turn on camera"}
            </div>
          </button>

          {/* Audio Control */}
          <button
            onClick={toggleAudio}
            disabled={isCallEnding}
            className={`group relative p-2 sm:p-3 lg:p-4 rounded-xl sm:rounded-2xl transition-all duration-300 hover:scale-110 hover:shadow-2xl border backdrop-blur-sm ${
              isAudioEnabled
                ? "bg-gray-700/80 hover:bg-gray-600/80 border-gray-600/50 text-white"
                : "bg-red-600/90 hover:bg-red-700/90 border-red-500/50 text-white"
            }`}
            title={isAudioEnabled ? "Mute" : "Unmute"}
          >
            {isAudioEnabled ? (
              <Mic className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
            ) : (
              <MicOff className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
            )}
            <div className="absolute -top-8 sm:-top-12 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              {isAudioEnabled ? "Mute" : "Unmute"}
            </div>
          </button>

          {/* Screen Share Control */}
          <button
            onClick={toggleScreenShare}
            disabled={isCallEnding || isRemoteScreenSharing}
            className={`group relative p-2 sm:p-3 lg:p-4 rounded-xl sm:rounded-2xl transition-all duration-300 border backdrop-blur-sm ${
              isScreenSharing
                ? "bg-orange-600/90 hover:bg-orange-700/90 border-orange-500/50 text-white hover:scale-110 hover:shadow-2xl"
                : isRemoteScreenSharing
                  ? "bg-orange-600/90 hover:bg-orange-700/90 border-orange-500/50 text-white opacity-50 cursor-not-allowed backdrop-blur-sm"
                  : "bg-gray-700/80 hover:bg-gray-600/80 border-gray-600/50 text-white backdrop-blur-sm hover:scale-110 hover:shadow-2xl"
            }`}
            title={isScreenSharing ? "Stop sharing" : isRemoteScreenSharing ? "Other is sharing" : "Share screen"}
          >
            <Monitor className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
            {isScreenSharing && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-400 rounded-full animate-pulse">
                <div className="absolute inset-0 bg-orange-400 rounded-full animate-ping"></div>
              </div>
            )}
            <div className="absolute -top-8 sm:-top-12 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              {isScreenSharing ? "Stop sharing" : isRemoteScreenSharing ? "Other is sharing" : "Share screen"}
            </div>
          </button>

          {/* Chat Control */}
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className={`group relative p-2 sm:p-3 lg:p-4 rounded-xl sm:rounded-2xl transition-all duration-300 hover:scale-110 hover:shadow-2xl border backdrop-blur-sm ${
              showSidebar
                ? "bg-blue-600/90 hover:bg-blue-700/90 border-blue-500/50 text-white"
                : "bg-gray-700/80 hover:bg-gray-600/80 border-gray-600/50 text-white backdrop-blur-sm"
            }`}
            title={showSidebar ? "Hide chat" : "Show chat"}
          >
            <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
            {unreadCount > 0 && !showSidebar && (
              <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold animate-pulse">
                {unreadCount > 99 ? "99+" : unreadCount}
              </div>
            )}
            <div className="absolute -top-8 sm:-top-12 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              {showSidebar ? "Hide chat" : "Show chat"}
            </div>
          </button>

          {/* Whiteboard Control */}
          <button
            onClick={() => setShowWhiteboard(!showWhiteboard)}
            className={`group relative p-2 sm:p-3 lg:p-4 rounded-xl sm:rounded-2xl transition-all duration-300 hover:scale-110 hover:shadow-2xl border backdrop-blur-sm ${
              showWhiteboard
                ? "bg-purple-600/90 hover:bg-purple-700/90 border-purple-500/50 text-white"
                : "bg-gray-700/80 hover:bg-gray-600/80 border-gray-600/50 text-white backdrop-blur-sm"
            }`}
            title={showWhiteboard ? "Hide whiteboard" : "Show whiteboard"}
          >
            <Edit3 className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
            {showWhiteboard && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-400 rounded-full animate-pulse">
                <div className="absolute inset-0 bg-purple-400 rounded-full animate-ping"></div>
              </div>
            )}
            <div className="absolute -top-8 sm:-top-12 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              {showWhiteboard ? "Hide whiteboard" : "Show whiteboard"}
            </div>
          </button>

          {/* Separator */}
          <div className="w-px h-8 bg-white/20"></div>

          {/* Enhanced Leave Call Button */}
          <button
            onClick={() => handleLeaveCall("user_action")}
            disabled={isCallEnding}
            className="group relative p-2 sm:p-3 lg:p-4 rounded-xl sm:rounded-2xl bg-red-600/90 hover:bg-red-700/90 border border-red-500/50 text-white transition-all duration-300 hover:scale-110 hover:shadow-2xl backdrop-blur-sm"
            title="End call"
          >
            <PhoneOff className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
            <div className="absolute -top-8 sm:-top-12 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              End call
            </div>
          </button>
        </div>

        {/* Enhanced Network Stats */}
        {networkStats.rtt > 0 && (
          <div className="flex items-center justify-center space-x-6 mt-4 text-xs text-white/60">
            <div className="flex items-center space-x-4 bg-white/5 backdrop-blur-sm rounded-full px-4 py-2 border border-white/10">
              <div className="flex items-center space-x-1">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                <span>Latency: {networkStats.rtt}ms</span>
              </div>
              <div className="w-px h-3 bg-white/20"></div>
              <div className="flex items-center space-x-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                <span>Upload: {networkStats.uplinkLoss}% loss</span>
              </div>
            </div>
            <div className="flex items-center space-x-4 bg-white/5 backdrop-blur-sm rounded-full px-4 py-2 border border-white/10">
              <div className="flex items-center space-x-1">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-400"></div>
                <span>Download: {networkStats.downlinkLoss}% loss</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modern Media Error Alert */}
      {mediaError && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-red-600/90 backdrop-blur-xl text-white px-6 py-4 rounded-2xl shadow-2xl border border-red-500/50 max-w-md">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-red-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-red-100">Media Issue</h3>
                <p className="text-red-200 text-sm mt-1">{mediaError}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modern Low Time Warning */}
      {getTimeRemaining() > 0 && getTimeRemaining() <= 300 && (
        <div className="absolute top-20 right-6 z-50">
          <div className="bg-orange-600/90 backdrop-blur-xl text-white px-6 py-4 rounded-2xl shadow-2xl border border-orange-500/50">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <svg
                  className="w-6 h-6 text-orange-200 animate-pulse"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-orange-100">Session Ending Soon</h3>
                <p className="text-orange-200 text-sm mt-1">{formatSessionTimeRemaining()} remaining</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Whiteboard Integration */}
      {showWhiteboard && (
        <Whiteboard
          sessionId={sessionId}
          userRole={userRole}
          currentUser={currentUser}
          isVisible={showWhiteboard}
          onClose={() => setShowWhiteboard(false)}
        />
      )}

    </div>
  )
}