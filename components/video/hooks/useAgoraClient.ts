import { useCallback, useRef } from "react"
import { toast } from "@/lib/toast"
import { CallState, TokenResponse, MediaType, toSafeError } from "../types"
import { VideoCallLogger } from "../utils/logger"

interface UseAgoraClientProps {
  sessionId: string
  callState: CallState
  setCallState: React.Dispatch<React.SetStateAction<CallState>>
  localVideoRef: React.RefObject<HTMLDivElement | null>
  remoteVideoRef: React.RefObject<HTMLDivElement | null>
  callStartTimeRef: React.MutableRefObject<Date | null>
  sessionAccessData: any
  trackSessionJoin: () => Promise<any>
}

export function useAgoraClient({
  sessionId,
  callState,
  setCallState,
  localVideoRef,
  remoteVideoRef,
  callStartTimeRef,
  sessionAccessData,
  trackSessionJoin,
}: UseAgoraClientProps) {
  const clientRef = useRef<any>(null)
  const localVideoTrackRef = useRef<any>(null)
  const localAudioTrackRef = useRef<any>(null)
  const screenTrackRef = useRef<any>(null)

  const safePublish = useCallback(async (tracks: any[], retryCount = 0): Promise<void> => {
    if (!clientRef.current) {
      throw new Error("Client not initialized")
    }

    try {
      await clientRef.current.publish(tracks)
    } catch (error: unknown) {
      const safeError = toSafeError(error)
      if (safeError.message?.includes("haven't joined yet") && retryCount < 3) {
        VideoCallLogger.log(`Publish retry ${retryCount + 1}/3 after connection delay`)
        await new Promise(resolve => setTimeout(resolve, 500))
        return safePublish(tracks, retryCount + 1)
      }
      throw error
    }
  }, [])

  const setupEventListeners = useCallback((client: any) => {
    client.on("user-published", async (user: any, mediaType: MediaType) => {
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
            VideoCallLogger.log(`New user joined: UID ${user.uid}, mediaType: ${mediaType}`)
            const newCount = prev.participantCount + 1
            VideoCallLogger.log(`Participant count: ${prev.participantCount} -> ${newCount}`)
            return {
              ...prev,
              participantCount: newCount,
              remoteUsers: [...prev.remoteUsers, user]
            }
          } else {
            VideoCallLogger.log(`Existing user published ${mediaType}: UID ${user.uid}`)
          }
          return prev
        })

        const isNewUser = !callState.remoteUsers.some(u => u.uid === user.uid)
        if (isNewUser && mediaType === 'video') {
          toast.success("Participant joined the call")
        }
      } catch (error) {
        VideoCallLogger.error("Error handling user published", error)
      }
    })

    client.on("user-unpublished", (user: any, mediaType: MediaType) => {
      if (mediaType === "video") {
        user.videoTrack?.stop()
      }
      toast.info("Participant stopped sharing media")
    })

    client.on("user-left", (user: any) => {
      setCallState((prev) => {
        const newCount = Math.max(0, prev.participantCount - 1)
        VideoCallLogger.log(`User left: UID ${user.uid}`)
        VideoCallLogger.log(`Participant count: ${prev.participantCount} -> ${newCount}`)
        return {
          ...prev,
          participantCount: newCount,
          remoteUsers: prev.remoteUsers.filter(u => u.uid !== user.uid)
        }
      })
      toast.info("Participant left the call")
    })

    client.on("connection-state-change", (curState: string) => {
      VideoCallLogger.log(`Connection state changed: ${curState}`)

      if (curState === "CONNECTED") {
        setCallState((prev) => ({
          ...prev,
          isConnected: true,
          isReconnecting: false,
          connectionLost: false
        }))

        if (!callStartTimeRef.current && sessionAccessData?.sessionDetails) {
          if (sessionAccessData.sessionDetails.agoraCallStartedAt) {
            callStartTimeRef.current = new Date(sessionAccessData.sessionDetails.agoraCallStartedAt)
          } else if (sessionAccessData.sessionDetails.scheduledDate) {
            const scheduledStart = new Date(sessionAccessData.sessionDetails.scheduledDate)
            const now = new Date()
            callStartTimeRef.current = scheduledStart.getTime() <= now.getTime() ? scheduledStart : now
          } else {
            callStartTimeRef.current = new Date()
          }
        } else if (!callStartTimeRef.current) {
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

        setTimeout(async () => {
          if (clientRef.current) {
            try {
              setCallState((prev) => ({ ...prev, isReconnecting: true }))
              const tokenData = await getTokenData()
              if (tokenData) {
                await clientRef.current.join(tokenData.appId, tokenData.channel, tokenData.token, tokenData.uid)
                VideoCallLogger.log("Automatic reconnection successful")
              }
            } catch (error) {
              VideoCallLogger.error("Automatic reconnection failed", error)
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
      const quality: "excellent" | "good" | "poor" = 
        stats.uplinkNetworkQuality > 3 ? "poor" : 
        stats.uplinkNetworkQuality > 1 ? "good" : "excellent"

      setCallState((prev) => {
        const now = new Date()
        let updatedState = { ...prev, connectionQuality: quality }

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
  }, [callState.remoteUsers, callState.connectionLost, callStartTimeRef, sessionAccessData, setCallState, remoteVideoRef])

  const getTokenData = useCallback(async (): Promise<TokenResponse | null> => {
    try {
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

      return await response.json()
    } catch (error) {
      VideoCallLogger.error("Failed to get token data", error)
      return null
    }
  }, [sessionId])

  const createClient = useCallback(async (): Promise<void> => {
    try {
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
      const tokenData = await getTokenData()
      
      if (!tokenData) {
        throw new Error("Failed to get token data")
      }

      if (!tokenData.channel || !tokenData.token || !tokenData.appId) {
        throw new Error(`Missing required Agora data: channel=${tokenData.channel}, token=${!!tokenData.token}, appId=${tokenData.appId}`)
      }

      // Clean up any existing client first
      if (clientRef.current) {
        VideoCallLogger.log("Cleaning up existing client before creating new one")
        try {
          await clientRef.current.leave()
        } catch (e) {
          VideoCallLogger.log("Error leaving existing client", e)
        }
        clientRef.current = null
      }

      // Create Agora client
      const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" })
      clientRef.current = client
      VideoCallLogger.log(`Created new Agora client for channel: ${tokenData.channel}`)

      setupEventListeners(client)

      // Join the channel
      VideoCallLogger.log(`Joining channel with UID: ${tokenData.uid}`)
      await client.join(tokenData.appId, tokenData.channel, tokenData.token, tokenData.uid)

      // Wait for connection to be fully established
      await new Promise<void>((resolve) => {
        const checkConnection = () => {
          if (client.connectionState === "CONNECTED") {
            resolve()
          } else {
            setTimeout(checkConnection, 100)
          }
        }
        checkConnection()
      })

      await trackSessionJoin()
    } catch (error) {
      VideoCallLogger.error("Failed to create and join client", error)
      throw error
    }
  }, [getTokenData, setupEventListeners, trackSessionJoin])

  return {
    clientRef,
    localVideoTrackRef,
    localAudioTrackRef,
    screenTrackRef,
    safePublish,
    createClient,
  }
}