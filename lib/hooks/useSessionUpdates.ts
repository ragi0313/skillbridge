"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { toast } from "@/lib/toast"

export interface SessionUpdateData {
  type: 'connection' | 'heartbeat' | 'session_update'
  updateType?: 'status_change' | 'mentor_response' | 'cancellation' | 'refund' | 'other'
  sessionId?: number
  session?: any
  message?: string
  timestamp: string
  connectionId?: string
}

interface UseSessionUpdatesOptions {
  onSessionUpdate?: (data: SessionUpdateData) => void
  onConnectionChange?: (connected: boolean) => void
  enableToasts?: boolean
  reconnectDelay?: number
}

export function useSessionUpdates(options: UseSessionUpdatesOptions = {}) {
  const {
    onSessionUpdate,
    onConnectionChange,
    enableToasts = true,
    reconnectDelay = 3000
  } = options

  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<SessionUpdateData | null>(null)
  const [connectionId, setConnectionId] = useState<string | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    try {
      console.log("Establishing SSE connection for session updates...")
      const eventSource = new EventSource("/api/sse/session-updates")
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        console.log("SSE connection established")
        setIsConnected(true)
        reconnectAttempts.current = 0
        onConnectionChange?.(true)
        
        if (enableToasts && reconnectAttempts.current > 0) {
          toast.success("Reconnected to real-time updates")
        }
      }

      eventSource.onmessage = (event) => {
        try {
          const data: SessionUpdateData = JSON.parse(event.data)
          setLastUpdate(data)

          if (data.type === 'connection') {
            setConnectionId(data.connectionId || null)
            console.log("SSE connection confirmed:", data.connectionId)
          } else if (data.type === 'session_update') {
            console.log("Received session update:", data)
            onSessionUpdate?.(data)

            // Show toast notifications for important updates
            if (enableToasts && data.updateType) {
              const session = data.session
              const sessionInfo = session ? `Session with ${session.mentorUser?.firstName || session.learnerUser?.firstName || 'Unknown'}` : 'Session'
              
              switch (data.updateType) {
                case 'status_change':
                  if (session?.status === 'confirmed') {
                    toast.success(`${sessionInfo} has been confirmed!`)
                  } else if (session?.status === 'rejected') {
                    toast.error(`${sessionInfo} was declined`)
                  } else if (session?.status === 'cancelled') {
                    toast.info(`${sessionInfo} was cancelled`)
                  } else if (session?.status === 'completed') {
                    toast.success(`${sessionInfo} was completed`)
                  } else if (session?.status === 'no_show') {
                    toast.warning(`${sessionInfo} marked as no-show`)
                  }
                  break
                case 'mentor_response':
                  toast.info(`Mentor responded to your session request`)
                  break
                case 'cancellation':
                  toast.info(`${sessionInfo} has been cancelled`)
                  break
                case 'refund':
                  toast.success("Refund processed for your session")
                  break
              }
            }
          }
        } catch (error) {
          console.error("Error parsing SSE message:", error)
        }
      }

      eventSource.onerror = (error) => {
        console.error("SSE connection error:", error)
        setIsConnected(false)
        onConnectionChange?.(false)

        if (eventSource.readyState === EventSource.CLOSED) {
          console.log("SSE connection closed by server")
          
          // Attempt to reconnect if we haven't exceeded max attempts
          if (reconnectAttempts.current < maxReconnectAttempts) {
            reconnectAttempts.current++
            console.log(`Attempting to reconnect (${reconnectAttempts.current}/${maxReconnectAttempts}) in ${reconnectDelay}ms`)
            
            if (enableToasts) {
              toast.loading(`Reconnecting to real-time updates... (${reconnectAttempts.current}/${maxReconnectAttempts})`)
            }

            reconnectTimeoutRef.current = setTimeout(() => {
              connect()
            }, reconnectDelay)
          } else {
            console.log("Max reconnection attempts reached")
            if (enableToasts) {
              toast.error("Lost connection to real-time updates. Please refresh the page.")
            }
          }
        }
      }

    } catch (error) {
      console.error("Failed to establish SSE connection:", error)
      setIsConnected(false)
      onConnectionChange?.(false)
    }
  }, [onSessionUpdate, onConnectionChange, enableToasts, reconnectDelay])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    setIsConnected(false)
    setConnectionId(null)
    onConnectionChange?.(false)
    console.log("SSE connection disconnected")
  }, [onConnectionChange])

  const reconnect = useCallback(() => {
    disconnect()
    setTimeout(connect, 100) // Small delay before reconnecting
  }, [connect, disconnect])

  // Connect on mount
  useEffect(() => {
    connect()

    // Cleanup on unmount
    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, disconnect to save resources
        console.log("Page hidden, disconnecting SSE")
        disconnect()
      } else {
        // Page is visible, reconnect
        console.log("Page visible, reconnecting SSE")
        connect()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [connect, disconnect])

  return {
    isConnected,
    lastUpdate,
    connectionId,
    connect,
    disconnect,
    reconnect
  }
}