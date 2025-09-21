import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'

export interface ChatMessage {
  id: number
  conversationId: number
  senderId: number
  content: string
  messageType: string
  createdAt: string
  editedAt?: string
  sender: {
    id: number
    firstName: string
    lastName: string
    profilePictureUrl?: string
  }
  attachments?: Array<{
    id: number
    originalFilename: string
    fileUrl: string
    fileSize: number
    mimeType: string
  }>
}

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
    senderName: string
  }
  unreadCount?: number
}

interface UseChatOptions {
  conversationId?: number
  userId?: number
  onNewMessage?: (message: ChatMessage) => void
  onError?: (error: string) => void
}

export const useChat = ({ conversationId, userId, onNewMessage, onError }: UseChatOptions = {}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const loadingRef = useRef(false)

  // Fetch messages for a conversation
  const fetchMessages = useCallback(async (reset = false) => {
    if (!conversationId || loadingRef.current) return

    loadingRef.current = true
    setLoading(true)

    try {
      const currentPage = reset ? 0 : page
      const response = await fetch(`/api/chat/conversations/${conversationId}?page=${currentPage}&limit=50`)

      if (!response.ok) {
        throw new Error('Failed to fetch messages')
      }

      const data = await response.json()

      if (reset) {
        setMessages(data.messages || [])
        setPage(0)
      } else {
        setMessages(prev => [...data.messages, ...prev])
      }

      setHasMore(data.messages?.length === 50)
      if (!reset) {
        setPage(prev => prev + 1)
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
      onError?.('Failed to load messages')
      toast.error('Failed to load messages')
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }, [conversationId, onError]) // Remove page dependency to avoid circular reference

  // Send a message
  const sendMessage = useCallback(async (
    content: string,
    messageType: string = 'text',
    attachments?: Array<{
      originalFilename: string
      systemFilename: string
      fileUrl: string
      fileSize: number
      mimeType: string
      storagePath?: string
    }>
  ) => {
    if (!conversationId || !content.trim()) return

    setSending(true)

    // Optimistic update
    const tempId = -Date.now() // Use negative timestamp for temp IDs
    const optimisticMessage: ChatMessage = {
      id: tempId,
      conversationId,
      senderId: userId || 0,
      content,
      messageType,
      createdAt: new Date().toISOString(),
      sender: {
        id: userId || 0,
        firstName: 'You',
        lastName: '',
      },
      attachments: attachments?.map((att, index) => ({
        id: index,
        originalFilename: att.originalFilename,
        fileUrl: att.fileUrl,
        fileSize: att.fileSize,
        mimeType: att.mimeType,
      })),
    }

    setMessages(prev => [...prev, optimisticMessage])

    try {
      const response = await fetch(`/api/chat/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          messageType,
          attachments,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const data = await response.json()

      // Replace optimistic message with real one
      setMessages(prev => prev.map(msg =>
        msg.id === tempId ? data.message : msg
      ))

      onNewMessage?.(data.message)
    } catch (error) {
      console.error('Error sending message:', error)

      // Remove failed message
      setMessages(prev => prev.filter(msg => msg.id !== tempId))

      onError?.('Failed to send message')
      toast.error('Failed to send message')
    } finally {
      setSending(false)
    }
  }, [conversationId, userId, onNewMessage, onError])

  // Mark conversation as read
  const markAsRead = useCallback(async () => {
    if (!conversationId) return

    try {
      await fetch(`/api/chat/conversations/${conversationId}/read`, {
        method: 'POST',
      })
    } catch (error) {
      console.error('Error marking as read:', error)
    }
  }, [conversationId])

  // Delete message for current user
  const deleteMessage = useCallback(async (messageId: number) => {
    try {
      const response = await fetch(`/api/chat/messages/${messageId}/delete`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to delete message')
      }

      setMessages(prev => prev.filter(msg => msg.id !== messageId))
      toast.success('Message deleted')
    } catch (error) {
      console.error('Error deleting message:', error)
      toast.error('Failed to delete message')
    }
  }, [])

  // Load more messages (pagination)
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchMessages(false)
    }
  }, [loading, hasMore]) // Remove fetchMessages dependency to avoid circular reference

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Add new message from real-time events
  const addMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => {
      // Avoid duplicates
      if (prev.some(msg => msg.id === message.id)) {
        return prev
      }
      return [...prev, message]
    })
  }, [])

  // Update message (for edits, etc.)
  const updateMessage = useCallback((messageId: number, updates: Partial<ChatMessage>) => {
    setMessages(prev => prev.map(msg =>
      msg.id === messageId ? { ...msg, ...updates } : msg
    ))
  }, [])

  // Remove message (for deletions)
  const removeMessage = useCallback((messageId: number) => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId))
  }, [])

  // Reset chat state
  const reset = useCallback(() => {
    setMessages([])
    setPage(0)
    setHasMore(true)
    loadingRef.current = false
  }, [])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage.senderId === userId) {
        scrollToBottom()
      }
    }
  }, [messages, userId, scrollToBottom])

  return {
    messages,
    loading,
    sending,
    hasMore,
    messagesEndRef,
    fetchMessages,
    sendMessage,
    markAsRead,
    deleteMessage,
    loadMore,
    scrollToBottom,
    addMessage,
    updateMessage,
    removeMessage,
    reset,
  }
}