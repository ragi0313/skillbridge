"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import { toast } from "@/lib/toast"

export interface SessionUpdateData {
  type: 'session_update' | 'force_disconnect' | 'session_terminated' | 'participant_joined' | 'participant_left'
  sessionId: number
  updateType?: 'status_change' | 'participant_change'
  newStatus?: string
  previousStatus?: string
  message?: string
  session?: {
    id: number
    status: string
    scheduledDate: string
    createdAt?: string
    mentorResponseAt?: string
    expiresAt?: string
    mentorUser?: {
      firstName: string
      lastName: string
    }
    learnerUser?: {
      firstName: string
      lastName: string
    }
  }
}

interface UseSessionUpdatesOptions {
  onSessionUpdate?: (data: SessionUpdateData) => void
  enableToasts?: boolean
  reconnectAttempts?: number
  reconnectInterval?: number
}

interface UseSessionUpdatesReturn {
  isConnected: boolean
  reconnect: () => void
  disconnect: () => void
  lastMessage: SessionUpdateData | null
}

export function useSessionUpdates({
  onSessionUpdate,
  enableToasts = false,
  reconnectAttempts = 5,
  reconnectInterval = 3000
}: UseSessionUpdatesOptions = {}): UseSessionUpdatesReturn {
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<SessionUpdateData | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectCountRef = useRef(0)
  const isManualDisconnectRef = useRef(false)

  const connect = useCallback(() => {
    if (eventSourceRef.current && eventSourceRef.current.readyState === EventSource.OPEN) {
      return // Already connected
    }

    try {
      const eventSource = new EventSource('/api/sse/session-updates')
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        console.log('[SSE] Connection opened')
        setIsConnected(true)
        reconnectCountRef.current = 0
        
        if (enableToasts && reconnectCountRef.current > 0) {
          toast.success('Real-time updates reconnected')
        }
      }

      eventSource.onmessage = (event) => {
        try {
          const data: SessionUpdateData = JSON.parse(event.data)
          setLastMessage(data)
          
          if (onSessionUpdate) {
            onSessionUpdate(data)
          }

          // Handle toast notifications
          if (enableToasts) {
            if (data.type === 'force_disconnect') {
              toast.error('Session ended - you have been disconnected')
            } else if (data.type === 'session_terminated') {
              toast.info('Session completed')
            }
          }
        } catch (error) {
          console.error('[SSE] Failed to parse message:', error)
        }
      }

      eventSource.onerror = (error) => {
        console.error('[SSE] Connection error:', error)
        setIsConnected(false)
        eventSource.close()

        // Attempt reconnection if not manually disconnected
        if (!isManualDisconnectRef.current && reconnectCountRef.current < reconnectAttempts) {
          const delay = reconnectInterval * Math.pow(1.5, reconnectCountRef.current)
          
          if (enableToasts) {
            toast.error(`Connection lost. Reconnecting in ${delay / 1000}s...`)
          }

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectCountRef.current++
            connect()
          }, delay)
        } else if (reconnectCountRef.current >= reconnectAttempts) {
          if (enableToasts) {
            toast.error('Unable to maintain real-time connection. Please refresh the page.')
          }
        }
      }
    } catch (error) {
      console.error('[SSE] Failed to establish connection:', error)
      setIsConnected(false)
    }
  }, [onSessionUpdate, enableToasts, reconnectAttempts, reconnectInterval])

  const disconnect = useCallback(() => {
    isManualDisconnectRef.current = true
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    setIsConnected(false)
  }, [])

  const reconnect = useCallback(() => {
    disconnect()
    isManualDisconnectRef.current = false
    reconnectCountRef.current = 0
    setTimeout(connect, 100) // Small delay to ensure clean reconnection
  }, [connect, disconnect])

  // Initialize connection on mount
  useEffect(() => {
    isManualDisconnectRef.current = false
    connect()

    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [])

  return {
    isConnected,
    reconnect,
    disconnect,
    lastMessage
  }
}