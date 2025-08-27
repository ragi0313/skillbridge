"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { WaitingRoom } from "@/components/session/WaitingRoom"
import { VideoCallRoom } from "@/components/session/VideoCallRoom"
import { SessionRatingModal } from "@/components/session/SessionRatingModal"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Loader2, Home, RefreshCw } from "lucide-react"

interface SessionData {
  id: number
  scheduledDate: string
  startTime: string
  endTime: string
  status: string
  durationMinutes: number
  agoraChannelName?: string | null
}

interface UserRole {
  role: "learner" | "mentor"
}

interface OtherParticipant {
  firstName: string
  lastName: string
  profilePictureUrl?: string | null
  title: string
}

interface AgoraConfig {
  appId: string
  channel: string
  token: string
  uid: number
}

type SessionPhase = "loading" | "waiting_room" | "video_call" | "ended" | "error"

export default function SessionPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.id as string

  const [sessionPhase, setSessionPhase] = useState<SessionPhase>("loading")
  const [sessionData, setSessionData] = useState<SessionData | null>(null)
  const [userRole, setUserRole] = useState<"learner" | "mentor" | null>(null)
  const [otherParticipant, setOtherParticipant] = useState<OtherParticipant | null>(null)
  const [agoraConfig, setAgoraConfig] = useState<AgoraConfig | null>(null)
  const [error, setError] = useState<string>("")
  const [isReconnection, setIsReconnection] = useState(false)
  const [previouslyJoinedAt, setPreviouslyJoinedAt] = useState<string | null>(null)
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Load initial session data - fixed dependencies
  const loadSessionData = useCallback(async () => {
    if (!sessionId) return

    setIsLoading(true)
    setError("")

    try {
      const response = await fetch(`/api/sessions/${sessionId}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Session not found")
        } else if (response.status === 403) {
          throw new Error("You are not authorized to access this session")
        } else {
          throw new Error("Failed to load session data")
        }
      }

      const data = await response.json()
      
      setSessionData(data.session)
      setUserRole(data.userRole)
      setOtherParticipant(data.otherParticipant)
      setIsReconnection(data.isReconnection || false)
      setPreviouslyJoinedAt(data.previouslyJoinedAt)

      // Determine initial phase based on session status and timing
      const now = new Date()
      const sessionStartTime = new Date(data.session.startTime)
      
      if (["completed", "cancelled"].includes(data.session.status)) {
        setSessionPhase("ended")
      } else if (data.session.status === "ongoing" && now >= sessionStartTime) {
        // Session is ongoing and start time is met - go directly to video call
        setSessionPhase("video_call")
        // Load Agora token immediately
        loadAgoraToken().then(agoraData => {
          if (agoraData) {
            setAgoraConfig(agoraData)
          }
        }).catch(error => {
          console.error("Error loading Agora token:", error)
          setSessionPhase("waiting_room")
        })
      } else if ((data.session.status === "ongoing" || ["confirmed", "upcoming"].includes(data.session.status)) && now >= sessionStartTime) {
        // Session time has been met but status might not be updated yet - go to video call
        setSessionPhase("video_call")
        // Load Agora token immediately
        loadAgoraToken().then(agoraData => {
          if (agoraData) {
            setAgoraConfig(agoraData)
          }
        }).catch(error => {
          console.error("Error loading Agora token:", error)
          setSessionPhase("waiting_room")
        })
      } else {
        // Session time hasn't been met yet - go to waiting room
        setSessionPhase("waiting_room")
      }

    } catch (error) {
      console.error("Error loading session:", error)
      setError(error instanceof Error ? error.message : "Failed to load session")
      setSessionPhase("error")
    } finally {
      setIsLoading(false)
    }
  }, [sessionId]) // Fixed: include sessionId

  // Load Agora token for video call - fixed dependencies
  const loadAgoraToken = useCallback(async () => {
    if (!sessionId) return null

    try {
      const response = await fetch("/api/agora/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId: parseInt(sessionId) }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to get video call token")
      }

      const data = await response.json()
      return {
        appId: data.appId,
        channel: data.channel,
        token: data.token,
        uid: data.uid,
      }
    } catch (error) {
      console.error("Error getting Agora token:", error)
      throw error
    }
  }, [sessionId]) // Fixed: include sessionId

  // Handle joining video call
  const handleJoinVideoCall = useCallback(async () => {
    setIsLoading(true)
    setError("")

    try {
      const agoraData = await loadAgoraToken()
      if (!agoraData) {
        throw new Error("Failed to get video call configuration")
      }

      setAgoraConfig(agoraData)
      setSessionPhase("video_call")
    } catch (error) {
      console.error("Error joining video call:", error)
      setError(error instanceof Error ? error.message : "Failed to join video call")
    } finally {
      setIsLoading(false)
    }
  }, [loadAgoraToken])

  // Handle ending call - fixed dependencies
  const handleEndCall = useCallback(async () => {
    try {
      await fetch(`/api/sessions/${sessionId}/end`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })
    } catch (error) {
      console.error("Error ending session:", error)
    }

    setSessionPhase("ended")
    setShowRatingModal(true)
  }, [sessionId]) // Fixed: include sessionId

  // Handle connection errors
  const handleConnectionError = useCallback((errorMessage: string) => {
    setError(errorMessage)
  }, [])

  // Handle rating submission
  const handleRatingSubmitted = useCallback(() => {
    setShowRatingModal(false)
    if (userRole) {
      router.push(`/${userRole}/dashboard`)
    }
  }, [router, userRole])

  // Handle navigation back to dashboard
  const handleBackToDashboard = useCallback(() => {
    if (userRole) {
      router.push(`/${userRole}/dashboard`)
    }
  }, [router, userRole])

  // Handle retry
  const handleRetry = useCallback(() => {
    setSessionPhase("loading")
    loadSessionData()
  }, [loadSessionData])

  // Load session data on mount - only run once
  useEffect(() => {
    loadSessionData()
  }, [loadSessionData])

  // Rest of component remains the same...
  if (sessionPhase === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center">
        <Card className="w-full max-w-md bg-slate-900/95 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-12 w-12 text-blue-400 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">
              {sessionPhase === "loading" ? "Loading session..." : "Preparing video call..."}
            </h2>
            <p className="text-slate-400">
              {sessionPhase === "loading" 
                ? "Getting your session details ready" 
                : "Setting up video connection"
              }
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error state
  if (sessionPhase === "error") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-red-950 to-slate-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-900/95 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Session Error</h2>
            <Alert className="mb-6 bg-red-900/20 border-red-600/30">
              <AlertDescription className="text-red-300">
                {error}
              </AlertDescription>
            </Alert>
            <div className="space-y-3">
              <Button onClick={handleRetry} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button variant="outline" onClick={handleBackToDashboard} className="w-full">
                <Home className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Session ended state
  if (sessionPhase === "ended") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-green-950 to-slate-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-900/95 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-green-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="w-8 h-8 bg-green-500 rounded-full" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Session Completed</h2>
            <p className="text-slate-400 mb-6">
              Your mentorship session has ended. Thank you for participating!
            </p>
            <Button onClick={handleBackToDashboard} className="w-full">
              <Home className="h-4 w-4 mr-2" />
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>

        {showRatingModal && sessionData && otherParticipant && (
          <SessionRatingModal
            sessionId={parseInt(sessionId)}
            onClose={handleRatingSubmitted}
          />
        )}
      </div>
    )
  }

  // Waiting room
  if (sessionPhase === "waiting_room" && sessionData && otherParticipant) {
    return (
      <>
        <WaitingRoom
          sessionId={sessionId}
          sessionData={sessionData}
          userRole={userRole!}
          otherParticipant={otherParticipant}
          onJoinVideoCall={handleJoinVideoCall}
          isReconnection={isReconnection}
          previouslyJoinedAt={previouslyJoinedAt}
        />

        {error && (
          <div className="fixed top-4 right-4 z-50 max-w-md">
            <Alert className="bg-red-900/20 border-red-600/30">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-300">
                {error}
              </AlertDescription>
            </Alert>
          </div>
        )}
      </>
    )
  }

  // Video call
  if (sessionPhase === "video_call" && sessionData && otherParticipant && agoraConfig) {
    return (
      <VideoCallRoom
        sessionId={sessionId}
        sessionData={sessionData}
        userRole={userRole!}
        otherParticipant={otherParticipant}
        agoraConfig={agoraConfig}
        onEndCall={handleEndCall}
        onConnectionError={handleConnectionError}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center">
      <Card className="w-full max-w-md bg-slate-900/95 border-slate-700/50 backdrop-blur-sm">
        <CardContent className="p-8 text-center">
          <Loader2 className="h-12 w-12 text-blue-400 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Preparing session...</h2>
          <p className="text-slate-400">Please wait while we set everything up</p>
        </CardContent>
      </Card>
    </div>
  )
}