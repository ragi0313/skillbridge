'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { useConversations } from '@/lib/hooks/useConversations'
import { getPusherConfig, getConversationChannel, PUSHER_EVENTS } from '@/lib/pusher/config'
import { toast } from 'sonner'

// Pusher client-side import
let pusherClient: any = null

if (typeof window !== 'undefined') {
  try {
    const config = getPusherConfig()
    if (config) {
      const PusherJS = require('pusher-js')
      pusherClient = new PusherJS(config.key, {
        cluster: config.cluster,
        encrypted: true,
      })
    }
  } catch (error) {
    console.warn('Pusher client not available:', error)
  }
}

interface ChatContextType {
  conversations: any[]
  loading: boolean
  isConnected: boolean
  totalUnreadCount: number
  fetchConversations: () => Promise<void>
  createConversation: (mentorUserId?: number, learnerUserId?: number) => Promise<any>
  deleteConversation: (conversationId: number) => Promise<void>
  getConversation: (conversationId: number) => any
  getConversationWithUser: (otherUserId: number) => any
  subscribeToConversation: (conversationId: number, onMessage: (message: any) => void) => () => void
  unsubscribeFromConversation: (conversationId: number) => void
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

interface ChatProviderProps {
  children: ReactNode
  user?: {
    id: number
    role: string
    firstName: string
    lastName: string
  } | null
}

export function ChatProvider({ children, user }: ChatProviderProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [subscribedChannels, setSubscribedChannels] = useState<Set<string>>(new Set())

  const onError = useCallback((error: string) => {
    console.error('Conversations error:', error)
  }, [])

  const {
    conversations,
    loading,
    fetchConversations,
    createConversation,
    deleteConversation,
    updateConversationWithMessage,
    updateReadStatus,
    getConversation,
    getConversationWithUser,
    getTotalUnreadCount,
  } = useConversations({
    userId: user?.id,
    onError
  })

  // Initialize Pusher connection
  useEffect(() => {
    if (!pusherClient || !user) return

    const handleConnectionStateChange = (states: any) => {
      setIsConnected(states.current === 'connected')
    }

    pusherClient.connection.bind('state_change', handleConnectionStateChange)

    // Initial connection state
    setIsConnected(pusherClient.connection.state === 'connected')

    return () => {
      pusherClient.connection.unbind('state_change', handleConnectionStateChange)
    }
  }, [user])

  // Fetch conversations on mount
  useEffect(() => {
    if (user) {
      fetchConversations()
    }
  }, [user?.id]) // Only depend on user ID to avoid infinite loops

  // Subscribe to conversation for real-time updates
  const subscribeToConversation = useCallback((conversationId: number, onMessage: (message: any) => void) => {
    if (!pusherClient) {
      console.warn('Pusher not available, falling back to polling')
      return () => {}
    }

    const channelName = getConversationChannel(conversationId)

    if (subscribedChannels.has(channelName)) {
      // Already subscribed
      return () => {}
    }

    try {
      const channel = pusherClient.subscribe(channelName)
      setSubscribedChannels(prev => new Set([...prev, channelName]))

      // Bind to new message events
      channel.bind(PUSHER_EVENTS.NEW_MESSAGE, (message: any) => {
        // Only process if message is not from current user (avoid duplicates)
        if (user && message.senderId !== user.id) {
          onMessage(message)
          updateConversationWithMessage(message)

          // Show notification if user is not currently viewing this conversation
          toast.info(`New message from ${message.sender.firstName}`, {
            action: {
              label: 'View',
              onClick: () => {
                // Could trigger opening the conversation
                window.dispatchEvent(new CustomEvent('openMiniChat', {
                  detail: { conversationId }
                }))
              }
            }
          })
        }
      })

      // Bind to conversation read events
      channel.bind(PUSHER_EVENTS.CONVERSATION_READ, (data: any) => {
        updateReadStatus(data.conversationId, data.userId, data.readAt)
      })

      // Bind to message deleted events
      channel.bind(PUSHER_EVENTS.MESSAGE_DELETED, (data: any) => {
        // Handle message deletion in UI
        console.log('Message deleted:', data)
      })

      console.log(`Subscribed to conversation channel: ${channelName}`)

      // Return unsubscribe function
      return () => {
        channel.unbind_all()
        pusherClient.unsubscribe(channelName)
        setSubscribedChannels(prev => {
          const next = new Set(prev)
          next.delete(channelName)
          return next
        })
        console.log(`Unsubscribed from conversation channel: ${channelName}`)
      }
    } catch (error) {
      console.error('Error subscribing to conversation:', error)
      return () => {}
    }
  }, [user, updateConversationWithMessage, updateReadStatus])

  // Unsubscribe from conversation
  const unsubscribeFromConversation = useCallback((conversationId: number) => {
    if (!pusherClient) return

    const channelName = getConversationChannel(conversationId)

    try {
      pusherClient.unsubscribe(channelName)
      setSubscribedChannels(prev => {
        const next = new Set(prev)
        next.delete(channelName)
        return next
      })
      console.log(`Unsubscribed from conversation channel: ${channelName}`)
    } catch (error) {
      console.error('Error unsubscribing from conversation:', error)
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Unsubscribe from all channels
      subscribedChannels.forEach(channelName => {
        try {
          pusherClient?.unsubscribe(channelName)
        } catch (error) {
          console.error('Error unsubscribing from channel:', channelName, error)
        }
      })
    }
  }, [subscribedChannels])

  const totalUnreadCount = getTotalUnreadCount()

  const contextValue: ChatContextType = {
    conversations,
    loading,
    isConnected,
    totalUnreadCount,
    fetchConversations,
    createConversation,
    deleteConversation,
    getConversation,
    getConversationWithUser,
    subscribeToConversation,
    unsubscribeFromConversation,
  }

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const context = useContext(ChatContext)
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider')
  }
  return context
}