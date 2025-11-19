"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Clock, User, VideoIcon, AlertCircle, Users, CheckCircle, Camera, Mic, MicOff, CameraOff } from 'lucide-react'
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
      onJoinSession()
        .then(success => {
          if (success) {
            setJoinStatus("joined")
          } else {
            setJoinStatus("error")
            setErrorMessage("Failed to join session")
          }
        })
        .catch(error => {
          console.error("[WAITING_ROOM] Auto-join error:", error)
          setJoinStatus("error")
          setErrorMessage("Failed to join session. Please try again.")
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

  const toggleCamera = useCallback(async () => {
    setMediaError("")

    if (cameraEnabled) {
      // Turn off camera
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(track => track.stop())
        cameraStreamRef.current = null
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
      setCameraEnabled(false)
      return
    }

    // Turn on camera
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera not supported')
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      })

      cameraStreamRef.current = stream

      if (videoRef.current) {
        // Assign stream first
        videoRef.current.srcObject = stream
        // Set video properties
        videoRef.current.muted = true
        videoRef.current.playsInline = true
        
        // Use play() directly without waiting for loadedmetadata
        try {
          await videoRef.current.play()
        } catch (playError) {
          console.error("[v0] Play error:", playError)
          // If autoplay fails, try again with a small delay
          setTimeout(() => {
            videoRef.current?.play().catch(err => {
              console.error("[v0] Retry play error:", err)
              setMediaError("Failed to start video playback")
            })
          }, 100)
        }
      }

      setCameraEnabled(true)
    } catch (error: any) {
      console.error("[v0] Camera error:", error)
      let msg = "Unable to access camera."
      if (error.name === 'NotAllowedError') msg = "Camera access denied. Please allow camera permissions."
      else if (error.name === 'NotFoundError') msg = "No camera found."
      else if (error.name === 'NotReadableError') msg = "Camera in use by another app."
      setMediaError(msg)
      setCameraEnabled(false)
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
            // Ignore disconnect errors
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
              // Ignore disconnect errors
            }
          }, 3000)
        } catch (playbackError) {
          // Ignore playback errors
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
          className="w-full max-w-md px-8 py-4 bg-blue-600/50 hover:bg-blue-600/50 text-white font-semibold rounded-2xl transition-all duration-200 border-2 border-blue-500/30"
          size="lg"
        >
          <div className="flex items-center space-x-3">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Joining Session...</span>
          </div>
        </Button>
      )
    }

    if (joinStatus === "error") {
      return (
        <Button 
          onClick={handleJoinSession} 
          className="w-full max-w-md px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-2xl transition-all duration-200 hover:scale-105 border-2 border-red-500/50 shadow-lg"
          size="lg"
        >
          <div className="flex items-center space-x-3">
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
            className="w-full max-w-md px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl transition-all duration-200 hover:scale-105 border-2 border-blue-500/50 shadow-lg"
            size="lg"
          >
            <div className="flex items-center space-x-3">
              <Users className="h-5 w-5" />
              <span>Join Session</span>
            </div>
          </Button>
        )
      } else {
        return (
          <Button 
            disabled 
            className="w-full max-w-md px-8 py-4 bg-gray-600/50 hover:bg-gray-600/50 text-gray-300 font-semibold rounded-2xl border-2 border-gray-500/30"
            size="lg"
          >
            <div className="flex items-center space-x-3">
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
          className="w-full max-w-md px-8 py-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold rounded-2xl transition-all duration-200 hover:scale-105 shadow-xl border-2 border-green-500/50 animate-pulse"
          size="lg"
        >
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
              <VideoIcon className="h-4 w-4" />
            </div>
            <span>Join Video Call</span>
          </div>
        </Button>
      )
    }

    if (isTimeRemaining(timeToSession)) {
      return (
        <Button 
          disabled 
          className="w-full max-w-md px-8 py-4 bg-gray-600/50 hover:bg-gray-600/50 text-gray-300 font-semibold rounded-2xl border-2 border-gray-500/30"
          size="lg"
        >
          <div className="flex items-center space-x-3">
            <Clock className="h-5 w-5" />
            <span>Starts in {formatTimeRemaining(timeToSession, { compact: true })}</span>
          </div>
        </Button>
      )
    }

    return (
      <Button
        disabled
        className="w-full max-w-md px-8 py-4 bg-gray-600/50 hover:bg-gray-600/50 text-gray-300 font-semibold rounded-2xl border-2 border-gray-500/30"
        size="lg"
      >
        <div className="flex items-center space-x-3">
          <CheckCircle className="h-5 w-5" />
          <span>Waiting for session time to start...</span>
        </div>
      </Button>
    )
  }

  const getJoinStatusText = (status: JoinStatus) => {
    switch (status) {
      case "waiting": return "Waiting for session time to start..."
      case "joining": return "Connecting to session..."
      case "joined": return "Joined session"
      case "ready": return "Ready for video call"
      case "error": return "Join failed - retry needed"
      default: return "Unknown"
    }
  }

  return (
    <div className="h-screen w-full bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center p-3 overflow-hidden">
      <Card className="w-full max-w-6xl h-full max-h-screen bg-slate-900/95 border-slate-700/50 backdrop-blur-xl shadow-2xl flex flex-col">
        <CardHeader className="text-center space-y-4 px-4 py-4 flex-shrink-0">
          {/* Hero Section with Timer */}
          <div className="space-y-3">
            <div className="flex items-center justify-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-purple-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-xl">
                <VideoIcon className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-black bg-gradient-to-r from-white via-blue-100 to-slate-300 bg-clip-text text-transparent tracking-tight">
                Session Waiting Room
              </h1>
            </div>
            
            <SessionCountdown 
              sessionDate={sessionData.startTime}
              status={sessionData.status}
              className="mx-auto"
            />
          </div>

          {/* Modern Status Alerts */}
          {isSessionStarted && joinStatus === "ready" && (
            <div className="bg-green-900/30 border border-green-500/50 rounded-xl p-4 backdrop-blur-sm">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-600/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <h4 className="text-green-200 font-semibold text-sm mb-1">Ready to Start!</h4>
                  <p className="text-green-300/90 text-sm">Your session is ready. Click below to join the video call.</p>
                </div>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-4 backdrop-blur-sm">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-600/20 rounded-full flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <h4 className="text-red-200 font-semibold text-sm mb-1">Connection Issue</h4>
                  <p className="text-red-300/90 text-sm">{errorMessage}</p>
                </div>
              </div>
            </div>
          )}

          {isReconnection && previouslyJoinedAt && (
            <div className="bg-blue-900/30 border border-blue-500/50 rounded-xl p-4 backdrop-blur-sm">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600/20 rounded-full flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h4 className="text-blue-200 font-semibold text-sm mb-1">Welcome Back!</h4>
                  <p className="text-blue-300/90 text-sm">
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
              <div className="text-center mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 via-teal-600 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-2 shadow-lg">
                  <Camera className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1 tracking-tight">
                  Device Setup & Testing
                </h3>
                <p className="text-slate-300 text-xs">
                  Test your camera and microphone before the session
                </p>
              </div>

            {/* Enhanced Camera Test */}
            <div className="space-y-3">
              <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-600/30 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${
                      cameraEnabled ? 'bg-emerald-600/20 border border-emerald-500/30' : 'bg-slate-600/20 border border-slate-500/30'
                    }`}>
                      {cameraEnabled ? (
                        <Camera className="h-5 w-5 text-emerald-400" />
                      ) : (
                        <CameraOff className="h-5 w-5 text-slate-400" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-white font-semibold">Camera Test</h4>
                      <p className="text-xs text-slate-300">
                        {cameraEnabled ? 'Camera is active and ready' : 'Click to test your camera'}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={toggleCamera}
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 transform hover:scale-105 ${
                      cameraEnabled
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/25'
                        : 'bg-slate-700 hover:bg-slate-600 text-white border border-slate-600 shadow-lg'
                    }`}
                  >
                    {cameraEnabled ? 'Stop Camera' : 'Test Camera'}
                  </Button>
                </div>
                
                {cameraEnabled && (
                  <div className="relative bg-black rounded-xl overflow-hidden border-2 border-emerald-500/40 shadow-xl">
                    <video
                      ref={videoRef}
                      muted
                      playsInline
                      className="w-full h-48 object-cover"
                    />
                    <div className="absolute top-2 right-2 bg-emerald-600/90 backdrop-blur-sm px-2 py-1 rounded-full">
                      <div className="flex items-center space-x-1">
                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                        <span className="text-white text-xs font-medium">Live</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Enhanced Microphone Test */}
            <div className="space-y-3">
              <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-600/30 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${
                      microphoneEnabled ? 'bg-blue-600/20 border border-blue-500/30' : 'bg-slate-600/20 border border-slate-500/30'
                    }`}>
                      {microphoneEnabled ? (
                        <Mic className="h-5 w-5 text-blue-400" />
                      ) : (
                        <MicOff className="h-5 w-5 text-slate-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="text-white font-semibold">Microphone Test</h4>
                        {microphoneEnabled && (
                          <div className="flex items-center space-x-1">
                            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                            <span className="text-xs text-blue-400 font-medium">Active</span>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-slate-300">
                        {microphoneEnabled ? 'Microphone is active and listening' : 'Click to test your microphone'}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={toggleMicrophone}
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 transform hover:scale-105 ${
                      microphoneEnabled
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/25'
                        : 'bg-slate-700 hover:bg-slate-600 text-white border border-slate-600 shadow-lg'
                    }`}
                  >
                    {microphoneEnabled ? 'Stop Mic' : 'Test Microphone'}
                  </Button>
                </div>

                {microphoneEnabled && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium">Speak to test your microphone</span>
                      <span className="text-white font-mono bg-slate-700/60 px-2 py-1 rounded border border-slate-600/40">
                        {Math.round(audioLevel)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-700/60 rounded-full h-3 border border-slate-600/40 shadow-inner">
                      <div
                        className="h-full rounded-full transition-all duration-150 relative overflow-hidden shadow-lg"
                        style={{
                          width: `${Math.min(audioLevel, 100)}%`,
                          backgroundColor: audioLevel > 60 ? '#ef4444' : audioLevel > 30 ? '#f59e0b' : '#10b981'
                        }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/30" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-700/50">
                      <p className="text-xs text-slate-300 font-medium text-center">
                        Audio playback is automatically tested for 3 seconds when microphone is enabled.
                        <br />
                        <span className="text-slate-400">Use headphones to avoid feedback.</span>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

              {mediaError && (
                <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-3 backdrop-blur-sm">
                  <div className="flex items-start space-x-2">
                    <div className="flex-shrink-0">
                      <AlertCircle className="h-4 w-4 text-red-400 mt-0.5" />
                    </div>
                    <div>
                      <h4 className="text-red-200 font-semibold text-xs mb-1">Media Error</h4>
                      <p className="text-red-300/90 text-xs leading-relaxed">{mediaError}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Session Info & Participants */}
            <div className="space-y-4 overflow-y-auto">
              
              {/* Session Details */}
              <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl p-4 border border-slate-700/50">
                <h4 className="text-white font-semibold mb-3 flex items-center text-sm">
                  <Clock className="h-4 w-4 mr-2 text-blue-400" />
                  Session Details
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between py-2 border-b border-slate-700/50">
                    <span className="text-slate-400 font-medium text-xs">Time</span>
                    <span className="text-white font-mono text-xs bg-slate-700/50 px-2 py-1 rounded">
                      {formatSessionTime()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-slate-700/50">
                    <span className="text-slate-400 font-medium text-xs">Duration</span>
                    <span className="text-white font-semibold text-xs">
                      {sessionData.durationMinutes} minutes
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-slate-400 font-medium text-xs">Status</span>
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      sessionData.status === "ongoing" 
                        ? "bg-green-600/20 text-green-300 border border-green-600/30" 
                        : sessionData.status === "confirmed" 
                          ? "bg-blue-600/20 text-blue-300 border border-blue-600/30"
                          : "bg-slate-600/20 text-slate-300 border border-slate-600/30"
                    }`}>
                      {sessionData.status.charAt(0).toUpperCase() + sessionData.status.slice(1)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Participants Section */}
              <div className="space-y-3">
                {/* Your Status */}
                <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 rounded-xl p-3 border border-blue-700/30">
                  <div className="flex items-center space-x-3 mb-1">
                  <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
                    <User className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold text-sm">You ({userRole})</h4>
                    <div className="flex items-center space-x-2 mt-1">
                      <div className={`w-2 h-2 rounded-full ${
                        joinStatus === "joined" || joinStatus === "ready" ? "bg-green-400" : "bg-yellow-400 animate-pulse"
                      }`} />
                      <span className={`text-xs font-medium ${
                        joinStatus === "joined" || joinStatus === "ready" ? "text-green-300" : "text-yellow-300"
                      }`}>
                        {getJoinStatusText(joinStatus)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Other Participant */}
              <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl p-4 border border-slate-700/50">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Avatar className="h-12 w-12 border-2 border-slate-600/50">
                      <AvatarImage src={otherParticipant.profilePictureUrl || ""} className="object-cover" />
                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-600 text-white text-sm font-bold">
                        {getInitials(otherParticipant.firstName, otherParticipant.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center border-2 border-slate-800 ${
                      otherUserStatus === "joined" ? "bg-green-500" :
                      otherUserStatus === "not_joined" ? "bg-slate-500" :
                      "bg-yellow-500"
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        otherUserStatus === "joined" ? "bg-white" :
                        otherUserStatus === "not_joined" ? "bg-slate-300" :
                        "bg-white animate-pulse"
                      }`} />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-white text-sm mb-1">
                      {otherParticipant.firstName} {otherParticipant.lastName}
                    </h4>
                    <p className="text-slate-300 font-medium mb-1 text-xs">{otherParticipant.title}</p>
                    <div className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      otherUserStatus === "joined" ? "bg-green-600/20 text-green-300 border border-green-600/30" :
                      otherUserStatus === "not_joined" ? "bg-slate-600/20 text-slate-300 border border-slate-600/30" :
                      "bg-yellow-600/20 text-yellow-300 border border-yellow-600/30"
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
                  <div className={`inline-flex items-center space-x-2 px-3 py-2 rounded-lg ${
                    isSessionStarted && joinStatus === "ready"
                      ? "bg-green-600/10 border border-green-600/20"
                      : joinStatus === "joined"
                        ? "bg-blue-600/10 border border-blue-600/20"
                        : "bg-slate-600/10 border border-slate-600/20"
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${
                      isSessionStarted && joinStatus === "ready"
                        ? "bg-green-400"
                        : joinStatus === "joined"
                          ? "bg-blue-400 animate-pulse"
                          : "bg-slate-400"
                    }`} />
                    <p className={`text-xs font-medium ${
                      isSessionStarted && joinStatus === "ready"
                        ? "text-green-300"
                        : joinStatus === "joined"
                          ? "text-blue-300"
                          : "text-slate-400"
                    }`}>
                      {isSessionStarted && joinStatus === "ready"
                        ? "Ready to start! Click above to join the video call."
                        : joinStatus === "joined"
                        ? "Session joined. Waiting for session time to begin."
                        : "Please join the session and test your devices."
                      }
                    </p>
                  </div>
                  {!isSessionStarted && joinStatus === "joined" && (
                    <div className="flex items-center justify-center space-x-1 mt-2">
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" />
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' } as React.CSSProperties} />
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' } as React.CSSProperties} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
