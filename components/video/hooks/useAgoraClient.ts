"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import AgoraRTC, { 
  IAgoraRTCClient, 
  IAgoraRTCRemoteUser, 
  ICameraVideoTrack, 
  IMicrophoneAudioTrack,
  ConnectionState,
  NetworkQuality
} from "agora-rtc-sdk-ng"

export interface AgoraConfig {
  appId: string
  channel: string
  token: string
  uid: number
}

export interface UseAgoraClientOptions {
  onUserJoined?: (user: IAgoraRTCRemoteUser) => void
  onUserLeft?: (user: IAgoraRTCRemoteUser) => void
  onConnectionStateChanged?: (state: ConnectionState) => void
  onNetworkQuality?: (quality: NetworkQuality) => void
  maxParticipants?: number
}

export interface UseAgoraClientReturn {
  client: IAgoraRTCClient | null
  localVideoTrack: ICameraVideoTrack | null
  localAudioTrack: IMicrophoneAudioTrack | null
  remoteUsers: IAgoraRTCRemoteUser[]
  isConnected: boolean
  isVideoEnabled: boolean
  isAudioEnabled: boolean
  connectionState: ConnectionState
  networkQuality: NetworkQuality | null
  participantCount: number
  error: string | null
  
  // Actions
  join: (config: AgoraConfig) => Promise<void>
  leave: () => Promise<void>
  toggleVideo: () => Promise<void>
  toggleAudio: () => Promise<void>
  reconnect: () => Promise<void>
}

