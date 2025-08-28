"use client"

import { useState, useEffect, useCallback, useRef } from "react"
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
  const [hasJoinedSession, setHasJoinedSession] = useState(false)

  // Refs for proper cleanup management
  const hasCalledLeaveRef = useRef(false)
  const isUnmountingRef = useRef(false)
  const lastKnownStatusRef = useRef<string | null>(null)

  // Load initial session data
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
      lastKnownStatusRef.current = data.session.status

      // Determine initial phase based on session status
      const now = new Date()
      const sessionStartTime = new Date(data.session.startTime)
      
      // Check for terminal session states first
      if (["completed", "cancelled", "both_no_show", "mentor_no_show", "learner_no_show", "technical_issues"].includes(data.session.status)) {
        console.log("[SESSION_PAGE] Session is in terminal state:", data.session.status)
        setSessionPhase("ended")
        return
      }

      // For active sessions, always go to waiting room first
      setSessionPhase("waiting_room")

    } catch (error) {
      console.error("Error loading session:", error)
      setError(error instanceof Error ? error.message : "Failed to load session")
      setSessionPhase("error")
    } finally {
      setIsLoading(false)
    }
  }, [sessionId])

  // Join session in backend - with better error handling
  const joinSessionBackend = useCallback(async (): Promise<boolean> => {
    if (!sessionId || hasJoinedSession) return hasJoinedSession

    try {
      console.log("[SESSION_PAGE] Joining session in backend...")
      const response = await fetch(`/api/sessions/${sessionId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to join session')
      }

      const data = await response.json()
      setHasJoinedSession(true)
      console.log("[SESSION_PAGE] Successfully joined session:", data.message)
      return true
    } catch (error) {
      console.error("[SESSION_PAGE] Error joining session:", error)
      setError(error instanceof Error ? error.message : "Failed to join session")
      return false
    }
  }, [sessionId, hasJoinedSession])

  // Load Agora token for video call
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
  }, [sessionId])

  // Handle joining video call from waiting room
  const handleJoinVideoCall = useCallback(async () => {
    setIsLoading(true)
    setError("")

    try {
      // Ensure user has joined the session
      if (!hasJoinedSession) {
        const joinSuccess = await joinSessionBackend()
        if (!joinSuccess) {
          throw new Error("Failed to join session")
        }
      }

      // Get Agora token with retry logic
      let agoraData = null
      let tokenAttempts = 0
      const maxTokenAttempts = 3
      
      while (tokenAttempts < maxTokenAttempts && !agoraData) {
        try {
          agoraData = await loadAgoraToken()
          break
        } catch (tokenError) {
          tokenAttempts++
          console.warn(`[SESSION_PAGE] Agora token attempt ${tokenAttempts} failed:`, tokenError)
          
          if (tokenAttempts < maxTokenAttempts) {
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 1000 * tokenAttempts))
          }
        }
      }
      
      if (!agoraData) {
        throw new Error("Unable to get video call configuration after multiple attempts. Please check your connection and try again.")
      }

      setAgoraConfig(agoraData)
      setSessionPhase("video_call")
    } catch (error) {
      console.error("Error joining video call:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to join video call"
      setError(`Video Call Error: ${errorMessage}`)
      
      // Don't change phase on error - stay in waiting room so user can retry
    } finally {
      setIsLoading(false)
    }
  }, [hasJoinedSession, joinSessionBackend, loadAgoraToken])

  // Handle leaving call - CRITICAL: Don't auto-complete session
  const handleLeaveCall = useCallback(async () => {
    console.log("[SESSION_PAGE] User leaving call - going to ended state")
    
    // Just go to ended state - VideoCallRoom handles the leave API call
    setSessionPhase("ended")
    
    // Show rating modal only for learners
    if (userRole === "learner") {
      setShowRatingModal(true)
    }
  }, [userRole])

  // Handle connection errors from video call
  const handleConnectionError = useCallback((errorMessage: string) => {
    console.error("[SESSION_PAGE] Connection error:", errorMessage)
    setError(errorMessage)
    
    // For connection errors, go back to waiting room instead of ending session
    setSessionPhase("waiting_room")
    setAgoraConfig(null) // Reset Agora config so user can retry
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
    setHasJoinedSession(false)
    setError("")
    setAgoraConfig(null)
    hasCalledLeaveRef.current = false
    loadSessionData()
  }, [loadSessionData])

  // Proper cleanup function
  const performCleanup = useCallback(async (reason: string) => {
    if (hasCalledLeaveRef.current || isUnmountingRef.current) {
      return
    }

    console.log(`[SESSION_PAGE] Performing cleanup: ${reason}`)
    
    // Only call leave if we actually joined and session isn't already terminal
    if (hasJoinedSession && lastKnownStatusRef.current && 
        !["completed", "cancelled", "both_no_show", "mentor_no_show", "learner_no_show", "technical_issues"].includes(lastKnownStatusRef.current)) {
      
      hasCalledLeaveRef.current = true
      
      try {
        // Use navigator.sendBeacon for more reliable cleanup on page unload
        if (reason === "beforeunload" && navigator.sendBeacon) {
          const blob = new Blob([JSON.stringify({})], { type: 'application/json' })
          navigator.sendBeacon(`/api/sessions/${sessionId}/leave`, blob)
        } else {
          await fetch(`/api/sessions/${sessionId}/leave`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          })
        }
        console.log("[SESSION_PAGE] Successfully called leave API in cleanup")
      } catch (error) {
        console.error("[SESSION_PAGE] Error in cleanup leave call:", error)
      }
    }
  }, [sessionId, hasJoinedSession])

  // Load session data on mount
  useEffect(() => {
    loadSessionData()
  }, [loadSessionData])

  // Handle browser events for cleanup with proper dependencies
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isUnmountingRef.current) {
        performCleanup("beforeunload")
      }
    }

    const handleVisibilityChange = () => {
      if (document.hidden && hasJoinedSession && sessionPhase === "video_call") {
        // User switched tabs/minimized during video call
        console.log("[SESSION_PAGE] Page hidden during video call")
      }
    }

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Cleanup function
    return () => {
      try {
        window.removeEventListener('beforeunload', handleBeforeUnload)
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      } catch (error) {
        // Ignore errors during cleanup - window might be unavailable
        console.warn("[SESSION_PAGE] Error removing event listeners:", error)
      }
    }
  }, []) // Remove dependencies to prevent re-adding listeners

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isUnmountingRef.current = true
      performCleanup("component_unmount")
    }
  }, [performCleanup])

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
            <h2 className="text-xl font-semibold text-white mb-2">Session Left</h2>
            <p className="text-slate-400 mb-6">
              You have left the mentorship session. Thank you for participating!
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
          hasJoinedSession={hasJoinedSession}
          onJoinSession={joinSessionBackend}
        />

        {error && (
          <div className="fixed top-4 right-4 z-50 max-w-md">
            <Alert className="bg-red-900/20 border-red-600/30">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-300">
                {error}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="ml-2 h-6 text-xs"
                  onClick={() => setError("")}
                >
                  Dismiss
                </Button>
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
        onLeaveCall={handleLeaveCall}
        onConnectionError={handleConnectionError}
        hasJoinedSession={hasJoinedSession}
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