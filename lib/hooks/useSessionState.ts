import { useEffect, useState, useCallback, useRef } from 'react'

export interface SessionState {
  id: number
  status: string
  learnerJoinedAt: string | null
  mentorJoinedAt: string | null  
  learnerLeftAt: string | null
  mentorLeftAt: string | null
  agoraCallStartedAt: string | null
  agoraCallEndedAt: string | null
  lastUpdated: string
}

export interface SessionStateUpdate {
  type: 'status_change' | 'user_joined' | 'user_left' | 'call_started' | 'call_ended'
  sessionId: number
  data: Partial<SessionState>
  timestamp: string
}

interface UseSessionStateOptions {
  sessionId: string
  userId: number
  userRole: 'learner' | 'mentor'
  onStateChange?: (state: SessionState) => void
  enablePolling?: boolean
  pollingInterval?: number
}

export function useSessionState(options: UseSessionStateOptions) {
  const {
    sessionId,
    userId,
    userRole,
    onStateChange,
    enablePolling = true,
    pollingInterval = 5000
  } = options

  const [sessionState, setSessionState] = useState<SessionState | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)
  
  const eventSourceRef = useRef<EventSource | null>(null)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)

  // Fetch current session state
  const fetchSessionState = useCallback(async () => {
    if (!isMountedRef.current) return null
    
    try {
      const response = await fetch(`/api/sessions/${sessionId}`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      const state: SessionState = {
        id: data.session.id,
        status: data.session.status,
        learnerJoinedAt: data.learnerJoinedAt,
        mentorJoinedAt: data.mentorJoinedAt,
        learnerLeftAt: data.learnerLeftAt,
        mentorLeftAt: data.mentorLeftAt,
        agoraCallStartedAt: data.session.agoraCallStartedAt,
        agoraCallEndedAt: data.session.agoraCallEndedAt,
        lastUpdated: new Date().toISOString()
      }
      
      if (isMountedRef.current) {
        setSessionState(state)
        setLastError(null)
        onStateChange?.(state)
      }
      
      return state
    } catch (error) {
      console.error('[SESSION_STATE] Error fetching session state:', error)
      if (isMountedRef.current) {
        setLastError(error instanceof Error ? error.message : 'Failed to fetch session state')
      }
      return null
    }
  }, [sessionId, onStateChange])

  // Set up Server-Sent Events for real-time updates
  const setupSSE = useCallback(() => {
    if (eventSourceRef.current || !isMountedRef.current) {
      return
    }

    try {
      const eventSource = new EventSource(`/api/sse/session-updates?sessionId=${sessionId}&userId=${userId}`)
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        console.log('[SESSION_STATE] SSE connection opened')
        if (isMountedRef.current) {
          setIsConnected(true)
          setLastError(null)
        }
      }

      eventSource.onmessage = (event) => {
        if (!isMountedRef.current) return
        
        try {
          const update: SessionStateUpdate = JSON.parse(event.data)
          
          if (update.sessionId === parseInt(sessionId)) {
            setSessionState(prevState => {
              if (!prevState) return null
              
              const newState = {
                ...prevState,
                ...update.data,
                lastUpdated: update.timestamp
              }
              
              console.log('[SESSION_STATE] Received update:', update.type, newState)
              onStateChange?.(newState)
              return newState
            })
          }
        } catch (error) {
          console.error('[SESSION_STATE] Error parsing SSE message:', error)
        }
      }

      eventSource.onerror = (error) => {
        console.error('[SESSION_STATE] SSE error:', error)
        if (isMountedRef.current) {
          setIsConnected(false)
          setLastError('Real-time connection lost')
        }
        
        // Cleanup and retry connection after delay
        if (eventSourceRef.current) {
          eventSourceRef.current.close()
          eventSourceRef.current = null
        }
        
        // Retry connection after 5 seconds
        setTimeout(() => {
          if (isMountedRef.current) {
            setupSSE()
          }
        }, 5000)
      }
    } catch (error) {
      console.error('[SESSION_STATE] Error setting up SSE:', error)
      if (isMountedRef.current) {
        setLastError('Failed to setup real-time connection')
      }
    }
  }, [sessionId, userId, onStateChange])

  // Set up polling fallback
  const setupPolling = useCallback(() => {
    if (!enablePolling || pollingIntervalRef.current || !isMountedRef.current) {
      return
    }

    pollingIntervalRef.current = setInterval(() => {
      if (isMountedRef.current) {
        fetchSessionState()
      }
    }, pollingInterval)
  }, [enablePolling, pollingInterval, fetchSessionState])

  // Initialize
  useEffect(() => {
    isMountedRef.current = true
    
    // Fetch initial state
    fetchSessionState()
    
    // Set up real-time updates
    setupSSE()
    
    // Set up polling as fallback
    if (enablePolling) {
      setupPolling()
    }

    return () => {
      isMountedRef.current = false
      
      // Cleanup SSE
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      
      // Cleanup polling
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
      
      setIsConnected(false)
    }
  }, [fetchSessionState, setupSSE, setupPolling, enablePolling])

  // Manual refresh function
  const refresh = useCallback(() => {
    return fetchSessionState()
  }, [fetchSessionState])

  // Reconnect function
  const reconnect = useCallback(() => {
    // Cleanup existing connections
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    
    setIsConnected(false)
    setLastError(null)
    
    // Restart connections
    setupSSE()
    fetchSessionState()
  }, [setupSSE, fetchSessionState])

  return {
    sessionState,
    isConnected,
    lastError,
    refresh,
    reconnect
  }
}