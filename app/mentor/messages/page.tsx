'use client'
import { useState, useEffect, useRef } from 'react'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Search, MessageCircle, Send, MoreVertical, ArrowLeft, Download, Trash2, Home } from 'lucide-react'
import { useChat } from '@/lib/hooks/useChat'
import { FileUpload } from '@/components/chat/FileUpload'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import MentorHeader from '@/components/mentor/Header'


export default function MentorMessagesPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null)
  const [user, setUser] = useState<any>(null)
  const [messageInput, setMessageInput] = useState('')
  const [loadingMessages, setLoadingMessages] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { conversations, messages, fetchConversations, createConversation, sendMessage, fetchMessages, loading, deleteMessage, deleteConversation } = useChat()

  useEffect(() => {
    // Get user session
    const getUserSession = async () => {
      try {
        const response = await fetch('/api/mentor/me')
        const data = await response.json()
        setUser(data)
      } catch (error) {
        console.error('Error fetching user session:', error)
      }
    }

    getUserSession()
    fetchConversations()
  }, [])

  useEffect(() => {
    if (selectedConversation) {
      setLoadingMessages(true)
      fetchMessages(selectedConversation).finally(() => setLoadingMessages(false))
    }
  }, [selectedConversation, fetchMessages])

  useEffect(() => {
    scrollToBottom()
  }, [messages, selectedConversation])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation) return

    const content = messageInput.trim()
    setMessageInput('')
    
    await sendMessage(selectedConversation, content)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleConversationSelect = (conversationId: number | null) => {
    setSelectedConversation(conversationId)
  }

  const filteredConversations = conversations.filter(conv =>
    conv.otherUser.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.otherUser.lastName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const currentMessages = selectedConversation ? messages[selectedConversation] || [] : []

  const totalUnreadMessages = conversations.reduce((total, conv) => total + conv.unreadCount, 0)


  const handleDeleteMessage = async (messageId: number) => {
    if (!selectedConversation) return
    await deleteMessage(messageId, selectedConversation)
  }

  const handleDeleteConversation = async (conversationId: number) => {
    if (confirm('Are you sure you want to delete this entire conversation? This cannot be undone.')) {
      const success = await deleteConversation(conversationId)
      if (success && selectedConversation === conversationId) {
        setSelectedConversation(null)
      }
    }
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase()
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      {/* Main Header */}
      <MentorHeader />
      
      {/* Messages Header */}
      <div className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-slate-900/60 shadow-sm">
        <div className="flex items-center justify-between h-16 px-6 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500/5 to-transparent opacity-0 animate-pulse"></div>
          <div className="flex items-center gap-4">
            {/* Back to Dashboard Button */}
            <Link href="/mentor">
              <Button 
                variant="ghost" 
                size="sm"
                className="hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              >
                <Home className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Dashboard</span>
              </Button>
            </Link>
            
            {/* Back to Conversations (Mobile) */}
            {selectedConversation && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleConversationSelect(null)}
                className="md:hidden bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
            <div className="relative z-10">
              <h1 className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-200 bg-clip-text text-transparent">
                {selectedConversation ? (
                  (() => {
                    const conversation = conversations.find(c => c.id === selectedConversation)
                    return conversation ? `${conversation.otherUser.firstName} ${conversation.otherUser.lastName}` : 'Messages'
                  })()
                ) : 'Messages'}
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                {selectedConversation ? 'Chat with your learner' : `${totalUnreadMessages} unread messages`}
              </p>
            </div>
          </div>
          
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Conversations Sidebar */}
        <div className={cn(
          "w-full md:w-80 border-r border-slate-200/50 dark:border-slate-700/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm flex flex-col",
          selectedConversation && "hidden md:flex"
        )}>
          {/* Search */}
          <div className="p-4 border-b border-slate-200/50 dark:border-slate-700/50">
            <div className="relative group">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors duration-200" />
              <Input
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-white/70 dark:bg-slate-800/70 border-slate-200/50 dark:border-slate-600/50 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl transition-all duration-200"
              />
            </div>
          </div>

          {/* Conversations List */}
          <ScrollArea className="flex-1">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <p className="text-slate-600 dark:text-slate-400">Loading conversations...</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center animate-fade-in">
                <div className="relative mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                    <MessageCircle className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="absolute inset-0 w-16 h-16 bg-gradient-to-br from-indigo-200 to-purple-200 dark:from-indigo-800 dark:to-purple-800 rounded-full animate-ping opacity-20 mx-auto"></div>
                </div>
                <h3 className="text-lg font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent mb-2">No conversations yet</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-6 text-sm font-medium">
                  Learners can message you from your profile or recommendations
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={cn(
                      "p-4 cursor-pointer hover:bg-white/80 dark:hover:bg-slate-800/80 transition-all duration-200 group relative rounded-lg mx-2 mb-1 hover:shadow-md hover:scale-[1.02]",
                      selectedConversation === conversation.id && "bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-800 shadow-md scale-[1.02]"
                    )}
                  >
                    <div className="flex items-start gap-3" onClick={() => handleConversationSelect(conversation.id)}>
                      <div className="relative">
                        <Avatar className="h-12 w-12 ring-2 ring-white dark:ring-slate-800 shadow-md">
                          <AvatarImage
                            src={conversation.otherUser.profilePictureUrl || ''}
                            alt={`${conversation.otherUser.firstName} ${conversation.otherUser.lastName}`}
                          />
                          <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold">
                            {getInitials(conversation.otherUser.firstName, conversation.otherUser.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full animate-pulse"></div>
                        {conversation.unreadCount > 0 && (
                          <div className="absolute -top-1 -right-1 h-6 w-6 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-lg animate-bounce">
                            {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-semibold text-sm truncate text-slate-900 dark:text-white">
                            {conversation.otherUser.firstName} {conversation.otherUser.lastName}
                          </h4>
                          {conversation.lastMessageAt && (
                            <span className="text-xs text-slate-400">
                              {format(new Date(conversation.lastMessageAt), 'MMM dd')}
                            </span>
                          )}
                        </div>
                        
                        <p className="text-xs text-slate-600 dark:text-slate-400 truncate mb-1 font-medium">
                          {conversation.lastMessage?.content || 'No messages yet'}
                        </p>
                        
                        <Badge className="text-xs h-5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 shadow-sm">
                          ✨ Learner
                        </Badge>
                      </div>
                    </div>
                    
                    {/* Delete conversation button */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="z-50">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteConversation(conversation.id)
                            }}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Chat
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Chat Area */}
        <div className={cn(
          "flex-1 flex flex-col bg-white/30 dark:bg-slate-900/30 backdrop-blur-sm",
          !selectedConversation && "hidden md:flex"
        )}>
          {selectedConversation ? (
            <>
              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                {loadingMessages && currentMessages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center animate-fade-in">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                      <h3 className="text-lg font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent mb-2">Loading messages...</h3>
                      <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">
                        Please wait while we fetch your conversation
                      </p>
                    </div>
                  </div>
                ) : currentMessages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center animate-fade-in">
                      <div className="relative mb-6">
                        <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                          <MessageCircle className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div className="absolute inset-0 w-16 h-16 bg-gradient-to-br from-indigo-200 to-purple-200 dark:from-indigo-800 dark:to-purple-800 rounded-full animate-ping opacity-20 mx-auto"></div>
                      </div>
                      <h3 className="text-lg font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent mb-2">Start your conversation</h3>
                      <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">
                        Send a message to begin this amazing chat
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {currentMessages.map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          "flex gap-3 max-w-[80%] group animate-message-pop",
                          message.senderId === user?.userId ? "ml-auto flex-row-reverse" : "mr-auto"
                        )}
                      >
                        {message.senderId !== user?.userId && (
                          <Avatar className="h-8 w-8 mt-1">
                            <AvatarImage
                              src={(() => {
                                const conversation = conversations.find(c => c.id === selectedConversation)
                                return conversation?.otherUser?.profilePictureUrl || ''
                              })()} 
                            />
                            <AvatarFallback className="bg-indigo-100 dark:bg-indigo-900/30 text-xs">
                              {getInitials(message.sender.firstName, message.sender.lastName)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        
                        <div className="flex flex-col gap-1 relative">
                          <div
                            className={cn(
                              "px-4 py-3 rounded-2xl text-sm relative shadow-sm transition-all duration-200 hover:shadow-md",
                              message.senderId === user?.userId
                                ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-md hover:from-indigo-700 hover:to-purple-700"
                                : "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-md border border-slate-200/50 dark:border-slate-600/50"
                            )}
                          >
                            {message.messageType === 'text' ? (
                              <p className="break-words">{message.content}</p>
                            ) : message.messageType === 'image' ? (
                              <div className="space-y-2">
                                {message.attachments && message.attachments.length > 0 && (
                                  <img
                                    src={message.attachments[0].fileUrl}
                                    alt={message.attachments[0].originalFileName}
                                    className="max-w-full h-auto rounded"
                                    style={{ maxHeight: '200px' }}
                                  />
                                )}
                                <p className="break-words">{message.content}</p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 p-2 bg-background/20 rounded">
                                  <div className="flex-1">
                                    <p className="font-medium">{message.content}</p>
                                    {message.attachments && message.attachments.length > 0 && (
                                      <p className="text-xs opacity-70">
                                        {(message.attachments[0].fileSize / 1024).toFixed(1)} KB
                                      </p>
                                    )}
                                  </div>
                                  {message.attachments && message.attachments.length > 0 && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      asChild
                                    >
                                      <a
                                        href={message.attachments[0].fileUrl}
                                        download={message.attachments[0].originalFileName}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        <Download className="h-3 w-3" />
                                      </a>
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* Delete button for own messages */}
                          {message.senderId === user?.userId && (
                            <div className="absolute -top-1 -right-8 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 hover:bg-gray-200 border border-gray-200 bg-white shadow-sm rounded-full"
                                  >
                                    <MoreVertical className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="z-50">
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteMessage(message.id)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          )}
                          
                          <span className={cn(
                            "text-xs px-1 font-medium",
                            message.senderId === user?.userId ? "text-right text-indigo-200" : "text-left text-slate-500 dark:text-slate-400"
                          )}>
                            {format(new Date(message.createdAt), 'HH:mm')}
                          </span>
                        </div>
                        
                        {message.senderId === user?.userId && (
                          <Avatar className="h-8 w-8 mt-1">
                            <AvatarFallback className="bg-gradient-to-br from-green-500 to-emerald-600 text-white text-xs font-medium">You</AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    ))}
                    
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Message Input */}
              <div className="p-4 border-t border-slate-200/50 dark:border-slate-700/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                <div className="flex gap-3 items-end">
                  <FileUpload
                    onFileSelect={(file) => {
                      console.log('File selected:', file)
                    }}
                    className="h-8 w-8 p-0 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                  />
                  <div className="flex-1 relative">
                    <Input
                      placeholder="Type a message..."
                      value={messageInput}
                      onChange={handleInputChange}
                      onKeyPress={handleKeyPress}
                      className="bg-white/70 dark:bg-slate-800/70 border-slate-200/50 dark:border-slate-600/50 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl pr-12 transition-all duration-200"
                    />
                    <Button 
                      onClick={handleSendMessage} 
                      size="sm"
                      disabled={!messageInput.trim()}
                      className={cn(
                        "absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 rounded-lg transition-all duration-200",
                        messageInput.trim() 
                          ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg hover:scale-105" 
                          : "bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed"
                      )}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            // No conversation selected
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center animate-fade-in">
                <div className="relative mb-8">
                  <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                    <MessageCircle className="h-12 w-12 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="absolute inset-0 w-24 h-24 bg-gradient-to-br from-indigo-200 to-purple-200 dark:from-indigo-800 dark:to-purple-800 rounded-full animate-ping opacity-10 mx-auto"></div>
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent mb-3">Select a conversation</h2>
                <p className="text-slate-600 dark:text-slate-400 mb-8 font-medium text-lg">
                  Choose a conversation from the sidebar to start messaging
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}