'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, MessageCircle, Send, Paperclip, Smile, MoreHorizontal, Trash2, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useChat as useChatHook } from '@/lib/hooks/useChat'
import { useChat } from '@/lib/context/ChatContext'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { MiniChatErrorBoundary, useMiniChatErrorRecovery } from './MiniChatErrorBoundary'

interface User {
  id: number
  role: string
  firstName: string
  lastName: string
}

interface MiniChatBarProps {
  user: User | null
  className?: string
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

export function MiniChatBar({ user, className }: MiniChatBarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentConversation, setCurrentConversation] = useState<ConversationWithParticipants | null>(null)
  const [messageInput, setMessageInput] = useState('')
  const [isMinimized, setIsMinimized] = useState(false)
  const [contextMenuMessageId, setContextMenuMessageId] = useState<number | null>(null)

  // Error recovery for mini chat
  const { onError } = useMiniChatErrorRecovery()

  const {
    conversations,
    totalUnreadCount,
    isConnected,
    subscribeToConversation,
    unsubscribeFromConversation,
    getConversation,
  } = useChat()

  // Create a ref to hold the addMessage function to avoid circular dependency
  const addMessageRef = useRef<((message: ChatMessage) => void) | null>(null)

  // Memoize the onNewMessage callback to prevent infinite re-renders
  const handleNewMessage = useCallback((message: ChatMessage) => {
    // Add the real-time message to the chat interface
    if (addMessageRef.current) {
      addMessageRef.current(message)
    }
  }, [])

  const {
    messages,
    sending,
    fetchMessages,
    sendMessage,
    markAsRead,
    addMessage,
    messagesEndRef,
    scrollToBottom,
  } = useChatHook({
    conversationId: currentConversation?.id,
    userId: user?.id,
    onNewMessage: handleNewMessage,
  })

  // Update the ref when addMessage changes
  useEffect(() => {
    addMessageRef.current = addMessage
  }, [addMessage])

  const unsubscribeRef = useRef<(() => void) | null>(null)

  // Listen for custom events to open chat
  useEffect(() => {
    const handleOpenMiniChat = (event: CustomEvent) => {
      const { conversationId, conversation } = event.detail

      if (conversation) {
        setCurrentConversation(conversation)
        setIsOpen(true)
        setIsMinimized(false)
      } else if (conversationId) {
        const conv = getConversation(conversationId)
        if (conv) {
          setCurrentConversation(conv)
          setIsOpen(true)
          setIsMinimized(false)
        }
      }
    }

    window.addEventListener('openMiniChat', handleOpenMiniChat as EventListener)
    return () => {
      window.removeEventListener('openMiniChat', handleOpenMiniChat as EventListener)
    }
  }, []) // No dependencies needed since getConversation is accessed directly in the handler