export function useAgoraClient({
  onUserJoined,
  onUserLeft,
  onConnectionStateChanged,
  onNetworkQuality,
  maxParticipants = 2
}: UseAgoraClientOptions = {}): UseAgoraClientReturn {
  const [client, setClient] = useState<IAgoraRTCClient | null>(null)
  const [localVideoTrack, setLocalVideoTrack] = useState<ICameraVideoTrack | null>(null)
  const [localAudioTrack, setLocalAudioTrack] = useState<IMicrophoneAudioTrack | null>(null)
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [connectionState, setConnectionState] = useState<ConnectionState>("DISCONNECTED")
  const [networkQuality, setNetworkQuality] = useState<NetworkQuality | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const configRef = useRef<AgoraConfig | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 3

  // Initialize Agora client
  useEffect(() => {
    const agoraClient = AgoraRTC.createClient({
      mode: "rtc",
      codec: "vp8"
    })

    // Set up event listeners
    agoraClient.on("user-published", async (user, mediaType) => {
      try {
        await agoraClient.subscribe(user, mediaType)
        
        if (mediaType === "video") {
          const remoteVideoTrack = user.videoTrack
          if (remoteVideoTrack) {
            // Video track is ready to be played
            console.log(`[AGORA] Subscribed to user ${user.uid} video track`)
          }
        }
        
        if (mediaType === "audio") {
          const remoteAudioTrack = user.audioTrack
          if (remoteAudioTrack) {
            // Audio track will play automatically
            console.log(`[AGORA] Subscribed to user ${user.uid} audio track`)
          }
        }

        // Update remote users list
        setRemoteUsers(prevUsers => {
          const existingIndex = prevUsers.findIndex(u => u.uid === user.uid)
          if (existingIndex >= 0) {
            const updatedUsers = [...prevUsers]
            updatedUsers[existingIndex] = user
            return updatedUsers
          } else {
            return [...prevUsers, user]
          }
        })

        onUserJoined?.(user)
      } catch (error) {
        console.error(`[AGORA] Failed to subscribe to user ${user.uid}:`, error)
      }
    })

    agoraClient.on("user-unpublished", (user, mediaType) => {
      console.log(`[AGORA] User ${user.uid} unpublished ${mediaType}`)
      
      // Update remote users list
      setRemoteUsers(prevUsers => 
        prevUsers.map(u => u.uid === user.uid ? user : u)
      )
    })

    agoraClient.on("user-left", (user) => {
      console.log(`[AGORA] User ${user.uid} left the channel`)
      
      setRemoteUsers(prevUsers => 
        prevUsers.filter(u => u.uid !== user.uid)
      )
      
      onUserLeft?.(user)
    })

    agoraClient.on("connection-state-change", (curState) => {
      console.log(`[AGORA] Connection state changed to: ${curState}`)
      setConnectionState(curState)
      setIsConnected(curState === "CONNECTED")
      
      onConnectionStateChanged?.(curState)

      // Handle reconnection logic
      if (curState === "DISCONNECTED" && configRef.current && reconnectAttemptsRef.current < maxReconnectAttempts) {
        setTimeout(() => {
          reconnectAttemptsRef.current++
          console.log(`[AGORA] Attempting reconnection (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`)
          join(configRef.current!)
        }, 2000 * reconnectAttemptsRef.current) // Exponential backoff
      }
    })

    agoraClient.on("network-quality", (stats) => {
      setNetworkQuality(stats.uplinkNetworkQuality)
      onNetworkQuality?.(stats.uplinkNetworkQuality)
    })

    agoraClient.on("exception", (event) => {
      console.error("[AGORA] Exception:", event)
      setError(event.msg || "Agora client exception occurred")
    })

    setClient(agoraClient)

    return () => {
      agoraClient.removeAllListeners()
    }
  }, [onUserJoined, onUserLeft, onConnectionStateChanged, onNetworkQuality])

  const join = useCallback(async (config: AgoraConfig) => {
    if (!client) {
      setError("Agora client not initialized")
      return
    }

    try {
      setError(null)
      configRef.current = config
      
      console.log(`[AGORA] Joining channel: ${config.channel}`)

      // Check if already connected to prevent double join
      if (connectionState === "CONNECTED" || connectionState === "CONNECTING") {
        console.log("[AGORA] Already connected or connecting, skipping join")
        return
      }

      // Join the channel
      await client.join(config.appId, config.channel, config.token, config.uid)
      
      console.log(`[AGORA] Successfully joined channel with UID: ${config.uid}`)

      // Create and publish local tracks
      const [videoTrack, audioTrack] = await Promise.all([
        AgoraRTC.createCameraVideoTrack({
          encoderConfig: {
            width: 640,
            height: 480,
            frameRate: 30,
            bitrateMin: 400,
            bitrateMax: 1000,
          }
        }),
        AgoraRTC.createMicrophoneAudioTrack({
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        })
      ])

      setLocalVideoTrack(videoTrack)
      setLocalAudioTrack(audioTrack)

      // Publish tracks if they should be enabled
      const tracksToPublish = []
      if (isVideoEnabled) tracksToPublish.push(videoTrack)
      if (isAudioEnabled) tracksToPublish.push(audioTrack)

      if (tracksToPublish.length > 0) {
        await client.publish(tracksToPublish)
        console.log("[AGORA] Published local tracks")
      }

      reconnectAttemptsRef.current = 0 // Reset reconnect attempts on successful join
      
    } catch (error: any) {
      console.error("[AGORA] Failed to join channel:", error)
      
      // Handle specific error cases
      if (error.code === "INVALID_TOKEN") {
        setError("Invalid token. Please refresh and try again.")
      } else if (error.code === "TOKEN_EXPIRED") {
        setError("Token expired. Please refresh and try again.")
      } else if (error.code === "DUPLICATE_CONNECTION") {
        setError("You are already connected from another device/tab.")
      } else {
        setError(`Failed to join video call: ${error.message || 'Unknown error'}`)
      }
      
      throw error
    }
  }, [client, isVideoEnabled, isAudioEnabled, connectionState])

  const leave = useCallback(async () => {
    if (!client) return

    try {
      console.log("[AGORA] Leaving channel")
      
      // Stop and close local tracks
      if (localVideoTrack) {
        localVideoTrack.stop()
        localVideoTrack.close()
        setLocalVideoTrack(null)
      }
      
      if (localAudioTrack) {
        localAudioTrack.stop()
        localAudioTrack.close()
        setLocalAudioTrack(null)
      }

      // Leave the channel
      await client.leave()
      
      setRemoteUsers([])
      setIsConnected(false)
      setConnectionState("DISCONNECTED")
      setError(null)
      configRef.current = null
      reconnectAttemptsRef.current = 0
      
      console.log("[AGORA] Successfully left channel")
      
    } catch (error: any) {
      console.error("[AGORA] Failed to leave channel:", error)
      setError(`Failed to leave video call: ${error.message}`)
    }
  }, [client, localVideoTrack, localAudioTrack])

  const toggleVideo = useCallback(async () => {
    if (!localVideoTrack || !client) return

    try {
      if (isVideoEnabled) {
        await localVideoTrack.setEnabled(false)
        console.log("[AGORA] Video disabled")
      } else {
        await localVideoTrack.setEnabled(true)
        console.log("[AGORA] Video enabled")
      }
      setIsVideoEnabled(!isVideoEnabled)
    } catch (error: any) {
      console.error("[AGORA] Failed to toggle video:", error)
      setError(`Failed to toggle video: ${error.message}`)
    }
  }, [localVideoTrack, client, isVideoEnabled])

  const toggleAudio = useCallback(async () => {
    if (!localAudioTrack || !client) return

    try {
      if (isAudioEnabled) {
        await localAudioTrack.setEnabled(false)
        console.log("[AGORA] Audio disabled")
      } else {
        await localAudioTrack.setEnabled(true)
        console.log("[AGORA] Audio enabled")
      }
      setIsAudioEnabled(!isAudioEnabled)
    } catch (error: any) {
      console.error("[AGORA] Failed to toggle audio:", error)
      setError(`Failed to toggle audio: ${error.message}`)
    }
  }, [localAudioTrack, client, isAudioEnabled])

  const reconnect = useCallback(async () => {
    if (!configRef.current) {
      setError("No configuration available for reconnection")
      return
    }

    try {
      console.log("[AGORA] Manual reconnection requested")
      await leave()
      setTimeout(() => {
        join(configRef.current!)
      }, 1000)
    } catch (error: any) {
      console.error("[AGORA] Manual reconnection failed:", error)
      setError(`Reconnection failed: ${error.message}`)
    }
  }, [leave, join])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (client && connectionState !== "DISCONNECTED") {
        leave()
      }
    }
  }, [client, connectionState, leave])

  const participantCount = remoteUsers.length + (isConnected ? 1 : 0)

  return {
    client,
    localVideoTrack,
    localAudioTrack,
    remoteUsers,
    isConnected,
    isVideoEnabled,
    isAudioEnabled,
    connectionState,
    networkQuality,
    participantCount,
    error,
    
    join,
    leave,
    toggleVideo,
    toggleAudio,
    reconnect
  }
}