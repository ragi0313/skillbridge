'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, MessageCircle, Send, Paperclip, Smile, MoreHorizontal, Trash2, Copy, FileText, Image as ImageIcon } from 'lucide-react'
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
  attachments?: Array<{
    id: number
    originalFilename: string
    fileUrl: string
    fileSize: number
    mimeType: string
  }>
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
  const [attachments, setAttachments] = useState<Array<{
    file: File
    url: string
    type: 'image' | 'file'
  }>>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Error recovery for mini chat
  const { onError } = useMiniChatErrorRecovery()

  const {
    conversations,
    totalUnreadCount,
    isConnected,
    subscribeToConversation,
    unsubscribeFromConversation,
    getConversation,
    fetchConversations,
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
  const conversationSubscriptions = useRef<Map<number, () => void>>(new Map())

  // Listen for custom events to open chat
  useEffect(() => {
    const handleOpenMiniChat = (event: CustomEvent) => {
      console.log('MiniChatBar: Received openMiniChat event', event.detail)
      const { conversationId, conversation } = event.detail

      if (conversation) {
        console.log('MiniChatBar: Opening conversation from event', conversation.id)
        setCurrentConversation(conversation)
        setIsOpen(true)
        setIsMinimized(false)
      } else if (conversationId) {
        console.log('MiniChatBar: Looking up conversation by ID', conversationId)
        const conv = getConversation(conversationId)
        if (conv) {
          console.log('MiniChatBar: Found conversation', conv.id)
          setCurrentConversation(conv)
          setIsOpen(true)
          setIsMinimized(false)
        } else {
          console.warn('MiniChatBar: Conversation not found in cache', conversationId)
        }
      } else {
        console.warn('MiniChatBar: No conversation or conversationId in event detail')
      }
    }

    console.log('MiniChatBar: Registering openMiniChat event listener')
    window.addEventListener('openMiniChat', handleOpenMiniChat as EventListener)
    return () => {
      console.log('MiniChatBar: Removing openMiniChat event listener')
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
        // Add incoming message to the chat UI
        addMessage(message)
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

  // Subscribe to all conversations when showing conversation list
  useEffect(() => {
    if (isOpen && !currentConversation && conversations.length > 0) {
      // Subscribe to all conversations for real-time updates
      conversations.forEach(conversation => {
        const conversationId = conversation.id

        // Don't subscribe if already subscribed
        if (!conversationSubscriptions.current.has(conversationId)) {
          const unsubscribe = subscribeToConversation(conversationId, (message: ChatMessage) => {
            // The ChatContext already updates the conversations list via updateConversationWithMessage
            // The conversation list will automatically re-render with the new message
            // No need to do anything here - the subscription ensures Pusher events are handled
          })

          conversationSubscriptions.current.set(conversationId, unsubscribe)
        }
      })

      // Clean up subscriptions for conversations that no longer exist
      const currentConversationIds = new Set(conversations.map(c => c.id))
      Array.from(conversationSubscriptions.current.entries()).forEach(([convId, unsubscribe]) => {
        if (!currentConversationIds.has(convId)) {
          unsubscribe()
          conversationSubscriptions.current.delete(convId)
        }
      })
    }

    // Clean up all subscriptions when not showing conversation list
    if (!isOpen || currentConversation) {
      Array.from(conversationSubscriptions.current.values()).forEach(unsubscribe => {
        unsubscribe()
      })
      conversationSubscriptions.current.clear()
    }
  }, [isOpen, currentConversation, conversations, subscribeToConversation])

  // Cleanup attachment URLs on unmount
  useEffect(() => {
    return () => {
      attachments.forEach(attachment => {
        URL.revokeObjectURL(attachment.url)
      })
    }
  }, [attachments])

  // Cleanup subscriptions on unmount
  useEffect(() => {
    return () => {
      // Clean up conversation list subscriptions
      Array.from(conversationSubscriptions.current.values()).forEach(unsubscribe => {
        unsubscribe()
      })
      conversationSubscriptions.current.clear()
    }
  }, [])

  // Handle message send
  const handleSendMessage = async () => {
    if ((!messageInput.trim() && attachments.length === 0) || !currentConversation || !user || uploading) return

    let uploadedAttachments: Array<{
      originalFilename: string
      systemFilename: string
      fileUrl: string
      fileSize: number
      mimeType: string
      storagePath?: string
    }> = []

    // Upload attachments first
    if (attachments.length > 0) {
      setUploading(true)
      try {
        for (const attachment of attachments) {
          const formData = new FormData()
          formData.append('file', attachment.file)

          const response = await fetch('/api/files/upload', {
            method: 'POST',
            body: formData,
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || 'Failed to upload file')
          }

          const data = await response.json()
          uploadedAttachments.push({
            originalFilename: attachment.file.name,
            systemFilename: data.filename || attachment.file.name,
            fileUrl: data.url,
            fileSize: attachment.file.size,
            mimeType: attachment.file.type,
            storagePath: data.path,
          })
        }
      } catch (error) {
        console.error('Error uploading files:', error)
        toast.error(error instanceof Error ? error.message : 'Failed to upload files')
        setUploading(false)
        return
      } finally {
        setUploading(false)
      }
    }

    const messageType = uploadedAttachments.length > 0 ?
      (uploadedAttachments[0].mimeType.startsWith('image/') ? 'image' : 'file') : 'text'

    // Use the message input if provided, otherwise empty string
    // The UI will display the attachments visually
    const content = messageInput.trim()

    await sendMessage(content, messageType, uploadedAttachments)
    setMessageInput('')
    setAttachments([])
    scrollToBottom()
  }

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])

    files.forEach(file => {
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Maximum file size is 10MB.`)
        return
      }

      const url = URL.createObjectURL(file)
      const type = file.type.startsWith('image/') ? 'image' : 'file'

      setAttachments(prev => [...prev, { file, url, type }])
    })

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Remove attachment
  const removeAttachment = (index: number) => {
    setAttachments(prev => {
      const newAttachments = [...prev]
      URL.revokeObjectURL(newAttachments[index].url)
      newAttachments.splice(index, 1)
      return newAttachments
    })
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

    // Clean up conversation list subscriptions
    Array.from(conversationSubscriptions.current.values()).forEach(unsubscribe => {
      unsubscribe()
    })
    conversationSubscriptions.current.clear()
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

  // Check if conversation has unread messages
  const hasUnreadMessages = (conversation: ConversationWithParticipants) => {
    if (!conversation.lastMessageAt || !user) return false

    // Get the appropriate last read timestamp based on user role
    let lastReadAt: string | null = null
    if (conversation.mentor.userId === user.id) {
      // Current user is mentor, check mentor's read time
      lastReadAt = conversation.mentorLastReadAt
    } else {
      // Current user is learner, check learner's read time
      lastReadAt = conversation.learnerLastReadAt
    }

    if (!lastReadAt) return true // If never read, it's unread

    const lastMessageTime = new Date(conversation.lastMessageAt).getTime()
    const lastReadTime = new Date(lastReadAt).getTime()

    return lastMessageTime > lastReadTime
  }

  // Render conversation list
  const renderConversationList = () => {
    // Only show conversations that have at least one message
    const conversationsWithMessages = conversations.filter(conv => conv.lastMessageAt)

    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="p-4 border-b flex-shrink-0">
          <h3 className="font-semibold text-lg">Messages</h3>
        </div>
        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="space-y-3 p-4">
            {conversationsWithMessages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No conversations yet</p>
                <p className="text-xs mt-2">Start chatting with mentors or learners!</p>
              </div>
            ) : (
              conversationsWithMessages.map((conversation) => {
            const otherParticipant = conversation.mentor.userId === user?.id
              ? conversation.learner
              : conversation.mentor
            const isUnread = hasUnreadMessages(conversation)

            return (
              <div
                key={conversation.id}
                className={`flex items-center p-4 rounded-xl cursor-pointer transition-colors border hover:border-gray-200 ${
                  isUnread
                    ? 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                    : 'hover:bg-gray-50 border-gray-100'
                }`}
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
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="flex items-center justify-between">
                    <p className={`font-semibold text-base truncate break-all ${isUnread ? 'text-gray-900' : 'text-gray-700'}`}>
                      {otherParticipant.firstName} {otherParticipant.lastName}
                    </p>
                    <div className="flex items-center space-x-2">
                      {conversation.lastMessageAt && (
                        <span className="text-xs text-gray-500 font-medium">
                          {formatMessageTime(conversation.lastMessageAt)}
                        </span>
                      )}
                      {isUnread && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                    </div>
                  </div>
                  {conversation.lastMessage ? (
                    <p className="text-sm text-gray-600 truncate mt-1 break-all overflow-hidden">
                      {(() => {
                        // Determine if current user sent the message
                        const isCurrentUserSender = user && conversation.lastMessage.senderId === user.id

                        // Get message preview
                        let preview = conversation.lastMessage.content
                        if (!preview || preview.trim().length === 0) {
                          if (conversation.lastMessage.messageType === 'image') {
                            preview = '📷 Photo'
                          } else if (conversation.lastMessage.messageType === 'file') {
                            preview = '📎 File'
                          } else {
                            preview = 'New message'
                          }
                        }

                        // Prepend "You: " only if current user sent it
                        return isCurrentUserSender ? `You: ${preview}` : preview
                      })()}
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
        </ScrollArea>
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
                      className={`p-3 rounded-2xl shadow-sm break-words overflow-wrap-anywhere ${
                        isOwnMessage
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-900 border border-gray-200'
                      }`}
                    >
                      {/* Display attachments */}
                      {message.attachments && message.attachments.length > 0 && (
                        <div className={message.content ? 'mb-2' : ''}>
                          {message.attachments.map((attachment, idx) => (
                            <div key={`${message.id}-attachment-${attachment.id || idx}`}>
                              {attachment.mimeType.startsWith('image/') ? (
                                <a
                                  href={attachment.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block"
                                >
                                  <img
                                    src={attachment.fileUrl}
                                    alt={attachment.originalFilename}
                                    className="max-w-full w-full rounded cursor-pointer hover:opacity-90 transition-opacity object-contain"
                                    style={{ maxHeight: '200px' }}
                                  />
                                </a>
                              ) : (
                                <div className="border rounded p-2 bg-white/10 mb-1">
                                  <div className="flex items-center space-x-2">
                                    <FileText className="w-4 h-4 flex-shrink-0" />
                                    <div className="flex-1 min-w-0 overflow-hidden">
                                      <p className="text-xs font-medium truncate break-all">
                                        {attachment.originalFilename}
                                      </p>
                                      <p className="text-xs opacity-75">
                                        {(attachment.fileSize / 1024 / 1024).toFixed(1)} MB
                                      </p>
                                    </div>
                                    <a
                                      href={`/api/files/download?url=${encodeURIComponent(attachment.fileUrl)}&filename=${encodeURIComponent(attachment.originalFilename)}`}
                                      className="text-xs underline flex-shrink-0"
                                    >
                                      Download
                                    </a>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {message.content && (
                        <p className="text-sm leading-relaxed break-words overflow-wrap-anywhere whitespace-pre-wrap">{message.content}</p>
                      )}

                      <p className={`text-xs mt-1 ${
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
          {/* Attachment previews */}
          {attachments.length > 0 && (
            <div className="mb-3 p-2 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-700">
                  {attachments.length} file(s)
                </span>
              </div>
              <div className="space-y-1">
                {attachments.map((attachment, index) => (
                  <div key={index} className="flex items-center space-x-2 p-1.5 bg-white rounded border text-xs">
                    {attachment.type === 'image' ? (
                      <img
                        src={attachment.url}
                        alt={attachment.file.name}
                        className="w-8 h-8 object-cover rounded"
                      />
                    ) : (
                      <FileText className="w-5 h-5 text-gray-500" />
                    )}
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <p className="font-medium truncate break-all">{attachment.file.name}</p>
                      <p className="text-gray-500">
                        {(attachment.file.size / 1024 / 1024).toFixed(1)} MB
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAttachment(index)}
                      className="p-1 h-auto w-6"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.txt,.zip"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending || uploading}
              className="p-2 w-8 h-8"
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            <Input
              placeholder="Type a message..."
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 rounded-full border-gray-300 focus:border-blue-500 focus:ring-blue-500 px-4 py-2 text-sm"
              disabled={sending || uploading}
            />
            <Button
              size="sm"
              onClick={handleSendMessage}
              disabled={(!messageInput.trim() && attachments.length === 0) || sending || uploading}
              className="rounded-full w-10 h-10 p-0 bg-blue-500 hover:bg-blue-600"
            >
              {uploading ? (
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
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
              {currentConversation ? (
                renderChatInterface()
              ) : (
                renderConversationList()
              )}
            </div>
          )}
        </div>
      )}
      </>
    </MiniChatErrorBoundary>
  )
}