  // Subscribe to current conversation for real-time updates
  useEffect(() => {
    if (currentConversation) {
      // Unsubscribe from previous conversation
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
      }

      // Subscribe to new conversation
      unsubscribeRef.current = subscribeToConversation(currentConversation.id, (message: ChatMessage) => {
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
  }, [currentConversation?.id]) // Only depend on conversation ID to avoid infinite loops

  // Mark conversation as read when opened (separate effect to avoid infinite loops)
  useEffect(() => {
    if (currentConversation && user) {
      // Only mark as read once per conversation load
      const timeoutId = setTimeout(async () => {
        try {
          await fetch(`/api/chat/conversations/${currentConversation.id}/read`, {
            method: 'POST',
          })
        } catch (error) {
          console.error('Error marking as read:', error)
        }
      }, 100) // Small delay to ensure conversation is fully loaded

      return () => clearTimeout(timeoutId)
    }
  }, [currentConversation?.id, user?.id]) // Only depend on IDs to avoid infinite loops

  // Handle message send
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !currentConversation || !user) return

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

  // Close chat
  const handleClose = () => {
    setIsOpen(false)
    setCurrentConversation(null)
    if (unsubscribeRef.current) {
      unsubscribeRef.current()
      unsubscribeRef.current = null
    }
  }

  // Toggle minimize
  const toggleMinimize = () => {
    setIsMinimized(!isMinimized)
  }

  // Get other participant info
  const getOtherParticipant = () => {
    if (!currentConversation || !user) return null

    return currentConversation.mentor.userId === user.id
      ? currentConversation.learner
      : currentConversation.mentor
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
      // The backend deletion is per-user, so we need to refetch messages
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

  // Render conversation list
  const renderConversationList = () => {
    // Show all conversations (including those without messages)
    const allConversations = conversations

    return (
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-4">Messages</h3>
        <div className="space-y-3">
          {allConversations.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No conversations yet</p>
            </div>
          ) : (
            allConversations.map((conversation) => {
            const otherParticipant = conversation.mentor.userId === user?.id
              ? conversation.learner
              : conversation.mentor

            return (
              <div
                key={conversation.id}
                className="flex items-center p-4 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors border border-gray-100 hover:border-gray-200"
                onClick={() => {
                  setCurrentConversation(conversation)
                }}
              >
                <Avatar className="w-12 h-12 mr-4">
                  <AvatarImage src={otherParticipant.profilePictureUrl || undefined} />
                  <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">
                    {otherParticipant.firstName[0]}{otherParticipant.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-base truncate text-gray-900">
                      {otherParticipant.firstName} {otherParticipant.lastName}
                    </p>
                    {conversation.lastMessageAt && (
                      <span className="text-xs text-gray-500 font-medium">
                        {formatMessageTime(conversation.lastMessageAt)}
                      </span>
                    )}
                  </div>
                  {conversation.lastMessage ? (
                    <p className="text-sm text-gray-600 truncate mt-1">
                      {conversation.lastMessage.content}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400 italic truncate mt-1">
                      Start a conversation...
                    </p>
                  )}
                </div>
              </div>
            )
            })
          )}
        </div>
      </div>
    )
  }

  // Render chat interface
  const renderChatInterface = () => {
    const otherParticipant = getOtherParticipant()
    if (!otherParticipant) return null

    return (
      <div className="flex flex-col h-full">
        {/* Chat Header */}
        <div className="flex items-center justify-between p-4 border-b bg-white">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentConversation(null)}
              className="mr-3 hover:bg-gray-100"
            >
              ←
            </Button>
            <Avatar className="w-10 h-10 mr-3">
              <AvatarImage src={otherParticipant.profilePictureUrl || undefined} />
              <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">
                {otherParticipant.firstName[0]}{otherParticipant.lastName[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-base text-gray-900">
                {otherParticipant.firstName} {otherParticipant.lastName}
              </p>
              <p className="text-sm text-gray-500">
                {isConnected ? 'Online' : 'Offline'}
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-5">
          <div className="space-y-4">
            {messages.map((message) => {
              const isOwnMessage = message.senderId === user?.id

              return (
                <div
                  key={message.id}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} group`}
                >
                  <div className="relative max-w-[85%]">
                    <div
                      className={`p-4 rounded-2xl shadow-sm ${
                        isOwnMessage
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-900 border border-gray-200'
                      }`}
                    >
                      <p className="text-sm leading-relaxed break-words">{message.content}</p>
                      <p className={`text-xs mt-2 ${
                        isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {formatMessageTime(message.createdAt)}
                      </p>
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
          <div className="flex items-center space-x-3">
            <Input
              placeholder="Type a message..."
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 rounded-full border-gray-300 focus:border-blue-500 focus:ring-blue-500 px-4 py-2"
              disabled={sending}
            />
            <Button
              size="sm"
              onClick={handleSendMessage}
              disabled={!messageInput.trim() || sending}
              className="rounded-full w-10 h-10 p-0 bg-blue-500 hover:bg-blue-600"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <MiniChatErrorBoundary onError={onError} onClose={() => setIsOpen(false)}>
      <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            onClick={() => setIsOpen(true)}
            className="w-16 h-16 rounded-full shadow-2xl relative bg-blue-500 hover:bg-blue-600 border-4 border-white hover:scale-105 transition-all duration-200"
            size="lg"
          >
            <MessageCircle className="w-7 h-7" />
            {totalUnreadCount > 0 && (
              <Badge className="absolute -top-2 -right-2 px-2 min-w-[1.5rem] h-6 bg-red-500 text-white font-bold shadow-lg">
                {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
              </Badge>
            )}
          </Button>
        </div>
      )}

      {/* Mini Chat Bar */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 w-96 h-[32rem] bg-white border border-gray-200 rounded-xl shadow-2xl z-50 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-gray-50 rounded-t-xl">
            <h3 className="font-semibold text-base">
              {currentConversation ? 'Chat' : 'Messages'}
            </h3>
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMinimize}
                className="w-6 h-6 p-0"
              >
                {isMinimized ? '▲' : '▼'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="w-6 h-6 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          {!isMinimized && (
            <div className="flex-1 overflow-hidden">
              {currentConversation ? renderChatInterface() : renderConversationList()}
            </div>
          )}
        </div>
      )}
      </>
    </MiniChatErrorBoundary>
  )
}