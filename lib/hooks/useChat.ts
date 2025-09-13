'use client'
import { useState, useEffect, useCallback } from 'react'

interface Message {
  id: number
  conversationId: number
  senderId: number
  content: string
  messageType: 'text' | 'file' | 'image'
  isEdited: boolean
  editedAt: Date | null
  replyToMessageId: number | null
  createdAt: Date
  updatedAt: Date
  sender: {
    id: number
    firstName: string
    lastName: string
  }
}

interface Conversation {
  id: number
  mentorId: number
  learnerId: number
  lastMessageAt: Date | null
  mentorLastReadAt: Date | null
  learnerLastReadAt: Date | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  lastMessage?: {
    id: number
    content: string
    senderId: number
    messageType: string
    createdAt: Date
  }
  otherUser: {
    id: number
    firstName: string
    lastName: string
    profilePictureUrl: string | null
  }
}

export function useChat() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Record<number, Message[]>>({})
  const [loading, setLoading] = useState(false)

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/chat/conversations')
      const data = await response.json()
      if (data.conversations) {
        setConversations(data.conversations)
      }
    } catch (error) {
      console.error('Error fetching conversations:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchMessages = useCallback(async (conversationId: number) => {
    try {
      const response = await fetch(`/api/chat/conversations/${conversationId}/messages`)
      const data = await response.json()
      
      if (data.messages) {
        setMessages(prev => ({
          ...prev,
          [conversationId]: data.messages
        }))
      }
      
      return data
    } catch (error) {
      console.error('Error fetching messages:', error)
      return null
    }
  }, [])

  const sendMessage = useCallback(async (conversationId: number, content: string) => {
    try {
      const response = await fetch(`/api/chat/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          messageType: 'text'
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Failed to send message:', errorData.error || 'Unknown error')
        return null
      }
      
      const data = await response.json()
      
      // Add message to local state for immediate feedback
      if (data.message) {
        setMessages(prev => ({
          ...prev,
          [conversationId]: [
            ...(prev[conversationId] || []),
            data.message
          ]
        }))
        
        // Update conversation last message time
        setConversations(prev => prev.map(conv => 
          conv.id === conversationId
            ? { ...conv, lastMessageAt: new Date(data.message.createdAt) }
            : conv
        ))
      }
      
      return data
    } catch (error) {
      console.error('Error sending message:', error)
      return null
    }
  }, [])

  const createConversation = useCallback(async (otherUserId: number) => {
    try {
      const response = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ otherUserId })
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Failed to create conversation:', response.status, errorData)
        return null
      }
      
      const data = await response.json()
      
      // Refresh conversations list to include the new conversation
      if (data.conversation) {
        await fetchConversations()
      }
      
      return data.conversation
    } catch (error) {
      console.error('Error creating conversation:', error)
      return null
    }
  }, [fetchConversations])

  const deleteMessage = useCallback(async (messageId: number, conversationId: number) => {
    try {
      const response = await fetch(`/api/chat/messages/${messageId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        // Remove message from local state (it's now hidden for this user)
        setMessages(prev => ({
          ...prev,
          [conversationId]: prev[conversationId]?.filter(msg => msg.id !== messageId) || []
        }))
        return true
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('Failed to delete message:', errorData.error || 'Unknown error')
        return false
      }
    } catch (error) {
      console.error('Error deleting message:', error)
      return false
    }
  }, [])

  const deleteConversation = useCallback(async (conversationId: number) => {
    try {
      const response = await fetch(`/api/chat/conversations/${conversationId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        // Remove conversation from local state
        setConversations(prev => prev.filter(conv => conv.id !== conversationId))
        // Remove messages for this conversation
        setMessages(prev => {
          const newMessages = { ...prev }
          delete newMessages[conversationId]
          return newMessages
        })
        return true
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('Failed to delete conversation:', errorData.error || 'Unknown error')
        return false
      }
    } catch (error) {
      console.error('Error deleting conversation:', error)
      return false
    }
  }, [])

  const clearConversations = useCallback(() => {
    setConversations([])
    setMessages({})
  }, [])

  return {
    conversations,
    messages,
    loading,
    fetchConversations,
    fetchMessages,
    sendMessage,
    createConversation,
    deleteMessage,
    deleteConversation,
    clearConversations,
  }
}