'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, MoreHorizontal, Trash2, Copy, ArrowLeft, Check, CheckCheck, Paperclip, X, FileText, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useChat as useChatHook } from '@/lib/hooks/useChat'
import { useChat } from '@/lib/context/ChatContext'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { ChatErrorBoundary } from './ChatErrorBoundary'

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
  const [attachments, setAttachments] = useState<Array<{
    file: File
    url: string
    type: 'image' | 'file'
  }>>([])
  const [uploading, setUploading] = useState(false)
  const lastKeyPressRef = useRef<number>(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    subscribeToConversation,
    unsubscribeFromConversation,
    isConnected,
  } = useChat()

  const {
    messages,
    sending,
    fetchMessages,
    sendMessage,
    addMessage,
    messagesEndRef,
    scrollToBottom,
  } = useChatHook({
    conversationId: conversation?.id,
    userId: user?.id,
    onNewMessage: (message: ChatMessage) => {
      // Add the real-time message to the chat interface
      if (addMessage) {
        addMessage(message)
      }
    },
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

  // Cleanup attachment URLs on unmount
  useEffect(() => {
    return () => {
      attachments.forEach(attachment => {
        URL.revokeObjectURL(attachment.url)
      })
    }
  }, [attachments])

  // Handle message send
  const handleSendMessage = async () => {
    if ((!messageInput.trim() && attachments.length === 0) || !conversation || !user || uploading) return

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

  // Handle enter key press with debouncing
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()

      // Prevent rapid fire messages when holding Enter
      const now = Date.now()
      if (now - lastKeyPressRef.current < 300 || sending || uploading) {
        return
      }
      lastKeyPressRef.current = now

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
    <ChatErrorBoundary>
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
                    {/* Display attachments */}
                    {message.attachments && message.attachments.length > 0 && (
                      <div className={message.content ? 'mb-2' : ''}>
                        {message.attachments.map((attachment, idx) => (
                          <div key={idx}>
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
                                  className="max-w-full rounded cursor-pointer hover:opacity-90 transition-opacity"
                                  style={{ maxHeight: '300px' }}
                                />
                              </a>
                            ) : (
                              <div className="border rounded p-2 bg-white/10 mb-1">
                                <div className="flex items-center space-x-2">
                                  <FileText className="w-4 h-4 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium truncate">
                                      {attachment.originalFilename}
                                    </p>
                                    <p className="text-xs opacity-75">
                                      {(attachment.fileSize / 1024 / 1024).toFixed(1)} MB
                                    </p>
                                  </div>
                                  <a
                                    href={attachment.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
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
                      <p className="text-sm break-words">{message.content}</p>
                    )}

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
        {/* Attachment previews */}
        {attachments.length > 0 && (
          <div className="mb-3 p-2 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                {attachments.length} file(s) selected
              </span>
            </div>
            <div className="space-y-2">
              {attachments.map((attachment, index) => (
                <div key={index} className="flex items-center space-x-3 p-2 bg-white rounded border">
                  {attachment.type === 'image' ? (
                    <img
                      src={attachment.url}
                      alt={attachment.file.name}
                      className="w-10 h-10 object-cover rounded"
                    />
                  ) : (
                    <FileText className="w-6 h-6 text-gray-500" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{attachment.file.name}</p>
                    <p className="text-xs text-gray-500">
                      {(attachment.file.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAttachment(index)}
                    className="p-1 h-auto"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-end space-x-2">
          <div className="flex items-center space-x-1">
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
              className="p-2"
            >
              <Paperclip className="w-4 h-4" />
            </Button>
          </div>

          <Input
            placeholder="Type a message..."
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
            disabled={sending || uploading}
          />

          <Button
            size="sm"
            onClick={handleSendMessage}
            disabled={(!messageInput.trim() && attachments.length === 0) || sending || uploading}
          >
            {uploading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
      </div>
    </ChatErrorBoundary>
  )
}