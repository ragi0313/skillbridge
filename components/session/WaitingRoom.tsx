"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Clock, User, VideoIcon, AlertCircle, Users, CheckCircle, Camera, Mic, MicOff, CameraOff } from "lucide-react"
import { SessionCountdown } from "@/components/session/SessionCountdown"
import { useRealTimeTimer, formatTimeRemaining } from "@/lib/hooks/useRealTimeTimer"

interface WaitingRoomProps {
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
  onJoinVideoCall: () => void
  isReconnection?: boolean
  previouslyJoinedAt?: string | null
  hasJoinedSession?: boolean
  onJoinSession?: () => Promise<boolean>
}

type JoinStatus = "waiting" | "joining" | "joined" | "ready" | "error"

export function WaitingRoom({
  sessionId,
  sessionData,
  userRole,
  otherParticipant,
  onJoinVideoCall,
  isReconnection = false,
  previouslyJoinedAt,
  hasJoinedSession = false,
  onJoinSession
}: WaitingRoomProps) {
  const [joinStatus, setJoinStatus] = useState<JoinStatus>(hasJoinedSession ? "joined" : "waiting")
  const [otherUserStatus, setOtherUserStatus] = useState<"not_joined" | "joined" | "unknown">("unknown")
  const [errorMessage, setErrorMessage] = useState<string>("")
  const [isSessionStarted, setIsSessionStarted] = useState(false)
  
  // Media testing state
  const [cameraEnabled, setCameraEnabled] = useState(false)
  const [microphoneEnabled, setMicrophoneEnabled] = useState(false)
  const [mediaError, setMediaError] = useState<string>("")
  const [audioLevel, setAudioLevel] = useState(0)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const cameraStreamRef = useRef<MediaStream | null>(null)
  const microphoneStreamRef = useRef<MediaStream | null>(null)
  const hasAutoJoinedRef = useRef<boolean>(false)

  const sessionStart = new Date(sessionData.startTime)
  const joinWindowStart = new Date(sessionStart.getTime() - 30 * 60 * 1000)
  
  const timeToSession = useRealTimeTimer(sessionStart)
  const canJoin = new Date() >= joinWindowStart && ["confirmed", "upcoming", "ongoing"].includes(sessionData.status)
  const isSessionTime = new Date() >= sessionStart

  // Auto-join session when component mounts and user is in join window
  useEffect(() => {
    if (!hasJoinedSession && canJoin && onJoinSession && !hasAutoJoinedRef.current) {
      hasAutoJoinedRef.current = true
      setJoinStatus("joining")
      onJoinSession().then(success => {
        if (success) {
          setJoinStatus("joined")
        } else {
          setJoinStatus("error")
          setErrorMessage("Failed to join session")
        }
      })
    }
  }, [hasJoinedSession, canJoin, onJoinSession])

  const handleStartVideoCall = useCallback(async () => {
    // Clean up waiting room media streams before starting video call
    try {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(track => {
          track.stop()
          })
        cameraStreamRef.current = null
        setCameraEnabled(false)
      }
      
      if (microphoneStreamRef.current) {
        microphoneStreamRef.current.getTracks().forEach(track => {
          track.stop()
          })
        microphoneStreamRef.current = null
        setMicrophoneEnabled(false)
        setAudioLevel(0)
      }
      
      if (audioContextRef.current) {
        await audioContextRef.current.close()
        audioContextRef.current = null
        analyserRef.current = null
        gainNodeRef.current = null
      }
      
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
      
      } catch (error) {
      console.error("Error cleaning up media streams:", error)
    }
    
    setTimeout(() => {
      onJoinVideoCall()
    }, 200)
  }, [onJoinVideoCall])

  // Set initial session status and handle manual video call start
  useEffect(() => {
    if (sessionData.status === "ongoing") {
      setIsSessionStarted(true)
      setJoinStatus("ready")
    }
    
    // If session time has arrived and we've joined, get ready for video
    if (isSessionTime && (joinStatus === "joined" || hasJoinedSession)) {
      setIsSessionStarted(true)
      setJoinStatus("ready")
    }
  }, [sessionData.status, isSessionTime, joinStatus, hasJoinedSession])

  // Handle manual join session (for early users)
  const handleJoinSession = useCallback(async () => {
    if (!onJoinSession || hasJoinedSession || joinStatus === "joining") return

    setJoinStatus("joining")
    setErrorMessage("")
    
    try {
      const success = await onJoinSession()
      if (success) {
        setJoinStatus("joined")
        } else {
        setJoinStatus("error")
        setErrorMessage("Failed to join session. Please try again.")
      }
    } catch (error) {
      console.error("[WAITING_ROOM] Error joining session:", error)
      setJoinStatus("error")
      setErrorMessage("Failed to join session. Please try again.")
    }
  }, [onJoinSession, hasJoinedSession, joinStatus])

  // Camera test functions
  const toggleCamera = useCallback(async () => {
    try {
      setMediaError("")

      if (cameraEnabled) {
        // Turn off camera
        if (cameraStreamRef.current) {
          cameraStreamRef.current.getTracks().forEach(track => {
            track.stop()
          })
          cameraStreamRef.current = null
        }
        if (videoRef.current) {
          videoRef.current.srcObject = null
        }
        setCameraEnabled(false)
      } else {
        // Turn on camera
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera access is not supported in this browser')
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          },
          audio: false
        })

        cameraStreamRef.current = stream

        if (videoRef.current) {
          // Set srcObject and ensure video plays
          videoRef.current.srcObject = stream
          videoRef.current.muted = true // Ensure muted for autoplay

          // Wait for metadata to load then play
          try {
            await videoRef.current.play()
            setCameraEnabled(true)
          } catch (playError) {
            console.error("Video play error:", playError)
            // Try again after a brief delay
            setTimeout(async () => {
              if (videoRef.current) {
                try {
                  await videoRef.current.play()
                  setCameraEnabled(true)
                } catch (retryError) {
                  console.error("Retry play error:", retryError)
                  throw new Error("Failed to start video preview")
                }
              }
            }, 100)
          }
        }
      }
    } catch (error: any) {
      console.error("Camera error:", error)
      let errorMessage = "Unable to access camera."

      if (error.name === 'NotAllowedError') {
        errorMessage = "Camera access denied. Please allow camera permissions and try again."
      } else if (error.name === 'NotFoundError') {
        errorMessage = "No camera found. Please connect a camera and try again."
      } else if (error.name === 'NotReadableError') {
        errorMessage = "Camera is already in use by another application."
      }

      setMediaError(errorMessage)
      setCameraEnabled(false)

      // Clean up stream if error occurred
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(track => track.stop())
        cameraStreamRef.current = null
      }
    }
  }, [cameraEnabled])

  // Microphone test functions
  const toggleMicrophone = useCallback(async () => {
    try {
      setMediaError("")
      
      if (microphoneEnabled) {
        // Turn off microphone and audio playback
        if (microphoneStreamRef.current) {
          microphoneStreamRef.current.getAudioTracks().forEach(track => track.stop())
        }
        if (audioContextRef.current) {
          // Disconnect from speakers before closing
          try {
            if (gainNodeRef.current) {
              gainNodeRef.current.disconnect(audioContextRef.current.destination)
            }
          } catch (disconnectError) {
            }
          audioContextRef.current.close()
        }
        setMicrophoneEnabled(false)
        setAudioLevel(0)
        microphoneStreamRef.current = null
        audioContextRef.current = null
        analyserRef.current = null
        gainNodeRef.current = null
      } else {
        // Turn on microphone
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Microphone access is not supported in this browser')
        }
        
        // Check for microphone permissions first
        try {
          const permissions = await navigator.permissions.query({ name: 'microphone' as PermissionName })
          } catch (permError) {
          }
        
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: { 
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true 
          }, 
          video: false 
        })
        microphoneStreamRef.current = stream
        
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        
        if (audioContext.state === 'suspended') {
          await audioContext.resume()
        }
        
        const analyser = audioContext.createAnalyser()
        const microphone = audioContext.createMediaStreamSource(stream)
        const gainNode = audioContext.createGain()
        
        analyser.fftSize = 256
        microphone.connect(gainNode)
        gainNode.connect(analyser)
        gainNode.gain.value = 0.1
        
        audioContextRef.current = audioContext
        analyserRef.current = analyser
        gainNodeRef.current = gainNode
        
        setMicrophoneEnabled(true)
        
        // Automatically enable audio playback for testing (brief duration)
        try {
          gainNode.connect(audioContext.destination)
          setMediaError("Audio playback enabled briefly for testing. Use headphones to avoid feedback.")
          
          // Automatically disconnect after 3 seconds to prevent feedback
          setTimeout(() => {
            try {
              if (gainNodeRef.current && audioContextRef.current) {
                gainNodeRef.current.disconnect(audioContextRef.current.destination)
                setMediaError("")
              }
            } catch (disconnectError) {
              }
          }, 3000)
        } catch (playbackError) {
          }
        
        const updateAudioLevel = () => {
          if (analyserRef.current && microphoneStreamRef.current) {
            const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
            analyserRef.current.getByteTimeDomainData(dataArray)
            
            let rms = 0
            for (let i = 0; i < dataArray.length; i++) {
              const sample = (dataArray[i] - 128) / 128
              rms += sample * sample
            }
            rms = Math.sqrt(rms / dataArray.length)
            
            const level = Math.min(100, rms * 300)
            setAudioLevel(level)
            requestAnimationFrame(updateAudioLevel)
          }
        }
        
        updateAudioLevel()
      }
    } catch (error) {
      console.error("Microphone error:", error)
      setMediaError("Unable to access microphone. Please check your microphone permissions.")
      setMicrophoneEnabled(false)
    }
  }, [microphoneEnabled])

  // Session status polling with proper cleanup
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    let isMounted = true

    if (joinStatus === "joined" || joinStatus === "ready") {
      interval = setInterval(async () => {
        // Don't make requests if component unmounted
        if (!isMounted) {
          return
        }
        
        try {
          const response = await fetch(`/api/sessions/${sessionId}`)
          if (response.ok && isMounted) {
            const data = await response.json()
            const currentTime = new Date()
            const sessionStartTime = new Date(data.session.startTime)
            
            if (data.session.status === "ongoing" || currentTime >= sessionStartTime) {
              setIsSessionStarted(true)
              setJoinStatus("ready")
              setOtherUserStatus("joined")
            }
          }
        } catch (error) {
          if (isMounted) {
            console.error("Error checking session status:", error)
          }
        }
      }, 3000)
    }

    return () => {
      isMounted = false
      if (interval) {
        clearInterval(interval)
        interval = null
      }
    }
  }, [sessionId, joinStatus])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(track => track.stop())
      }
      if (microphoneStreamRef.current) {
        microphoneStreamRef.current.getTracks().forEach(track => track.stop())
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  }

  const formatSessionTime = () => {
    const start = new Date(sessionData.startTime)
    const end = new Date(sessionData.endTime)
    return `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  }

  const isTimeRemaining = (timer: any): timer is { isExpired: boolean; totalSeconds: number; days: number; hours: number; minutes: number; seconds: number } => {
    return 'isExpired' in timer && 'totalSeconds' in timer
  }

  const renderJoinButton = () => {
    if (joinStatus === "joining") {
      return (
        <Button
          disabled
          className="w-full max-w-md"
          size="lg"
        >
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Joining Session...</span>
          </div>
        </Button>
      )
    }

    if (joinStatus === "error") {
      return (
        <Button
          onClick={handleJoinSession}
          variant="destructive"
          className="w-full max-w-md"
          size="lg"
        >
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5" />
            <span>Retry Join</span>
          </div>
        </Button>
      )
    }

    if (!hasJoinedSession && joinStatus !== "joined") {
      if (canJoin) {
        return (
          <Button
            onClick={handleJoinSession}
            className="w-full max-w-md"
            size="lg"
          >
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Join Session</span>
            </div>
          </Button>
        )
      } else {
        return (
          <Button
            disabled
            variant="secondary"
            className="w-full max-w-md"
            size="lg"
          >
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Join opens 30 min before session</span>
            </div>
          </Button>
        )
      }
    }

    if (isSessionStarted) {
      return (
        <Button
          onClick={handleStartVideoCall}
          className="w-full max-w-md bg-green-600 hover:bg-green-700"
          size="lg"
        >
          <div className="flex items-center space-x-2">
            <VideoIcon className="h-5 w-5" />
            <span>Join Video Call</span>
          </div>
        </Button>
      )
    }

    if (isTimeRemaining(timeToSession)) {
      return (
        <Button
          disabled
          variant="secondary"
          className="w-full max-w-md"
          size="lg"
        >
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Starts in {formatTimeRemaining(timeToSession, { compact: true })}</span>
          </div>
        </Button>
      )
    }

    return (
      <Button
        disabled
        variant="secondary"
        className="w-full max-w-md"
        size="lg"
      >
        <div className="flex items-center space-x-2">
          <CheckCircle className="h-5 w-5" />
          <span>Waiting for session...</span>
        </div>
      </Button>
    )
  }

  const getJoinStatusText = (status: JoinStatus) => {
    switch (status) {
      case "waiting": return "Ready to join"
      case "joining": return "Joining session..."
      case "joined": return "Joined session"
      case "ready": return "Ready for video call"
      case "error": return "Join failed - retry needed"
      default: return "Unknown"
    }
  }

  return (
    <div className="h-screen w-full bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-6xl h-full max-h-screen bg-white border border-gray-200 flex flex-col">
        <CardHeader className="text-center space-y-3 px-4 py-4 flex-shrink-0 border-b border-gray-200">
          {/* Header Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-center space-x-2">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <VideoIcon className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900">
                Session Waiting Room
              </h1>
            </div>
            
            <SessionCountdown 
              sessionDate={sessionData.startTime}
              status={sessionData.status}
              className="mx-auto"
            />
          </div>

          {/* Status Alerts */}
          {isSessionStarted && joinStatus === "ready" && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <h4 className="text-green-900 font-medium text-sm">Ready to Start</h4>
                  <p className="text-green-700 text-sm">Your session is ready. Click below to join the video call.</p>
                </div>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <div>
                  <h4 className="text-red-900 font-medium text-sm">Connection Issue</h4>
                  <p className="text-red-700 text-sm">{errorMessage}</p>
                </div>
              </div>
            </div>
          )}

          {isReconnection && previouslyJoinedAt && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-blue-600" />
                <div>
                  <h4 className="text-blue-900 font-medium text-sm">Welcome Back</h4>
                  <p className="text-blue-700 text-sm">
                    You rejoined at {new Date(previouslyJoinedAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden px-4 py-3">
          {/* Main Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            
            {/* Left Column - Device Testing */}
            <div className="space-y-4 overflow-y-auto">
              <div className="mb-3">
                <h3 className="text-base font-semibold text-gray-900 mb-1">
                  Device Setup & Testing
                </h3>
                <p className="text-gray-600 text-sm">
                  Test your camera and microphone before the session
                </p>
              </div>

            {/* Camera Test */}
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    {cameraEnabled ? (
                      <Camera className="h-5 w-5 text-green-600" />
                    ) : (
                      <CameraOff className="h-5 w-5 text-gray-400" />
                    )}
                    <div>
                      <h4 className="text-gray-900 font-medium text-sm">Camera Test</h4>
                      <p className="text-xs text-gray-600">
                        {cameraEnabled ? 'Camera is active' : 'Click to test your camera'}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={toggleCamera}
                    variant={cameraEnabled ? "default" : "outline"}
                    size="sm"
                  >
                    {cameraEnabled ? 'Stop Camera' : 'Test Camera'}
                  </Button>
                </div>

                {cameraEnabled && (
                  <div className="relative bg-black rounded-lg overflow-hidden border border-gray-300">
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-64 object-cover"
                    />
                    <div className="absolute top-2 right-2 bg-red-600 px-2 py-1 rounded text-xs text-white font-medium">
                      Live
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Microphone Test */}
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    {microphoneEnabled ? (
                      <Mic className="h-5 w-5 text-green-600" />
                    ) : (
                      <MicOff className="h-5 w-5 text-gray-400" />
                    )}
                    <div>
                      <h4 className="text-gray-900 font-medium text-sm">Microphone Test</h4>
                      <p className="text-xs text-gray-600">
                        {microphoneEnabled ? 'Microphone is active' : 'Click to test your microphone'}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={toggleMicrophone}
                    variant={microphoneEnabled ? "default" : "outline"}
                    size="sm"
                  >
                    {microphoneEnabled ? 'Stop Mic' : 'Test Microphone'}
                  </Button>
                </div>

                {microphoneEnabled && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">Speak to test your microphone</span>
                      <span className="text-gray-900 font-mono bg-gray-200 px-2 py-1 rounded">
                        {Math.round(audioLevel)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-full rounded-full transition-all duration-150"
                        style={{
                          width: `${Math.min(audioLevel, 100)}%`,
                          backgroundColor: audioLevel > 60 ? '#ef4444' : audioLevel > 30 ? '#f59e0b' : '#10b981'
                        }}
                      />
                    </div>

                    <div className="pt-2 border-t border-gray-200">
                      <p className="text-xs text-gray-600 text-center">
                        Audio playback is automatically tested for 3 seconds when microphone is enabled.
                        <br />
                        Use headphones to avoid feedback.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

              {mediaError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                    <div>
                      <h4 className="text-red-900 font-medium text-xs mb-1">Media Error</h4>
                      <p className="text-red-700 text-xs">{mediaError}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Session Info & Participants */}
            <div className="space-y-4 overflow-y-auto">

              {/* Session Details */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h4 className="text-gray-900 font-semibold mb-3 flex items-center text-sm">
                  <Clock className="h-4 w-4 mr-2 text-gray-600" />
                  Session Details
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-600 text-xs">Time</span>
                    <span className="text-gray-900 font-mono text-xs bg-gray-200 px-2 py-1 rounded">
                      {formatSessionTime()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-600 text-xs">Duration</span>
                    <span className="text-gray-900 text-xs">
                      {sessionData.durationMinutes} minutes
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-gray-600 text-xs">Status</span>
                    <div className={`px-2 py-1 rounded text-xs ${
                      sessionData.status === "ongoing"
                        ? "bg-green-100 text-green-800 border border-green-200"
                        : sessionData.status === "confirmed"
                          ? "bg-blue-100 text-blue-800 border border-blue-200"
                          : "bg-gray-100 text-gray-800 border border-gray-200"
                    }`}>
                      {sessionData.status.charAt(0).toUpperCase() + sessionData.status.slice(1)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Participants Section */}
              <div className="space-y-3">
                {/* Your Status */}
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <div className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-blue-600" />
                  <div>
                    <h4 className="text-gray-900 font-medium text-sm">You ({userRole})</h4>
                    <div className="flex items-center space-x-2 mt-1">
                      <div className={`w-2 h-2 rounded-full ${
                        joinStatus === "joined" || joinStatus === "ready" ? "bg-green-500" : "bg-yellow-500"
                      }`} />
                      <span className={`text-xs ${
                        joinStatus === "joined" || joinStatus === "ready" ? "text-green-700" : "text-yellow-700"
                      }`}>
                        {getJoinStatusText(joinStatus)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Other Participant */}
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Avatar className="h-12 w-12 border border-gray-300">
                      <AvatarImage src={otherParticipant.profilePictureUrl || ""} className="object-cover" />
                      <AvatarFallback className="bg-blue-600 text-white text-sm font-semibold">
                        {getInitials(otherParticipant.firstName, otherParticipant.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                      otherUserStatus === "joined" ? "bg-green-500" :
                      otherUserStatus === "not_joined" ? "bg-gray-400" :
                      "bg-yellow-500"
                    }`} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 text-sm">
                      {otherParticipant.firstName} {otherParticipant.lastName}
                    </h4>
                    <p className="text-gray-600 text-xs mb-1">{otherParticipant.title}</p>
                    <div className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${
                      otherUserStatus === "joined" ? "bg-green-100 text-green-800 border border-green-200" :
                      otherUserStatus === "not_joined" ? "bg-gray-100 text-gray-700 border border-gray-200" :
                      "bg-yellow-100 text-yellow-800 border border-yellow-200"
                    }`}>
                      <span>
                        {otherUserStatus === "joined" && "Online"}
                        {otherUserStatus === "not_joined" && "Offline"}
                        {otherUserStatus === "unknown" && "Checking..."}
                      </span>
                    </div>
                  </div>
                  </div>
                </div>
              </div>

              {/* Action Section */}
              <div className="space-y-3">
                <div className="flex justify-center">
                  {renderJoinButton()}
                </div>

                <div className="text-center">
                  <div className={`inline-flex items-center space-x-2 px-3 py-2 rounded-lg border ${
                    isSessionStarted && joinStatus === "ready"
                      ? "bg-green-50 border-green-200"
                      : joinStatus === "joined"
                        ? "bg-blue-50 border-blue-200"
                        : "bg-gray-50 border-gray-200"
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${
                      isSessionStarted && joinStatus === "ready"
                        ? "bg-green-500"
                        : joinStatus === "joined"
                          ? "bg-blue-500"
                          : "bg-gray-400"
                    }`} />
                    <p className={`text-xs ${
                      isSessionStarted && joinStatus === "ready"
                        ? "text-green-700"
                        : joinStatus === "joined"
                          ? "text-blue-700"
                          : "text-gray-600"
                    }`}>
                      {isSessionStarted && joinStatus === "ready"
                        ? "Ready to start! Click above to join the video call."
                        : joinStatus === "joined"
                        ? "Session joined. Waiting for session time to begin."
                        : "Please join the session and test your devices."
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}