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
  isMinimized?: boolean
  onToggleMinimize?: () => void
}

const EMOJI_LIST = [
  "😀", "😊", "😂", "🤔", "👍", "👎", "❤️", "🎉", "🔥", "💯",
  "👋", "🙏", "💪", "🎯", "⭐", "✅", "❌", "⚡", "🚀", "💡"
]

export default function ChatPanel({ sessionId, userRole, isMinimized = false, onToggleMinimize }: ChatPanelProps) {
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

  // Track unread messages when minimized
  useEffect(() => {
    if (isMinimized) {
      setUnreadCount(prev => prev + (messages.length > 0 ? 1 : 0))
    } else {
      setUnreadCount(0)
    }
  }, [messages.length, isMinimized])

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={onToggleMinimize}
          className="rounded-full w-14 h-14 bg-blue-600 hover:bg-blue-700 relative"
        >
          <MessageCircle className="h-6 w-6" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-2 -right-2 bg-red-500 text-white min-w-[1.25rem] h-5 text-xs">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </div>
    )
  }

  return (
    <Card className="w-80 h-96 flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center">
            <MessageCircle className="h-4 w-4 mr-2" />
            Session Chat
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleMinimize}
            className="h-6 w-6 p-0"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-2 space-y-2">
        {/* Messages */}
        <ScrollArea className="flex-1" ref={chatContainerRef}>
          <div className="space-y-2 pr-2">
            {isLoading ? (
              <div className="text-center text-sm text-gray-500 py-4">
                Loading messages...
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center text-sm text-gray-500 py-4">
                No messages yet. Start the conversation!
              </div>
            ) : (
              messages.slice().reverse().map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.user.id === parseInt(sessionId) ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-2 ${
                      message.user.id === parseInt(sessionId)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <div className="text-xs opacity-75 mb-1">
                      {message.user.firstName} {message.user.lastName}
                    </div>
                    
                    {message.messageType === 'file' && message.attachments?.[0] ? (
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2 text-sm">
                          {getFileIcon(message.attachments[0].fileType)}
                          <span className="truncate">{message.attachments[0].fileName}</span>
                        </div>
                        <div className="text-xs opacity-75">
                          {formatFileSize(message.attachments[0].fileSize)}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-xs"
                          onClick={() => window.open(message.attachments![0].fileUrl, '_blank')}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>
                      </div>
                    ) : (
                      <div className="text-sm whitespace-pre-wrap break-words">
                        {message.message}
                      </div>
                    )}
                    
                    <div className="text-xs opacity-75 mt-1">
                      {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                      {message.isEdited && " (edited)"}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <Separator />

        {/* Emoji Picker */}
        {showEmojiPicker && (
          <div className="bg-white border rounded-lg p-2 shadow-lg">
            <div className="grid grid-cols-5 gap-1">
              {EMOJI_LIST.map((emoji) => (
                <Button
                  key={emoji}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-lg"
                  onClick={() => sendEmoji(emoji)}
                >
                  {emoji}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Message Input */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              <Smile className="h-4 w-4" />
            </Button>
          </div>
          
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 h-8"
            disabled={isSending}
          />
          
          <Button
            size="sm"
            onClick={sendMessage}
            disabled={!newMessage.trim() || isSending}
            className="h-8"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileUpload}
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.js,.ts,.html,.css,.json"
        />

        {/* Upload progress */}
        {isUploading && (
          <div className="text-xs text-center text-gray-500">
            Uploading file...
          </div>
        )}
      </CardContent>
    </Card>
  )
}