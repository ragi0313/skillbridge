"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "@/lib/toast"

interface SessionUpdateData {
  type: string
  sessionId?: number
  bookingId?: number
  updateType?: string
  message?: string
  reason?: string
  userRole?: string
  newStatus?: string
  refundAmount?: number
  timestamp: string
}

interface UseSessionUpdatesOptions {
  onSessionUpdate?: (data: SessionUpdateData) => void
  onBookingUpdate?: (data: SessionUpdateData) => void
  enableToasts?: boolean
}

export function useSessionUpdates({
  onSessionUpdate,
  onBookingUpdate,
  enableToasts = false
}: UseSessionUpdatesOptions = {}) {
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<SessionUpdateData | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5
  const reconnectDelay = useRef(1000) // Start with 1 second

  const connect = () => {
    if (eventSourceRef.current) {
      return
    }

    try {
      const eventSource = new EventSource('/api/sse/session-updates')
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        console.log('[SSE] Connected to session updates')
        setIsConnected(true)
        reconnectAttempts.current = 0
        reconnectDelay.current = 1000 // Reset delay on successful connection
      }

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          
          // Handle different message types
          if (data.type === 'connected') {
            console.log('[SSE] Initial connection confirmed')
            return
          }
          
          if (data.type === 'heartbeat') {
            // Just keep connection alive, no need to process
            return
          }

          if (data.type === 'session_update') {
            console.log('[SSE] Session update received:', data)
            setLastMessage(data)
            onSessionUpdate?.(data)

            if (enableToasts) {
              // Show appropriate toast based on update type
              if (data.updateType === 'force_disconnect') {
                toast.error(data.message || 'Session ended by system')
              } else if (data.updateType === 'session_terminated') {
                toast.info(data.message || 'Session completed')
              } else if (data.updateType === 'participant_joined') {
                toast.success(`${data.userRole === 'learner' ? 'Learner' : 'Mentor'} joined`)
              } else if (data.updateType === 'participant_left') {
                toast.info(`${data.userRole === 'learner' ? 'Learner' : 'Mentor'} left`)
              }
            }
          }

          if (data.type === 'booking_update') {
            console.log('[SSE] Booking update received:', data)
            setLastMessage(data)
            onBookingUpdate?.(data)

            if (enableToasts) {
              // Show appropriate toast based on update type
              if (data.updateType === 'status_changed') {
                if (data.newStatus === 'mentor_no_response') {
                  toast.info(`Booking expired - ${data.reason}. Refund: ${data.refundAmount} credits`)
                } else {
                  toast.info(`Booking status changed to ${data.newStatus}`)
                }
              }
            }
          }
        } catch (error) {
          console.error('[SSE] Error parsing message:', error, event.data)
        }
      }

      eventSource.onerror = () => {
        console.error('[SSE] Connection error')
        setIsConnected(false)
        eventSource.close()
        eventSourceRef.current = null
        
        // Attempt to reconnect if we haven't exceeded max attempts
        if (reconnectAttempts.current < maxReconnectAttempts) {
          console.log(`[SSE] Attempting to reconnect in ${reconnectDelay.current}ms (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`)
          
          setTimeout(() => {
            reconnectAttempts.current++
            reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30000) // Exponential backoff, max 30s
            connect()
          }, reconnectDelay.current)
          
          if (enableToasts && reconnectAttempts.current === 0) {
            toast.error('Lost connection to live updates. Attempting to reconnect...')
          }
        } else {
          console.error('[SSE] Max reconnection attempts reached')
          if (enableToasts) {
            toast.error('Unable to maintain live connection. Please refresh the page.')
          }
        }
      }
    } catch (error) {
      console.error('[SSE] Error creating EventSource:', error)
      setIsConnected(false)
    }
  }

  const disconnect = () => {
    if (eventSourceRef.current) {
      console.log('[SSE] Disconnecting from session updates')
      eventSourceRef.current.close()
      eventSourceRef.current = null
      setIsConnected(false)
    }
  }

  const reconnect = () => {
    disconnect()
    reconnectAttempts.current = 0
    reconnectDelay.current = 1000
    connect()
  }

  // Auto-connect on mount
  useEffect(() => {
    connect()
    
    // Cleanup on unmount
    return () => {
      disconnect()
    }
  }, [])

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isConnected) {
        console.log('[SSE] Page became visible, attempting to reconnect')
        reconnect()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isConnected])

  return {
    isConnected,
    lastMessage,
    reconnect,
    disconnect
  }
}