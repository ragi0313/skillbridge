import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'

export interface ConversationWithParticipants {
  id: number
  mentorId: number
  learnerId: number
  mentorLastReadAt: string | null
  learnerLastReadAt: string | null
  lastMessageAt: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  mentor: {
    id: number
    userId: number
    firstName: string
    lastName: string
    profilePictureUrl: string | null
  }
  learner: {
    id: number
    userId: number
    firstName: string
    lastName: string
    profilePictureUrl: string | null
  }
  lastMessage?: {
    id: number
    content: string
    messageType: string
    createdAt: string
    senderId: number
    senderName: string
  }
  unreadCount?: number
}

interface UseConversationsOptions {
  userId?: number
  onError?: (error: string) => void
}

export const useConversations = ({ userId, onError }: UseConversationsOptions = {}) => {
  const [conversations, setConversations] = useState<ConversationWithParticipants[]>([])
  const [loading, setLoading] = useState(false)
  const [lastFetch, setLastFetch] = useState<number>(0)

  // Fetch all conversations for the user
  const fetchConversations = useCallback(async () => {
    if (!userId) {
      // Don't fetch if user is not authenticated
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/chat/conversations')

      if (!response.ok) {
        // Handle 401 (unauthorized) silently for unauthenticated users
        if (response.status === 401) {
          return
        }
        throw new Error('Failed to fetch conversations')
      }

      const data = await response.json()
      setConversations(data.conversations || [])
      setLastFetch(Date.now())
    } catch (error) {
      console.error('Error fetching conversations:', error)
      onError?.('Failed to load conversations')
      toast.error('Failed to load conversations')
    } finally {
      setLoading(false)
    }
  }, [onError, userId])

  // Create or get a conversation
  const createConversation = useCallback(async (
    mentorUserId?: number,
    learnerUserId?: number
  ): Promise<ConversationWithParticipants | null> => {
    try {
      const response = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mentorUserId,
          learnerUserId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create conversation')
      }

      const data = await response.json()

      // Add to conversations list if not already present
      setConversations(prev => {
        const exists = prev.some(conv => conv.id === data.conversation.id)
        if (exists) {
          return prev
        }
        return [data.conversation, ...prev]
      })

      return data.conversation
    } catch (error) {
      console.error('Error creating conversation:', error)
      onError?.('Failed to create conversation')
      toast.error('Failed to create conversation')
      return null
    }
  }, [onError])

  // Delete a conversation for the current user
  const deleteConversation = useCallback(async (conversationId: number) => {
    try {
      const response = await fetch(`/api/chat/conversations/${conversationId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete conversation')
      }

      // Remove from local state
      setConversations(prev => prev.filter(conv => conv.id !== conversationId))
      toast.success('Conversation deleted')
    } catch (error) {
      console.error('Error deleting conversation:', error)
      toast.error('Failed to delete conversation')
    }
  }, [])

  // Update conversation with new message
  const updateConversationWithMessage = useCallback((message: any) => {
    setConversations(prev => {
      const existingConv = prev.find(conv => conv.id === message.conversationId)

      if (existingConv) {
        // Update existing conversation
        return prev.map(conv => {
          if (conv.id === message.conversationId) {
            // Determine if the message was sent by the current user
            const isCurrentUserSender = userId && message.senderId === userId

            // Build updated conversation
            const updatedConv = {
              ...conv,
              lastMessageAt: message.createdAt,
              lastMessage: {
                id: message.id,
                content: message.content,
                messageType: message.messageType,
                createdAt: message.createdAt,
                senderId: message.senderId,
                senderName: `${message.sender.firstName} ${message.sender.lastName}`.trim(),
              },
            }

            // If current user sent the message, update their lastReadAt timestamp
            // to prevent showing their own messages as unread
            if (isCurrentUserSender) {
              if (conv.mentor.userId === userId) {
                updatedConv.mentorLastReadAt = message.createdAt
              } else if (conv.learner.userId === userId) {
                updatedConv.learnerLastReadAt = message.createdAt
              }
            }

            return updatedConv
          }
          return conv
        })
      } else {
        // Conversation not in list (probably restored), fetch conversations to get it
        setTimeout(() => fetchConversations(), 100)
        return prev
      }
    })
  }, [fetchConversations, userId])

  // Update conversation read status
  const updateReadStatus = useCallback((conversationId: number, userId: number, readAt: string) => {
    setConversations(prev => prev.map(conv => {
      if (conv.id === conversationId) {
        if (conv.mentor.userId === userId) {
          return { ...conv, mentorLastReadAt: readAt }
        } else if (conv.learner.userId === userId) {
          return { ...conv, learnerLastReadAt: readAt }
        }
      }
      return conv
    }))
  }, [])

  // Get conversation by ID
  const getConversation = useCallback((conversationId: number) => {
    return conversations.find(conv => conv.id === conversationId) || null
  }, [conversations])

  // Get conversation with a specific user
  const getConversationWithUser = useCallback((otherUserId: number) => {
    return conversations.find(conv =>
      conv.mentor.userId === otherUserId || conv.learner.userId === otherUserId
    ) || null
  }, [conversations])

  // Calculate unread count for a conversation
  const getUnreadCount = useCallback((conversation: ConversationWithParticipants, currentUserId: number) => {
    if (!conversation.lastMessageAt) return 0

    let lastReadAt: string | null = null
    if (conversation.mentor.userId === currentUserId) {
      lastReadAt = conversation.mentorLastReadAt
    } else if (conversation.learner.userId === currentUserId) {
      lastReadAt = conversation.learnerLastReadAt
    }

    if (!lastReadAt) return 1 // If never read, show 1

    const lastMessageTime = new Date(conversation.lastMessageAt).getTime()
    const lastReadTime = new Date(lastReadAt).getTime()

    return lastMessageTime > lastReadTime ? 1 : 0
  }, [])

  // Get total unread count across all conversations
  const getTotalUnreadCount = useCallback(() => {
    if (!userId) return 0

    return conversations.reduce((total, conv) => {
      return total + getUnreadCount(conv, userId)
    }, 0)
  }, [conversations, userId, getUnreadCount])

  // Sort conversations by last message time
  const sortedConversations = useCallback(() => {
    return [...conversations].sort((a, b) => {
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0
      return bTime - aTime // Most recent first
    })
  }, [conversations])

  // Auto-refresh conversations periodically
  useEffect(() => {
    if (!userId) return // Don't auto-refresh if user is not authenticated

    const interval = setInterval(() => {
      const now = Date.now()
      if (now - lastFetch > 30000) { // Refresh every 30 seconds if not recently fetched
        fetchConversations()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [lastFetch, fetchConversations, userId])

  // Auto-fetch conversations when userId becomes available
  useEffect(() => {
    if (userId) {
      fetchConversations()
    }
  }, [userId, fetchConversations])

  return {
    conversations: sortedConversations(),
    loading,
    fetchConversations,
    createConversation,
    deleteConversation,
    updateConversationWithMessage,
    updateReadStatus,
    getConversation,
    getConversationWithUser,
    getUnreadCount,
    getTotalUnreadCount,
  }
}