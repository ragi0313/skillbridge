'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, MoreHorizontal, Trash2, Copy, ArrowLeft, Check, CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useChat as useChatHook } from '@/lib/hooks/useChat'
import { useChat } from '@/lib/context/ChatContext'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface User {
  id: number
  role: string
  firstName: string
  lastName: string
}

interface ChatMessage {
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
}

interface ConversationWithParticipants {
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
}

interface ChatInterfaceProps {
  user: User | null
  conversation: ConversationWithParticipants | null
  onBack?: () => void
  className?: string
}

export function ChatInterface({ user, conversation, onBack, className }: ChatInterfaceProps) {
  const [messageInput, setMessageInput] = useState('')

  const {
    subscribeToConversation,
    unsubscribeFromConversation,
    isConnected,
  } = useChat()

  // Memoize the onNewMessage callback to prevent infinite re-renders
  const handleNewMessage = useCallback((message: ChatMessage) => {
    // The useChat hook will handle message addition internally
  }, [])

  const {
    messages,
    sending,
    fetchMessages,
    sendMessage,
    messagesEndRef,
    scrollToBottom,
  } = useChatHook({
    conversationId: conversation?.id,
    userId: user?.id,
    onNewMessage: handleNewMessage,
  })

  const unsubscribeRef = useRef<(() => void) | null>(null)

  // Subscribe to current conversation for real-time updates
  useEffect(() => {
    if (conversation) {
      // Unsubscribe from previous conversation
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
      }

      // Subscribe to new conversation
      unsubscribeRef.current = subscribeToConversation(conversation.id, (message: ChatMessage) => {
        // The real-time message will be handled by the ChatContext
        // and the useChatHook will automatically update messages
      })

      // Fetch messages for current conversation
      fetchMessages(true)
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
    }
  }, [conversation?.id, subscribeToConversation, fetchMessages])

  // Mark conversation as read when opened
  useEffect(() => {
    if (conversation && user) {
      const timeoutId = setTimeout(async () => {
        try {
          await fetch(`/api/chat/conversations/${conversation.id}/read`, {
            method: 'POST',
          })
        } catch (error) {
          console.error('Error marking as read:', error)
        }
      }, 100)

      return () => clearTimeout(timeoutId)
    }
  }, [conversation?.id, user?.id])

  // Handle message send
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !conversation || !user) return

    await sendMessage(messageInput.trim())
    setMessageInput('')
    scrollToBottom()
  }

  // Handle enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Get other participant info
  const getOtherParticipant = () => {
    if (!conversation || !user) return null

    return conversation.mentor.userId === user.id
      ? conversation.learner
      : conversation.mentor
  }

  // Format message time
  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return 'now'
    if (diffInMinutes < 60) return `${diffInMinutes}m`
    if (diffInMinutes < 1440) return format(date, 'HH:mm')
    return format(date, 'MMM d')
  }

  // Delete message
  const handleDeleteMessage = async (messageId: number) => {
    try {
      const response = await fetch(`/api/chat/messages/${messageId}/delete`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to delete message')
      }

      // Remove message from UI
      await fetchMessages(true)
      toast.success('Message deleted')
    } catch (error) {
      console.error('Error deleting message:', error)
      toast.error('Failed to delete message')
    }
  }

  // Copy message
  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content)
    toast.success('Message copied to clipboard')
  }

  // Get message seen status
  const getMessageSeenStatus = (message: ChatMessage) => {
    if (!conversation || !user || message.senderId !== user.id) {
      return null // Only show seen status for own messages
    }

    const messageTime = new Date(message.createdAt).getTime()

    // Determine which read timestamp to check based on user role
    let otherPartyReadAt: string | null = null
    if (conversation.mentor.userId === user.id) {
      // Current user is mentor, check learner's read time
      otherPartyReadAt = conversation.learnerLastReadAt
    } else {
      // Current user is learner, check mentor's read time
      otherPartyReadAt = conversation.mentorLastReadAt
    }

    if (!otherPartyReadAt) {
      return 'sent' // Message sent but not read
    }

    const readTime = new Date(otherPartyReadAt).getTime()
    return messageTime <= readTime ? 'seen' : 'sent'
  }

  if (!conversation) {
    return (
      <div className={`flex items-center justify-center bg-gray-50 ${className}`}>
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <Send className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-medium text-gray-900 mb-2">Select a conversation</h2>
          <p className="text-gray-500">
            Choose a conversation from the sidebar to start messaging
          </p>
        </div>
      </div>
    )
  }

  const otherParticipant = getOtherParticipant()
  if (!otherParticipant) return null

  return (
    <div className={`flex flex-col bg-white ${className}`}>
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <div className="flex items-center">
          {onBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="mr-3 lg:hidden"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <Avatar className="w-10 h-10 mr-3">
            <AvatarImage src={otherParticipant.profilePictureUrl || undefined} />
            <AvatarFallback className="bg-gray-100 text-gray-600 font-medium">
              {otherParticipant.firstName[0]}{otherParticipant.lastName[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-gray-900">
              {otherParticipant.firstName} {otherParticipant.lastName}
            </p>
            <p className="text-sm text-gray-500">
              {isConnected ? 'Online' : 'Offline'}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => {
            const isOwnMessage = message.senderId === user?.id
            const seenStatus = getMessageSeenStatus(message)

            return (
              <div
                key={message.id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} group`}
              >
                <div className="relative max-w-xs lg:max-w-md">
                  <div
                    className={`p-3 rounded-lg ${
                      isOwnMessage
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="text-sm break-words">{message.content}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className={`text-xs ${
                        isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {formatMessageTime(message.createdAt)}
                      </p>
                      {seenStatus && (
                        <div className="flex items-center ml-2">
                          {seenStatus === 'seen' ? (
                            <CheckCheck className={`w-3 h-3 ${isOwnMessage ? 'text-blue-100' : 'text-gray-500'}`} />
                          ) : (
                            <Check className={`w-3 h-3 ${isOwnMessage ? 'text-blue-200' : 'text-gray-400'}`} />
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Message Actions */}
                  <div className={`absolute top-0 ${isOwnMessage ? '-left-8' : '-right-8'} opacity-0 group-hover:opacity-100 transition-opacity`}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-6 h-6 p-0 rounded-full bg-white border shadow-sm hover:bg-gray-50"
                        >
                          <MoreHorizontal className="w-3 h-3 text-gray-500" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align={isOwnMessage ? 'end' : 'start'} className="w-40">
                        <DropdownMenuItem onClick={() => handleCopyMessage(message.content)}>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy
                        </DropdownMenuItem>
                        {isOwnMessage && (
                          <DropdownMenuItem
                            onClick={() => handleDeleteMessage(message.id)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="p-4 border-t bg-white">
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Type a message..."
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
            disabled={sending}
          />
          <Button
            size="sm"
            onClick={handleSendMessage}
            disabled={!messageInput.trim() || sending}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}