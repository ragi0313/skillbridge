"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Video, VideoOff, Mic, MicOff, Monitor, PhoneOff, Users, Wifi, WifiOff } from "lucide-react"
import { toast } from "sonner"

interface VideoCallProps {
  sessionId: string
  userRole: "learner" | "mentor"
}

interface TokenResponse {
  token: string
  channelName: string
  appId: string
  uid: number
  role: string
  userName: string
  expiresAt: string
}

interface CallState {
  isConnected: boolean
  isVideoEnabled: boolean
  isAudioEnabled: boolean
  isScreenSharing: boolean
  participantCount: number
  connectionQuality: "excellent" | "good" | "poor"
  callDuration: number
}

export default function VideoCall({ sessionId, userRole }: VideoCallProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tokenData, setTokenData] = useState<TokenResponse | null>(null)
  const [callState, setCallState] = useState<CallState>({
    isConnected: false,
    isVideoEnabled: true,
    isAudioEnabled: true,
    isScreenSharing: false,
    participantCount: 0,
    connectionQuality: "excellent",
    callDuration: 0,
  })

  const localVideoRef = useRef<HTMLDivElement>(null)
  const remoteVideoRef = useRef<HTMLDivElement>(null)
  const clientRef = useRef<any>(null)
  const localVideoTrackRef = useRef<any>(null)
  const localAudioTrackRef = useRef<any>(null)
  const screenTrackRef = useRef<any>(null)
  const callStartTimeRef = useRef<Date | null>(null)
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Handle call end navigation
  const handleCallEnd = useCallback(() => {
    const redirectPath = userRole === "learner" ? "/learner/sessions" : "/mentor/sessions"
    router.push(redirectPath)
  }, [userRole, router])

  // Format call duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Initialize Agora client and join channel
  const initializeCall = useCallback(async () => {
    try {
      setIsLoading(true)

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
        throw new Error(errorData.error || "Failed to get Agora token")
      }

      const data: TokenResponse = await response.json()
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

          setCallState((prev) => ({ ...prev, participantCount: prev.participantCount + 1 }))
          toast.success("Participant joined the call")
        } catch (err) {
          console.error("Error handling user published:", err)
        }
      })

      client.on("user-unpublished", (user: any, mediaType: "video" | "audio") => {
        if (mediaType === "video") {
          user.videoTrack?.stop()
        }
        setCallState((prev) => ({ ...prev, participantCount: Math.max(0, prev.participantCount - 1) }))
        toast.info("Participant left the call")
      })

      client.on("user-left", (user: any) => {
        setCallState((prev) => ({ ...prev, participantCount: Math.max(0, prev.participantCount - 1) }))
      })

      client.on("connection-state-change", (curState: string) => {
        console.log("Connection state changed:", curState)

        if (curState === "CONNECTED") {
          setCallState((prev) => ({ ...prev, isConnected: true }))
          if (!callStartTimeRef.current) {
            callStartTimeRef.current = new Date()
          }
        } else if (curState === "DISCONNECTED") {
          setCallState((prev) => ({ ...prev, isConnected: false }))
        }
      })

      client.on("network-quality", (stats: any) => {
        const quality = stats.uplinkNetworkQuality > 3 ? "poor" : stats.uplinkNetworkQuality > 1 ? "good" : "excellent"
        setCallState((prev) => ({ ...prev, connectionQuality: quality }))
      })

      // Join the channel
      await client.join(data.appId, data.channelName, data.token, data.uid)

      // Create and publish local tracks
      const [localAudioTrack, localVideoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks()

      localVideoTrackRef.current = localVideoTrack
      localAudioTrackRef.current = localAudioTrack

      // Play local video
      if (localVideoRef.current) {
        localVideoTrack.play(localVideoRef.current)
      }

      // Publish tracks
      await client.publish([localVideoTrack, localAudioTrack])

      setIsLoading(false)
      setCallState((prev) => ({ ...prev, isConnected: true }))
      toast.success("Connected to video call")
    } catch (err: any) {
      console.error("Failed to initialize Agora call:", err)
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
      } else {
        // Start screen sharing
        try {
          const screenTrack = await AgoraRTC.createScreenVideoTrack({
            // Provide basic config to avoid TypeScript errors
            encoderConfig: "1080p_1"
          })
          screenTrackRef.current = screenTrack

          // Unpublish camera track
          if (localVideoTrackRef.current) {
            await clientRef.current.unpublish([localVideoTrackRef.current])
            localVideoTrackRef.current.close()
          }

          // Publish screen track
          await clientRef.current.publish([screenTrack])

          // Play screen track in local video
          if (localVideoRef.current) {
            screenTrack.play(localVideoRef.current)
          }

          // Handle screen share end
          screenTrack.on("track-ended", () => {
            // Recursively call toggleScreenShare to stop screen sharing
            if (callState.isScreenSharing) {
              toggleScreenShare()
            }
          })

          setCallState((prev) => ({ ...prev, isScreenSharing: true }))
          toast.success("Screen sharing started")
        } catch (screenError: any) {
          // Handle screen sharing cancellation or permission denied
          if (screenError.name === 'NotAllowedError' || screenError.code === 'PERMISSION_DENIED') {
            toast.error("Screen sharing permission denied")
          } else {
            throw screenError
          }
        }
      }
    } catch (err: any) {
      console.error("Screen share error:", err)
      toast.error("Failed to toggle screen share")
    }
  }, [callState.isScreenSharing])

  // Leave call
  const leaveCall = useCallback(async () => {
    try {
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
      toast.success("Call ended")
      handleCallEnd()
    } catch (err: any) {
      console.error("Error leaving call:", err)
      handleCallEnd()
    }
  }, [handleCallEnd])

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

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4">
      {/* Call Status Bar */}
      <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm border">
        <div className="flex items-center space-x-4">
          <Badge variant={callState.isConnected ? "default" : "secondary"}>
            {callState.isConnected ? "Connected" : "Connecting..."}
          </Badge>
          {callState.isConnected && (
            <>
              <div className="flex items-center space-x-1 text-sm text-gray-600">
                <Users className="h-4 w-4" />
                <span>{callState.participantCount + 1} participants</span>
              </div>
              <div className="text-sm font-mono text-gray-600">{formatDuration(callState.callDuration)}</div>
              <div className={`flex items-center space-x-1 ${getQualityColor()}`}>
                {getQualityIcon()}
                <span className="text-sm capitalize">{callState.connectionQuality}</span>
              </div>
            </>
          )}
        </div>
        {tokenData && (
          <div className="text-sm text-gray-500">
            Channel: {tokenData.channelName} • Role: {tokenData.role}
          </div>
        )}
      </div>

      {/* Video Container */}
      <Card className="overflow-hidden">
        <div className="w-full h-[600px] bg-gray-900 rounded-lg relative">
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
      </Card>

      {/* Control Bar */}
      {callState.isConnected && (
        <div className="flex items-center justify-center space-x-4 p-4 bg-white rounded-lg shadow-sm border">
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

          <Button
            variant="destructive"
            size="lg"
            onClick={leaveCall}
            className="rounded-full px-6 bg-red-600 hover:bg-red-700"
          >
            <PhoneOff className="h-5 w-5 mr-2" />
            Leave Call
          </Button>
        </div>
      )}
    </div>
  )
}