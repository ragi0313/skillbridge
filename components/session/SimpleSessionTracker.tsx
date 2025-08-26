"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useSessionUpdates } from "@/lib/hooks/useSessionUpdates"

interface SessionState {
  id: number
  status: string
  startTime: Date
  endTime: Date
  learnerJoined: boolean
  mentorJoined: boolean
  isActive: boolean
  timeRemaining: number
}

interface SimpleSessionTrackerProps {
  sessionId: number
  initialState?: Partial<SessionState>
  onStateChange?: (state: SessionState) => void
  onSessionEnd?: (reason: 'completed' | 'force_disconnect' | 'time_expired') => void
  onForceDisconnect?: (reason: string) => void
}

export function SimpleSessionTracker({
  sessionId,
  initialState,
  onStateChange,
  onSessionEnd,
  onForceDisconnect
}: SimpleSessionTrackerProps) {
  const [sessionState, setSessionState] = useState<SessionState>(() => ({
    id: sessionId,
    status: 'pending',
    startTime: new Date(),
    endTime: new Date(),
    learnerJoined: false,
    mentorJoined: false,
    isActive: false,
    timeRemaining: 0,
    ...initialState
  }))

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const cleanupRef = useRef<(() => void)[]>([])

  // Session updates hook for real-time communication
  const { isConnected: sseConnected } = useSessionUpdates({
    onSessionUpdate: (data) => {
      if (data.sessionId.toString() === sessionId.toString()) {
        handleSessionUpdate(data)
      }
    },
    enableToasts: false // Let parent handle notifications
  })

  // Handle session updates from SSE
  const handleSessionUpdate = useCallback((data: any) => {
    if (data.type === 'force_disconnect') {
      handleForceDisconnect(data.message || 'Session ended by system')
    } else if (data.type === 'session_terminated') {
      handleSessionEnd('completed')
    } else if (data.type === 'status_change') {
      setSessionState(prev => ({
        ...prev,
        status: data.newStatus
      }))
    } else if (data.type === 'participant_joined') {
      setSessionState(prev => ({
        ...prev,
        learnerJoined: data.userRole === 'learner' ? true : prev.learnerJoined,
        mentorJoined: data.userRole === 'mentor' ? true : prev.mentorJoined
      }))
    } else if (data.type === 'participant_left') {
      setSessionState(prev => ({
        ...prev,
        learnerJoined: data.userRole === 'learner' ? false : prev.learnerJoined,
        mentorJoined: data.userRole === 'mentor' ? false : prev.mentorJoined
      }))
    }
  }, [sessionId])

  // Handle force disconnect
  const handleForceDisconnect = useCallback((reason: string) => {
    setSessionState(prev => ({
      ...prev,
      isActive: false,
      status: 'cancelled'
    }))
    
    onForceDisconnect?.(reason)
    cleanup()
  }, [onForceDisconnect])

  // Handle session end
  const handleSessionEnd = useCallback((reason: 'completed' | 'force_disconnect' | 'time_expired') => {
    setSessionState(prev => ({
      ...prev,
      isActive: false,
      timeRemaining: 0,
      status: reason === 'completed' ? 'completed' : 'cancelled'
    }))

    onSessionEnd?.(reason)
    cleanup()
  }, [onSessionEnd])

  // Start session timer
  const startTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    timerRef.current = setInterval(() => {
      setSessionState(prev => {
        const now = new Date()
        const remaining = Math.max(0, Math.floor((prev.endTime.getTime() - now.getTime()) / 1000))
        
        if (remaining === 0 && prev.isActive) {
          // Session time expired
          handleSessionEnd('time_expired')
          return prev
        }

        return {
          ...prev,
          timeRemaining: remaining
        }
      })
    }, 1000)

    // Add cleanup function
    cleanupRef.current.push(() => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    })
  }, [handleSessionEnd])

  // Initialize session state
  const initializeSession = useCallback(async () => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/join`)
      if (!response.ok) {
        throw new Error('Failed to load session data')
      }

      const data = await response.json()
      
      const newState: SessionState = {
        id: sessionId,
        status: data.sessionDetails.status,
        startTime: new Date(data.sessionDetails.startTime),
        endTime: new Date(data.sessionDetails.endTime),
        learnerJoined: !!data.sessionDetails.learnerJoinedAt,
        mentorJoined: !!data.sessionDetails.mentorJoinedAt,
        isActive: data.sessionDetails.status === 'ongoing',
        timeRemaining: 0 // Will be calculated by timer
      }

      // Calculate initial time remaining
      const now = new Date()
      const remaining = Math.max(0, Math.floor((newState.endTime.getTime() - now.getTime()) / 1000))
      newState.timeRemaining = remaining

      setSessionState(newState)

      // Start timer if session is active
      if (newState.isActive) {
        startTimer()
      }

    } catch (error) {
      console.error('[SESSION_TRACKER] Error initializing session:', error)
    }
  }, [sessionId, startTimer])

  // Cleanup function
  const cleanup = useCallback(() => {
    cleanupRef.current.forEach(cleanupFn => cleanupFn())
    cleanupRef.current = []
    
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // Public API methods
  const markAsJoined = useCallback(() => {
    setSessionState(prev => ({
      ...prev,
      isActive: true,
      status: 'ongoing'
    }))
    startTimer()
  }, [startTimer])

  const markAsLeft = useCallback(() => {
    setSessionState(prev => ({
      ...prev,
      isActive: false
    }))
    // Note: Don't cleanup timer here, session might continue with other participant
  }, [])

  // Effect to call onStateChange when state changes
  useEffect(() => {
    onStateChange?.(sessionState)
  }, [sessionState, onStateChange])

  // Initialize on mount
  useEffect(() => {
    if (!initialState) {
      initializeSession()
    } else {
      // Calculate time remaining for initial state
      const now = new Date()
      const remaining = Math.max(0, Math.floor((sessionState.endTime.getTime() - now.getTime()) / 1000))
      
      setSessionState(prev => ({
        ...prev,
        timeRemaining: remaining
      }))

      if (sessionState.isActive) {
        startTimer()
      }
    }

    // Cleanup on unmount
    return cleanup
  }, []) // Only run on mount

  // Expose methods and state for parent component
  return {
    sessionState,
    markAsJoined,
    markAsLeft,
    sseConnected,
    cleanup
  }
}

// Hook version of SimpleSessionTracker for easier use
export function useSimpleSessionTracker(props: SimpleSessionTrackerProps) {
  const trackerRef = useRef<any>(null)
  
  useEffect(() => {
    trackerRef.current = SimpleSessionTracker(props)
    
    return () => {
      if (trackerRef.current?.cleanup) {
        trackerRef.current.cleanup()
      }
    }
  }, [props.sessionId])

  return trackerRef.current || {
    sessionState: {
      id: props.sessionId,
      status: 'pending',
      startTime: new Date(),
      endTime: new Date(),
      learnerJoined: false,
      mentorJoined: false,
      isActive: false,
      timeRemaining: 0
    },
    markAsJoined: () => {},
    markAsLeft: () => {},
    sseConnected: false,
    cleanup: () => {}
  }
}