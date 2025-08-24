"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { MessageCircle, Send, Paperclip, Smile, Download, Image, FileText, X, ChevronDown, ChevronUp } from "lucide-react"
import { toast } from "@/lib/toast"
import { formatDistanceToNow } from "date-fns"

interface ChatMessage {
  id: number
  message: string
  messageType: "text" | "file" | "emoji"
  isEdited: boolean
  editedAt: Date | null
  replyToMessageId: number | null
  createdAt: Date
  user: {
    id: number
    firstName: string
    lastName: string
    role: string
  }
  attachments?: ChatAttachment[]
}

interface ChatAttachment {
  id: number
  messageId: number
  fileName: string
  fileSize: number
  fileType: string
  fileUrl: string
  thumbnailUrl?: string | null
}

interface ChatPanelProps {
  sessionId: string
  userRole: "learner" | "mentor"
  isOpen?: boolean
  onToggle?: () => void
  participantCount?: number
}

const EMOJI_LIST = [
  "😀", "😊", "😂", "🤔", "👍", "👎", "❤️", "🎉", "🔥", "💯",
  "👋", "🙏", "💪", "🎯", "⭐", "✅", "❌", "⚡", "🚀", "💡"
]

export default function ChatPanel({ sessionId, userRole, isOpen = false, onToggle, participantCount = 2 }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Fetch messages
  const fetchMessages = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/sessions/${sessionId}/chat`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
        scrollToBottom()
      } else {
        console.error("Failed to fetch messages")
      }
    } catch (error) {
      console.error("Error fetching messages:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || isSending) return

    setIsSending(true)
    try {
      const response = await fetch(`/api/sessions/${sessionId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: newMessage.trim(),
          messageType: 'text',
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setMessages(prev => [data.message, ...prev])
        setNewMessage("")
        scrollToBottom()
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || "Failed to send message")
      }
    } catch (error) {
      console.error("Error sending message:", error)
      toast.error("Failed to send message")
    } finally {
      setIsSending(false)
    }
  }

  // Send emoji
  const sendEmoji = async (emoji: string) => {
    setIsSending(true)
    try {
      const response = await fetch(`/api/sessions/${sessionId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: emoji,
          messageType: 'emoji',
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setMessages(prev => [data.message, ...prev])
        setShowEmojiPicker(false)
        scrollToBottom()
      }
    } catch (error) {
      console.error("Error sending emoji:", error)
      toast.error("Failed to send emoji")
    } finally {
      setIsSending(false)
    }
  }

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`/api/sessions/${sessionId}/chat/upload`, {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        setMessages(prev => [{
          ...data.message,
          attachments: [data.attachment]
        }, ...prev])
        scrollToBottom()
        toast.success("File uploaded successfully")
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || "Failed to upload file")
      }
    } catch (error) {
      console.error("Error uploading file:", error)
      toast.error("Failed to upload file")
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  // Scroll to bottom
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, 100)
  }

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  // Get file icon
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="h-4 w-4" />
    return <FileText className="h-4 w-4" />
  }

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Load messages on component mount
  useEffect(() => {
    fetchMessages()
    // Set up polling for new messages (in production, use WebSocket)
    const interval = setInterval(fetchMessages, 3000)
    return () => clearInterval(interval)
  }, [sessionId])

  // Track unread messages when closed
  useEffect(() => {
    if (!isOpen) {
      setUnreadCount(prev => prev + (messages.length > 0 ? 1 : 0))
    } else {
      setUnreadCount(0)
    }
  }, [messages.length, isOpen])

  // If chat is not open, don't render anything (will be handled by VideoCall component)
  if (!isOpen) {
    return null
  }

  return (
    <div className="h-full w-full bg-white border-l border-gray-200 flex flex-col">
      {/* Chat Header - Zoom/Meet style */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-2">
          <MessageCircle className="h-5 w-5 text-gray-600" />
          <h3 className="font-medium text-gray-900">Chat</h3>
          <Badge variant="secondary" className="text-xs">
            {participantCount} {participantCount === 1 ? 'participant' : 'participants'}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages Area - Zoom/Meet style */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-4">
            {isLoading ? (
              <div className="text-center text-sm text-gray-500 py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-300 mx-auto mb-2"></div>
                Loading messages...
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center text-sm text-gray-500 py-8">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">No messages yet</p>
                <p className="text-xs text-gray-400 mt-1">Start the conversation with your session partner!</p>
              </div>
            ) : (
              messages.slice().reverse().map((message) => (
                <div key={message.id} className="group">
                  {/* Message bubble */}
                  <div className={`flex items-start space-x-3 ${
                    message.user.role === userRole ? 'flex-row-reverse space-x-reverse' : ''
                  }`}>
                    {/* Avatar */}
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white ${
                      message.user.role === 'mentor' ? 'bg-purple-500' : 'bg-blue-500'
                    }`}>
                      {message.user.firstName[0]}{message.user.lastName[0]}
                    </div>
                    
                    {/* Message content */}
                    <div className={`flex-1 max-w-[75%] ${
                      message.user.role === userRole ? 'text-right' : 'text-left'
                    }`}>
                      {/* Name and timestamp */}
                      <div className={`flex items-center space-x-2 mb-1 text-xs text-gray-500 ${
                        message.user.role === userRole ? 'justify-end' : 'justify-start'
                      }`}>
                        <span className="font-medium">
                          {message.user.role === userRole ? 'You' : `${message.user.firstName} ${message.user.lastName}`}
                        </span>
                        <span>•</span>
                        <span>{formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}</span>
                        {message.isEdited && <span className="text-gray-400">(edited)</span>}
                      </div>
                      
                      {/* Message bubble */}
                      <div className={`inline-block rounded-2xl px-4 py-2 ${
                        message.user.role === userRole
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900 border'
                      }`}>
                        {message.messageType === 'file' && message.attachments?.[0] ? (
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              {getFileIcon(message.attachments[0].fileType)}
                              <span className="font-medium text-sm">{message.attachments[0].fileName}</span>
                            </div>
                            <div className="text-xs opacity-75">
                              {formatFileSize(message.attachments[0].fileSize)}
                            </div>
                            <Button
                              size="sm"
                              variant={message.user.role === userRole ? "secondary" : "outline"}
                              className="h-7 text-xs"
                              onClick={() => window.open(message.attachments![0].fileUrl, '_blank')}
                            >
                              <Download className="h-3 w-3 mr-1" />
                              Download
                            </Button>
                          </div>
                        ) : message.messageType === 'emoji' ? (
                          <span className="text-2xl">{message.message}</span>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                            {message.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="mx-4 mb-2">
          <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
            <div className="grid grid-cols-10 gap-2">
              {EMOJI_LIST.map((emoji) => (
                <Button
                  key={emoji}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-lg hover:bg-gray-100"
                  onClick={() => sendEmoji(emoji)}
                >
                  {emoji}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Message Input Area - Zoom/Meet style */}
      <div className="border-t border-gray-200 p-4 bg-gray-50">
        <div className="flex items-end space-x-2">
          {/* Action buttons */}
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-200"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              title="Attach file"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-200"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              title="Add emoji"
            >
              <Smile className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Message input */}
          <div className="flex-1 flex items-end space-x-2">
            <Input
              placeholder="Type a message here..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 min-h-[40px] max-h-[120px] py-2 px-3 text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              disabled={isSending}
            />
            <Button
              size="sm"
              onClick={sendMessage}
              disabled={!newMessage.trim() || isSending}
              className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Upload progress */}
        {isUploading && (
          <div className="mt-2 text-xs text-center text-gray-500 flex items-center justify-center">
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-400 mr-2" />
            Uploading file...
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileUpload}
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.js,.ts,.html,.css,.json"
        />
      </div>
    </div>
  )
}