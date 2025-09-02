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

interface CurrentUser {
  firstName: string
  lastName: string
  profilePictureUrl?: string | null
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
  rtmToken?: string // Add RTM token support
  rtmUserId?: string // Add RTM user ID support
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
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
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
  const isTokenRequestInProgressRef = useRef(false)

  // Load initial session data
  const loadSessionData = useCallback(async () => {
    if (!sessionId) return

    setIsLoading(true)
    setError("")

    try {
      console.log("[SESSION_PAGE] Loading session data for:", sessionId)
      const response = await fetch(`/api/sessions/${sessionId}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Session not found")
        } else if (response.status === 403) {
          throw new Error("You are not authorized to access this session")
        } else {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || "Failed to load session data")
        }
      }

      const data = await response.json()
      
      console.log("[SESSION_PAGE] Session data loaded:", {
        sessionStatus: data.session.status,
        userRole: data.userRole,
        isReconnection: data.isReconnection
      })
      
      setSessionData(data.session)
      setUserRole(data.userRole)
      setCurrentUser(data.currentUser)
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
      console.log("[SESSION_PAGE] Setting phase to waiting_room")
      setSessionPhase("waiting_room")

    } catch (error) {
      console.error("[SESSION_PAGE] Error loading session:", error)
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
        const data = await response.json().catch(() => ({}))
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

  // Load Agora token for video call - with enhanced validation and retry logic
  const loadAgoraToken = useCallback(async (forceNew: boolean = false) => {
    if (!sessionId) return null

    // Prevent concurrent token requests
    if (isTokenRequestInProgressRef.current) {
      console.log("[SESSION_PAGE] Token request already in progress, waiting...")
      // Wait for existing request to complete
      while (isTokenRequestInProgressRef.current) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      return null
    }

    isTokenRequestInProgressRef.current = true

    try {
      console.log("[SESSION_PAGE] Requesting Agora tokens, forceNew:", forceNew)
      
      const requestBody = { 
        sessionId: parseInt(sessionId),
        forceNew: forceNew || false
      }

      console.log("[SESSION_PAGE] Token request body:", requestBody)

      const response = await fetch("/api/agora/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        console.error("[SESSION_PAGE] Token request failed:", response.status, data)
        throw new Error(data.error || `Failed to get video call token (${response.status})`)
      }

      const data = await response.json()
      console.log("[SESSION_PAGE] Token response received:", {
        hasAppId: !!data.appId,
        hasChannel: !!data.channel,
        hasToken: !!data.token,
        hasRtmToken: !!data.rtmToken, // Check RTM token
        hasUid: !!data.uid,
        tokenLength: data.token?.length || 0,
        rtmTokenLength: data.rtmToken?.length || 0, // Log RTM token length
        channel: data.channel,
        uid: data.uid
      })
      
      // Validate the token data before returning
      if (!data.appId || !data.channel || !data.token || data.uid === undefined) {
        console.error("[SESSION_PAGE] Invalid token data received:", {
          appId: !!data.appId,
          channel: !!data.channel,
          token: !!data.token,
          rtmToken: !!data.rtmToken,
          uid: data.uid
        })
        throw new Error("Invalid token data received from server")
      }

      if (data.token.length < 50) {
        console.error("[SESSION_PAGE] RTC token appears malformed, length:", data.token.length)
        throw new Error("RTC token appears to be malformed")
      }

      // Validate RTC token format
      if (!data.token.startsWith('006') && !data.token.startsWith('007')) {
        console.error("[SESSION_PAGE] RTC token has unexpected prefix:", data.token.substring(0, 3))
        throw new Error("RTC token format appears invalid")
      }

      // Validate RTM token if present
      if (data.rtmToken) {
        if (data.rtmToken.length < 50) {
          console.warn("[SESSION_PAGE] RTM token appears malformed, length:", data.rtmToken.length)
          // Don't throw error for RTM token - chat can be disabled
          data.rtmToken = undefined
        } else if (!data.rtmToken.startsWith('006') && !data.rtmToken.startsWith('007')) {
          console.warn("[SESSION_PAGE] RTM token has unexpected prefix:", data.rtmToken.substring(0, 3))
          // Don't throw error for RTM token - chat can be disabled
          data.rtmToken = undefined
        }
      } else {
        console.warn("[SESSION_PAGE] No RTM token received - chat functionality will be disabled")
      }

      console.log("[SESSION_PAGE] Successfully validated Agora tokens")

      return {
        appId: data.appId,
        channel: data.channel,
        token: data.token,
        rtmToken: data.rtmToken, // Include RTM token (may be undefined)
        uid: data.uid,
      }
    } catch (error) {
      console.error("[SESSION_PAGE] Error getting Agora tokens:", error)
      throw error
    } finally {
      isTokenRequestInProgressRef.current = false
    }
  }, [sessionId])

  // Handle joining video call from waiting room - with improved error handling
  const handleJoinVideoCall = useCallback(async () => {
    if (isLoading) {
      console.log("[SESSION_PAGE] Already loading, ignoring duplicate call")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      console.log("[SESSION_PAGE] Starting video call join process...")
      
      // Ensure user has joined the session
      if (!hasJoinedSession) {
        console.log("[SESSION_PAGE] User hasn't joined session yet, joining now...")
        const joinSuccess = await joinSessionBackend()
        if (!joinSuccess) {
          throw new Error("Failed to join session")
        }
        // Wait a moment for the backend state to settle
        console.log("[SESSION_PAGE] Waiting for backend state to settle...")
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      // Get Agora tokens with improved retry logic
      let agoraData = null
      let tokenAttempts = 0
      const maxTokenAttempts = 3
      let lastError: Error | null = null
      
      while (tokenAttempts < maxTokenAttempts && !agoraData) {
        try {
          tokenAttempts++
          console.log(`[SESSION_PAGE] Token attempt ${tokenAttempts}/${maxTokenAttempts}`)
          
          // Force new token on retry attempts
          const forceNew = tokenAttempts > 1
          agoraData = await loadAgoraToken(forceNew)
          
          if (agoraData) {
            console.log("[SESSION_PAGE] Successfully obtained Agora tokens")
            break
          }
        } catch (tokenError) {
          lastError = tokenError instanceof Error ? tokenError : new Error(String(tokenError))
          console.warn(`[SESSION_PAGE] Agora token attempt ${tokenAttempts} failed:`, tokenError)
          
          if (tokenAttempts < maxTokenAttempts) {
            const baseDelay = 1000 * Math.pow(2, tokenAttempts - 1)
            const jitter = Math.random() * 500
            const delay = baseDelay + jitter
            console.log(`[SESSION_PAGE] Waiting ${delay}ms before retry...`)
            await new Promise(resolve => setTimeout(resolve, delay))
          }
        }
      }
      
      if (!agoraData) {
        const errorMsg = lastError?.message || "Unknown error"
        console.error("[SESSION_PAGE] Failed to get tokens after all attempts:", errorMsg)
        throw new Error(`Unable to get video call configuration after ${maxTokenAttempts} attempts. Last error: ${errorMsg}`)
      }

      console.log("[SESSION_PAGE] Successfully got Agora config, transitioning to video call")
      setAgoraConfig(agoraData)
      setSessionPhase("video_call")
      
    } catch (error) {
      console.error("[SESSION_PAGE] Error joining video call:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to join video call"
      setError(`Video Call Error: ${errorMessage}`)
      
      // Don't change phase on error - stay in waiting room so user can retry
    } finally {
      setIsLoading(false)
    }
  }, [hasJoinedSession, joinSessionBackend, loadAgoraToken, isLoading])

  // Handle leaving call - CRITICAL: Don't auto-complete session
  const handleLeaveCall = useCallback(async (reason?: string) => {
    console.log("[SESSION_PAGE] User leaving call, reason:", reason)
    
    // If user manually clicked leave, redirect to sessions management
    if (reason === "user_action") {
      console.log("[SESSION_PAGE] Manual leave detected, redirecting to sessions management")
      if (userRole) {
        router.push(`/${userRole}/sessions`)
      }
      return
    }
    
    // For automatic session end (timer expired), show the completion flow
    if (reason === "session_ended") {
      console.log("[SESSION_PAGE] Session timer expired, showing completion modal")
      setSessionPhase("ended")
      
      // Show rating modal only for learners on timer expiration
      if (userRole === "learner") {
        setShowRatingModal(true)
      }
      return
    }
    
    // For other reasons (connection errors, etc.), redirect to sessions management
    console.log("[SESSION_PAGE] Other leave reason, redirecting to sessions management")
    if (userRole) {
      router.push(`/${userRole}/sessions`)
    }
  }, [userRole, router])

  // Handle connection errors from video call - with enhanced logging
  const handleConnectionError = useCallback((errorMessage: string) => {
    console.error("[SESSION_PAGE] Connection error:", errorMessage)
    console.error("[SESSION_PAGE] Current state when error occurred:", {
      sessionPhase,
      hasJoinedSession,
      agoraConfigExists: !!agoraConfig,
      sessionId,
      userRole,
      sessionStatus: sessionData?.status,
      error: errorMessage
    })
    
    setError(`Connection Error: ${errorMessage}`)
    
    // For connection errors, go back to waiting room and force fresh config
    setSessionPhase("waiting_room")
    setAgoraConfig(null) // This is good - forces fresh token
    
    // Clear any cached state that might interfere
    isTokenRequestInProgressRef.current = false
    
  }, [sessionPhase, hasJoinedSession, agoraConfig, sessionId, userRole, sessionData])

  // Handle rating submission
  const handleRatingSubmitted = useCallback(() => {
    console.log("[SESSION_PAGE] Rating submitted, returning to sessions")
    setShowRatingModal(false)
    if (userRole) {
      router.push(`/${userRole}/sessions`)
    }
  }, [router, userRole])

  // Handle navigation back to sessions management
  const handleBackToSessions = useCallback(() => {
    console.log("[SESSION_PAGE] Navigating back to sessions management")
    if (userRole) {
      router.push(`/${userRole}/sessions`)
    }
  }, [router, userRole])

  // Handle retry with complete state reset
  const handleRetry = useCallback(() => {
    console.log("[SESSION_PAGE] Retrying - resetting all state")
    setSessionPhase("loading")
    setHasJoinedSession(false)
    setError("")
    setAgoraConfig(null)
    setSessionData(null)
    setCurrentUser(null)
    setOtherParticipant(null)
    hasCalledLeaveRef.current = false
    isTokenRequestInProgressRef.current = false
    loadSessionData()
  }, [loadSessionData])

  // Proper cleanup function
  const performCleanup = useCallback(async (reason: string) => {
    if (hasCalledLeaveRef.current || isUnmountingRef.current) {
      console.log("[SESSION_PAGE] Cleanup already performed or in progress")
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
          console.log("[SESSION_PAGE] Using sendBeacon for cleanup")
          const blob = new Blob([JSON.stringify({ reason })], { type: 'application/json' })
          navigator.sendBeacon(`/api/sessions/${sessionId}/leave`, blob)
        } else {
          console.log("[SESSION_PAGE] Using fetch for cleanup")
          await fetch(`/api/sessions/${sessionId}/leave`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason })
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
    console.log("[SESSION_PAGE] Component mounted, loading session data")
    loadSessionData()
  }, [loadSessionData])

  // Handle browser events for cleanup
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isUnmountingRef.current && hasJoinedSession) {
        console.log("[SESSION_PAGE] Page unloading, performing cleanup")
        performCleanup("beforeunload")
      }
    }

    const handleVisibilityChange = () => {
      if (document.hidden && hasJoinedSession && sessionPhase === "video_call") {
        console.log("[SESSION_PAGE] Page hidden during video call")
      } else if (!document.hidden && hasJoinedSession && sessionPhase === "video_call") {
        console.log("[SESSION_PAGE] Page visible during video call")
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
  }, [hasJoinedSession, sessionPhase, performCleanup])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log("[SESSION_PAGE] Component unmounting")
      isUnmountingRef.current = true
      performCleanup("component_unmount")
    }
  }, [performCleanup])

  // Loading state
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
                : "Setting up video connection and chat"
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
              <Button variant="outline" onClick={handleBackToSessions} className="w-full">
                <Home className="h-4 w-4 mr-2" />
                Back to Sessions
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
            <h2 className="text-xl font-semibold text-white mb-2">Session Complete</h2>
            <p className="text-slate-400 mb-6">
              You have left the mentorship session. Thank you for participating!
            </p>
            <Button onClick={handleBackToSessions} className="w-full">
              <Home className="h-4 w-4 mr-2" />
              Return to Sessions
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
  if (sessionPhase === "video_call" && sessionData && currentUser && otherParticipant && agoraConfig) {
    return (
      <VideoCallRoom
        sessionId={sessionId}
        sessionData={sessionData}
        userRole={userRole!}
        currentUser={currentUser}
        otherParticipant={otherParticipant}
        agoraConfig={agoraConfig}
        onLeaveCall={handleLeaveCall}
        onConnectionError={handleConnectionError}
        hasJoinedSession={hasJoinedSession}
      />
    )
  }

  // Fallback loading state
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