"use client"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Send,
  X,
  Minimize2,
  Maximize2,
  MoreVertical,
  Trash2,
  Loader2,
  ArrowLeft,
} from "lucide-react"
import { useChat } from "@/lib/hooks/useChat"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

interface MiniChatBarProps {
  isOpen: boolean
  onClose: () => void
  otherUserId?: number
  otherUserName?: string
  otherUserAvatar?: string
  currentUserId?: number
}

export function MiniChatBar({
  isOpen,
  onClose,
  otherUserId,
  otherUserName,
  otherUserAvatar,
  currentUserId,
}: MiniChatBarProps) {
  const [isMinimized, setIsMinimized] = useState(false)
  const [messageInput, setMessageInput] = useState("")
  const [conversationId, setConversationId] = useState<number | null>(null)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const {
    conversations,
    messages,
    sendMessage,
    createConversation,
    fetchMessages,
    fetchConversations,
    deleteMessage,
    loading,
  } = useChat()

  useEffect(() => {
    const initializeChat = async () => {
      if (isOpen) {
        // Always start by showing conversations list (not a specific conversation)
        setConversationId(null)
        // Fetch fresh conversations to get latest data
        await fetchConversations()
      } else {
        // Reset conversation selection when closing
        setConversationId(null)
      }
    }

    initializeChat()
  }, [isOpen, fetchConversations])

  useEffect(() => {
    scrollToBottom()
  }, [messages, conversationId])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !conversationId) return

    const content = messageInput.trim()
    setMessageInput("")

    await sendMessage(conversationId, content)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  const handleDeleteMessage = async (messageId: number) => {
    if (!conversationId) return
    await deleteMessage(messageId, conversationId)
  }

  const handleSelectConversation = async (conversation: any) => {
    setConversationId(conversation.id)
    setLoadingMessages(true)
    try {
      await fetchMessages(conversation.id)
    } finally {
      setLoadingMessages(false)
    }
  }

  const conversationMessages = conversationId ? messages[conversationId] || [] : []

  if (!isOpen) return null

  return (
    <div
      className={cn(
        "fixed bottom-0 right-6 z-50 bg-white border border-slate-200 rounded-t-2xl shadow-2xl transition-all duration-300",
        isMinimized ? "h-14" : "h-[500px]",
        "w-96",
      )}
    >
      <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 rounded-t-2xl">
        <div className="flex items-center gap-3">
          {conversationId && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:bg-slate-200 rounded-xl transition-colors"
              onClick={() => setConversationId(null)}
            >
              <ArrowLeft className="h-4 w-4 text-slate-600" />
            </Button>
          )}
          <div className="relative">
            <Avatar className="h-8 w-8 ring-2 ring-green-500 ring-offset-2 ring-offset-white">
              {conversationId && (() => {
                const conversation = conversations.find(c => c.id === conversationId)
                const profilePictureUrl = conversation?.otherUser.profilePictureUrl
                if (profilePictureUrl) {
                  return (
                    <AvatarImage 
                      src={profilePictureUrl} 
                      alt={`${conversation.otherUser.firstName} ${conversation.otherUser.lastName}`} 
                    />
                  )
                }
                return null
              })()}
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-sm font-semibold">
                {conversationId ? (
                  (() => {
                    const conversation = conversations.find(c => c.id === conversationId)
                    return conversation ? getInitials(conversation.otherUser.firstName, conversation.otherUser.lastName) : "?"
                  })()
                ) : "💬"}
              </AvatarFallback>
            </Avatar>
            {conversationId && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>}
          </div>
          <div className="flex-1">
            <p className="font-semibold text-slate-900 text-sm">
              {conversationId ? (
                (() => {
                  const conversation = conversations.find(c => c.id === conversationId)
                  return conversation ? `${conversation.otherUser.firstName} ${conversation.otherUser.lastName}` : "Chat"
                })()
              ) : "Messages"}
            </p>
            <p className="text-xs text-slate-500">
              {conversationId ? "Active now" : `${conversations.length} conversations`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:bg-slate-200 rounded-xl transition-colors"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized ? (
              <Maximize2 className="h-4 w-4 text-slate-600" />
            ) : (
              <Minimize2 className="h-4 w-4 text-slate-600" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:bg-slate-200 rounded-xl transition-colors"
            onClick={onClose}
          >
            <X className="h-4 w-4 text-slate-600" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <ScrollArea className="h-80 p-4 bg-white">
            {!conversationId ? (
              // Show conversation list
              <div className="space-y-2">
                {loading ? (
                  <div className="text-center text-slate-500 py-12">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-slate-400" />
                    <p className="text-sm font-medium text-slate-700 mb-1">Loading conversations...</p>
                    <p className="text-xs text-slate-500">Please wait while we fetch your messages</p>
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="text-center text-slate-500 py-12">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">💬</span>
                    </div>
                    <p className="text-sm font-medium text-slate-700 mb-1">No conversations yet</p>
                    <p className="text-xs text-slate-500">Start a conversation with a mentor</p>
                  </div>
                ) : (
                  conversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                      onClick={() => handleSelectConversation(conversation)}
                    >
                      <Avatar className="h-10 w-10">
                        {conversation.otherUser.profilePictureUrl && (
                          <AvatarImage src={conversation.otherUser.profilePictureUrl} />
                        )}
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs">
                          {getInitials(`${conversation.otherUser.firstName} ${conversation.otherUser.lastName}`)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate text-sm">
                          {conversation.otherUser.firstName} {conversation.otherUser.lastName}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {conversation.lastMessage ? (
                            <>
                              <span className="font-medium">
                                {conversation.lastMessage.senderId === currentUserId ? "You" : conversation.otherUser.firstName}:
                              </span>
                              {" " + conversation.lastMessage.content}
                            </>
                          ) : (
                            "No messages yet"
                          )}
                        </p>
                      </div>
                      {conversation.lastMessageAt && (
                        <span className="text-xs text-slate-500">
                          {format(new Date(conversation.lastMessageAt), "MMM d")}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            ) : loadingMessages && conversationMessages.length === 0 ? (
              <div className="text-center text-slate-500 py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-slate-400" />
                <p className="text-sm">Loading messages...</p>
              </div>
            ) : conversationMessages.length === 0 ? (
              <div className="text-center text-slate-500 py-12">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Avatar className="h-10 w-10">
                    {(() => {
                      const conversation = conversations.find(c => c.id === conversationId)
                      const profilePictureUrl = conversation?.otherUser.profilePictureUrl
                      if (profilePictureUrl) {
                        return <AvatarImage src={profilePictureUrl} />
                      }
                      return null
                    })()}
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                      {(() => {
                        const conversation = conversations.find(c => c.id === conversationId)
                        return conversation ? getInitials(conversation.otherUser.firstName, conversation.otherUser.lastName) : "?"
                      })()}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <p className="text-sm font-medium text-slate-700 mb-1">Start your conversation</p>
                <p className="text-xs text-slate-500">Send a message to {(() => {
                  const conversation = conversations.find(c => c.id === conversationId)
                  return conversation ? conversation.otherUser.firstName : "this person"
                })()}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {conversationMessages.map((message, index) => {
                  const isOwn = message.senderId === currentUserId
                  const showAvatar = index === 0 || conversationMessages[index - 1]?.senderId !== message.senderId

                  return (
                    <div
                      key={`${conversationId}-${message.id}`}
                      className={cn(
                        "flex gap-3 group hover:bg-slate-50 -mx-2 px-2 py-1 rounded-xl transition-colors",
                        isOwn ? "justify-end" : "justify-start",
                      )}
                    >
                      {!isOwn && (
                        <div className="w-8 flex justify-center">
                          {showAvatar ? (
                            <Avatar className="h-8 w-8">
                              {(() => {
                                const conversation = conversations.find(c => c.id === conversationId)
                                const profilePictureUrl = conversation?.otherUser.profilePictureUrl
                                if (profilePictureUrl) {
                                  return <AvatarImage src={profilePictureUrl} />
                                }
                                return null
                              })()}
                              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs font-medium">
                                {(() => {
                                  const conversation = conversations.find(c => c.id === conversationId)
                                  return conversation ? getInitials(conversation.otherUser.firstName, conversation.otherUser.lastName) : "?"
                                })()}
                              </AvatarFallback>
                            </Avatar>
                          ) : (
                            <div className="w-8 h-8 flex items-center justify-center">
                              <span className="text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                {format(new Date(message.createdAt), "HH:mm")}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex-1 max-w-xs">
                        {!isOwn && showAvatar && (
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-slate-900">
                              {(() => {
                                const conversation = conversations.find(c => c.id === conversationId)
                                return conversation ? `${conversation.otherUser.firstName} ${conversation.otherUser.lastName}` : "User"
                              })()}
                            </span>
                            <span className="text-xs text-slate-500">
                              {format(new Date(message.createdAt), "HH:mm")}
                            </span>
                          </div>
                        )}

                        <div className="relative">
                          <div
                            className={cn(
                              "px-4 py-2 rounded-2xl text-sm leading-relaxed shadow-sm",
                              isOwn
                                ? "bg-blue-600 text-white ml-auto max-w-fit"
                                : "bg-slate-100 text-slate-900",
                            )}
                          >
                            <p className="break-words whitespace-pre-wrap">{message.content}</p>
                          </div>

                          {isOwn && (
                            <div className="flex items-center justify-end gap-1 mt-1">
                              <span className="text-xs text-slate-400">
                                {format(new Date(message.createdAt), "HH:mm")}
                              </span>
                            </div>
                          )}

                          {isOwn && (
                            <div className="absolute -top-1 -right-10 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 hover:bg-slate-200 border border-slate-200 bg-white shadow-sm rounded-full"
                                  >
                                    <MoreVertical className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="z-50 min-w-[120px]">
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteMessage(message.id)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          )}
                        </div>
                      </div>

                      {isOwn && (
                        <div className="w-8 flex justify-center">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-gradient-to-br from-green-500 to-emerald-600 text-white text-xs font-semibold">
                              You
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      )}
                    </div>
                  )
                })}

                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {conversationId && (
            <div className="p-4 border-t border-slate-200 bg-white rounded-b-2xl">
              <div className="flex items-end gap-2">
                <div className="flex-1 relative">
                  <div className="relative">
                    <Input
                      placeholder={(() => {
                        const conversation = conversations.find(c => c.id === conversationId)
                        return conversation ? `Message ${conversation.otherUser.firstName}...` : "Type a message..."
                      })()}
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="pr-12 border-slate-200 focus:border-blue-500 focus:ring-blue-500 rounded-2xl bg-slate-50 focus:bg-white transition-colors"
                    />
                    <Button
                      onClick={handleSendMessage}
                      size="sm"
                      className={cn(
                        "absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0 rounded-xl transition-all",
                        messageInput.trim()
                          ? "bg-blue-600 hover:bg-blue-700 text-white"
                          : "bg-slate-200 text-slate-400 cursor-not-allowed",
                      )}
                      disabled={!messageInput.trim()}
                    >
                      <Send className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}