"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Clock, User, VideoIcon, AlertCircle, Users, CheckCircle, Loader2, Camera, Mic, MicOff, CameraOff, Volume2 } from "lucide-react"
import { SessionCountdown } from "@/components/session/SessionCountdown"
import { useRealTimeTimer, formatTimeRemaining } from "@/lib/hooks/useRealTimeTimer"
import { useSessionState } from "@/lib/hooks/useSessionState"

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
  const [audioPlaybackEnabled, setAudioPlaybackEnabled] = useState(false)
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

  // Set initial session status and handle automatic video call start
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
        console.log("[WAITING_ROOM] Successfully joined session")
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
          cameraStreamRef.current.getVideoTracks().forEach(track => {
            track.stop()
            console.log('Camera track stopped:', track.label)
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
            width: { ideal: 640, min: 320, max: 1280 }, 
            height: { ideal: 480, min: 240, max: 720 },
            facingMode: 'user',
            frameRate: { ideal: 15, max: 30 }
          }, 
          audio: false 
        })
        
        cameraStreamRef.current = stream
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          try {
            await videoRef.current.play()
          } catch (playError) {
            console.log("Video play failed (this is often normal):", playError)
          }
        }
        
        setCameraEnabled(true)
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
    }
  }, [cameraEnabled])

  // Microphone test functions
  const toggleMicrophone = useCallback(async () => {
    try {
      setMediaError("")
      
      if (microphoneEnabled) {
        // Turn off microphone
        if (microphoneStreamRef.current) {
          microphoneStreamRef.current.getAudioTracks().forEach(track => track.stop())
        }
        if (audioContextRef.current) {
          audioContextRef.current.close()
        }
        setMicrophoneEnabled(false)
        setAudioLevel(0)
        microphoneStreamRef.current = null
        audioContextRef.current = null
        analyserRef.current = null
      } else {
        // Turn on microphone
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
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

  // Audio playback toggle
  const toggleAudioPlayback = useCallback(() => {
    if (!microphoneEnabled || !gainNodeRef.current || !audioContextRef.current) {
      setMediaError("Please enable microphone first to test audio playback.")
      return
    }

    try {
      if (audioPlaybackEnabled) {
        try {
          gainNodeRef.current.disconnect(audioContextRef.current.destination)
        } catch (disconnectError) {
          console.log("Node already disconnected")
        }
        setAudioPlaybackEnabled(false)
      } else {
        gainNodeRef.current.connect(audioContextRef.current.destination)
        setAudioPlaybackEnabled(true)
        setMediaError("Audio playback enabled. Use headphones to avoid feedback.")
        setTimeout(() => {
          if (gainNodeRef.current && audioContextRef.current) {
            try {
              gainNodeRef.current.disconnect(audioContextRef.current.destination)
            } catch (disconnectError) {
              console.log("Node already disconnected")
            }
            setAudioPlaybackEnabled(false)
            setMediaError("")
          }
        }, 5000)
      }
    } catch (error) {
      console.error("Audio playback error:", error)
      setMediaError("Unable to control audio playback.")
      setAudioPlaybackEnabled(false)
    }
  }, [microphoneEnabled, audioPlaybackEnabled])

  const handleStartVideoCall = useCallback(async () => {
    // Clean up waiting room media streams before starting video call
    try {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(track => {
          track.stop()
          console.log('Stopped camera track:', track.label)
        })
        cameraStreamRef.current = null
        setCameraEnabled(false)
      }
      
      if (microphoneStreamRef.current) {
        microphoneStreamRef.current.getTracks().forEach(track => {
          track.stop()
          console.log('Stopped microphone track:', track.label)
        })
        microphoneStreamRef.current = null
        setMicrophoneEnabled(false)
        setAudioLevel(0)
        setAudioPlaybackEnabled(false)
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
      
      console.log('Media streams cleanup completed')
    } catch (error) {
      console.error("Error cleaning up media streams:", error)
    }
    
    setTimeout(() => {
      onJoinVideoCall()
    }, 200)
  }, [onJoinVideoCall])

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
        <Button disabled className="w-full">
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Joining Session...
        </Button>
      )
    }

    if (joinStatus === "error") {
      return (
        <Button onClick={handleJoinSession} className="w-full bg-red-600 hover:bg-red-700">
          <AlertCircle className="h-4 w-4 mr-2" />
          Retry Join
        </Button>
      )
    }

    if (!hasJoinedSession && joinStatus !== "joined") {
      if (canJoin) {
        return (
          <Button onClick={handleJoinSession} className="w-full bg-blue-600 hover:bg-blue-700">
            <Users className="h-4 w-4 mr-2" />
            Join Session
          </Button>
        )
      } else {
        return (
          <Button disabled className="w-full">
            <Clock className="h-4 w-4 mr-2" />
            Join window opens 30 min before session
          </Button>
        )
      }
    }

    if (isSessionStarted) {
      return (
        <Button 
          onClick={handleStartVideoCall}
          className="w-full bg-green-600 hover:bg-green-700 animate-pulse"
          size="lg"
        >
          <VideoIcon className="h-5 w-5 mr-2" />
          Start Video Call
        </Button>
      )
    }

    if (isTimeRemaining(timeToSession)) {
      return (
        <Button disabled className="w-full">
          <Clock className="h-4 w-4 mr-2" />
          Session starts in {formatTimeRemaining(timeToSession, { compact: true })}
        </Button>
      )
    }

    return (
      <Button disabled className="w-full">
        <CheckCircle className="h-4 w-4 mr-2" />
        Waiting for session to start...
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

  const getJoinStatusColor = (status: JoinStatus) => {
    switch (status) {
      case "joined": return "text-green-400"
      case "ready": return "text-green-400"
      case "joining": return "text-yellow-400"
      case "error": return "text-red-400"
      default: return "text-slate-400"
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-slate-900/95 border-slate-700/50 backdrop-blur-sm">
        <CardHeader className="text-center space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Session Waiting Room</h1>
            <p className="text-slate-400">Preparing your mentorship session</p>
          </div>

          <SessionCountdown 
            sessionDate={sessionData.startTime}
            status={sessionData.status}
            className="mx-auto"
          />

          {isSessionStarted && joinStatus === "ready" && (
            <Alert className="bg-green-900/20 border-green-600/30">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <AlertDescription className="text-green-300">
                Session is ready to start! Click the button below to join the video call.
              </AlertDescription>
            </Alert>
          )}

          {errorMessage && (
            <Alert className="bg-red-900/20 border-red-600/30">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-300">
                {errorMessage}
              </AlertDescription>
            </Alert>
          )}

          {isReconnection && previouslyJoinedAt && (
            <Alert className="bg-blue-900/20 border-blue-600/30">
              <AlertCircle className="h-4 w-4 text-blue-400" />
              <AlertDescription className="text-blue-300">
                Welcome back! You were previously in this session at {new Date(previouslyJoinedAt).toLocaleTimeString()}.
              </AlertDescription>
            </Alert>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Media Test Section */}
          <div className="bg-slate-800/50 rounded-lg p-6 space-y-6">
            <div>
              <h3 className="text-lg font-medium text-white mb-4 flex items-center">
                <VideoIcon className="h-5 w-5 mr-2" />
                Test Your Camera & Microphone
              </h3>
              <p className="text-sm text-slate-400 mb-4">
                Make sure your camera and microphone are working before the session starts.
              </p>
            </div>

            {/* Camera Test */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {cameraEnabled ? (
                    <Camera className="h-4 w-4 text-green-400" />
                  ) : (
                    <CameraOff className="h-4 w-4 text-slate-400" />
                  )}
                  <span className="text-white">Camera</span>
                </div>
                <Button
                  onClick={toggleCamera}
                  variant={cameraEnabled ? "default" : "outline"}
                  size="sm"
                  className={cameraEnabled ? "bg-green-600 hover:bg-green-700" : ""}
                >
                  {cameraEnabled ? "Turn Off" : "Test Camera"}
                </Button>
              </div>
              
              {cameraEnabled && (
                <div className="bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-48 object-cover"
                  />
                </div>
              )}
            </div>

            {/* Microphone Test */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {microphoneEnabled ? (
                    <Mic className="h-4 w-4 text-green-400" />
                  ) : (
                    <MicOff className="h-4 w-4 text-slate-400" />
                  )}
                  <span className="text-white">Microphone</span>
                  {microphoneEnabled && (
                    <Volume2 className="h-4 w-4 text-blue-400" />
                  )}
                </div>
                <Button
                  onClick={toggleMicrophone}
                  variant={microphoneEnabled ? "default" : "outline"}
                  size="sm"
                  className={microphoneEnabled ? "bg-green-600 hover:bg-green-700" : ""}
                >
                  {microphoneEnabled ? "Turn Off" : "Test Microphone"}
                </Button>
              </div>

              {microphoneEnabled && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Speak to test your microphone</span>
                    <span className="text-slate-400">Level: {Math.round(audioLevel)}%</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-150"
                      style={{
                        width: `${audioLevel}%`,
                        backgroundColor: audioLevel > 60 ? '#ef4444' : audioLevel > 30 ? '#f59e0b' : '#10b981'
                      }}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Test audio playback (use headphones)</span>
                    <Button
                      onClick={toggleAudioPlayback}
                      variant={audioPlaybackEnabled ? "default" : "outline"}
                      size="sm"
                      className={audioPlaybackEnabled ? "bg-blue-600 hover:bg-blue-700" : ""}
                    >
                      {audioPlaybackEnabled ? "Stop Playback" : "Test Audio"}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {mediaError && (
              <Alert className="bg-red-900/20 border-red-600/30">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-300">
                  {mediaError}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <Separator className="bg-slate-700" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Badge variant="outline" className="text-blue-400 border-blue-400">
                  <User className="h-3 w-3 mr-1" />
                  You ({userRole})
                </Badge>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${joinStatus === "joined" || joinStatus === "ready" ? "bg-green-500" : "bg-yellow-500"}`} />
                  <span className={`text-sm ${getJoinStatusColor(joinStatus)}`}>
                    {getJoinStatusText(joinStatus)}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={otherParticipant.profilePictureUrl || ""} />
                  <AvatarFallback className="bg-slate-700 text-slate-200">
                    {getInitials(otherParticipant.firstName, otherParticipant.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium text-white">
                    {otherParticipant.firstName} {otherParticipant.lastName}
                  </div>
                  <div className="text-sm text-slate-400">{otherParticipant.title}</div>
                  <div className="flex items-center space-x-2 mt-1">
                    {otherUserStatus === "joined" && (
                      <>
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <span className="text-xs text-green-400">Online</span>
                      </>
                    )}
                    {otherUserStatus === "not_joined" && (
                      <>
                        <div className="w-2 h-2 bg-gray-500 rounded-full" />
                        <span className="text-xs text-slate-400">Not joined yet</span>
                      </>
                    )}
                    {otherUserStatus === "unknown" && (
                      <>
                        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                        <span className="text-xs text-yellow-400">Checking status...</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Session Time</span>
                <span className="text-white">{formatSessionTime()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Duration</span>
                <span className="text-white">{sessionData.durationMinutes} minutes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status</span>
                <Badge 
                  variant={sessionData.status === "ongoing" ? "default" : "secondary"}
                  className={
                    sessionData.status === "ongoing" 
                      ? "bg-green-600 text-white" 
                      : "bg-slate-700 text-slate-200"
                  }
                >
                  {sessionData.status}
                </Badge>
              </div>
            </div>
          </div>

          <Separator className="bg-slate-700" />

          <div className="space-y-4">
            {renderJoinButton()}
            
            <div className="text-center space-y-2">
              <p className="text-sm text-slate-400">
                {isSessionStarted && joinStatus === "ready"
                  ? "Your session is ready! Click above to join the video call."
                  : joinStatus === "joined"
                  ? "You've joined the session. Waiting for session time to start video call."
                  : "Join the session first, then test your camera and microphone."
                }
              </p>
              {!isSessionStarted && joinStatus === "joined" && (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}