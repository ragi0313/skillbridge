'use client'

import { useEffect, useState } from 'react'
import { useChat } from '@/lib/context/ChatContext'
import { ChatInterface } from '@/components/chat/ChatInterface'
import { MessageCircle, MoreVertical, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { format } from 'date-fns'
import { toast } from 'sonner'
import MentorHeader from '@/components/mentor/Header'

interface User {
  id: number
  role: string
  firstName: string
  lastName: string
}

export default function MentorMessagesPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedConversation, setSelectedConversation] = useState<any>(null)

  const {
    conversations,
    totalUnreadCount,
    fetchConversations,
    deleteConversation,
    isConnected,
  } = useChat()

  useEffect(() => {
    async function loadUser() {
      try {
        const response = await fetch('/api/auth/me')
        if (response.ok) {
          const data = await response.json()
          setUser(data.user)
        }
      } catch (error) {
        console.error('Error loading user session:', error)
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [])

  useEffect(() => {
    if (user) {
      fetchConversations()
    }
  }, [user, fetchConversations])

  // Only show conversations that have at least one message
  const conversationsWithMessages = conversations.filter(conversation =>
    conversation.lastMessageAt
  )

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return 'now'
    if (diffInMinutes < 60) return `${diffInMinutes}m`
    if (diffInMinutes < 1440) return format(date, 'HH:mm')
    return format(date, 'MMM d')
  }

  const getLastMessagePreview = (conversation: any) => {
    // If no last message exists, show start conversation text
    if (!conversation.lastMessage) {
      return 'Start a conversation...'
    }

    // Determine if current user sent the message using senderId
    const isCurrentUserSender = user && conversation.lastMessage.senderId === user.id

    // Handle empty content (file/image only messages)
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

    // Only prepend "You: " if current user sent the message
    if (isCurrentUserSender) {
      return `You: ${preview}`
    }

    // Otherwise, just show the message preview without any prefix
    return preview
  }

  const selectConversation = (conversation: any) => {
    setSelectedConversation(conversation)
  }

  // Check if conversation has unread messages
  const hasUnreadMessages = (conversation: any) => {
    if (!conversation.lastMessageAt || !user) return false

    // Get the appropriate last read timestamp based on user role
    let lastReadAt: string | null = null

    // Since this is mentor messages page, current user is always the mentor
    lastReadAt = conversation.mentorLastReadAt

    if (!lastReadAt) return true // If never read, it's unread

    const lastMessageTime = new Date(conversation.lastMessageAt).getTime()
    const lastReadTime = new Date(lastReadAt).getTime()

    return lastMessageTime > lastReadTime
  }

  // Check if the current user sent the last message
  const didCurrentUserSendLastMessage = (conversation: any) => {
    if (!conversation.lastMessage || !user) return false

    return conversation.lastMessage.senderId === user.id
  }

  // Get seen status text for display
  const getSeenStatus = (conversation: any) => {
    if (!conversation.lastMessage) return null

    if (didCurrentUserSendLastMessage(conversation)) {
      // If current user sent the last message, show if it's been seen by the other party
      const learnerLastReadAt = conversation.learnerLastReadAt
      if (!learnerLastReadAt) return 'Sent'

      const lastMessageTime = new Date(conversation.lastMessageAt).getTime()
      const learnerReadTime = new Date(learnerLastReadAt).getTime()

      return lastMessageTime <= learnerReadTime ? 'Seen' : 'Sent'
    }

    return null // Don't show seen status for messages from others
  }

  const handleDeleteConversation = async (conversationId: number) => {
    try {
      await deleteConversation(conversationId)

      // If the deleted conversation is currently selected, close it
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(null)
      }

      toast.success('Conversation deleted successfully')
    } catch (error) {
      toast.error('Failed to delete conversation')
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading messages...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <MentorHeader />
      <div className="flex h-[calc(100vh-80px)]">
        {/* Sidebar */}
        <div className="w-80 bg-white/80 backdrop-blur-sm border-r border-gray-200/50 flex flex-col shadow-lg">
          {/* Header */}
          <div className="p-6 border-b border-gray-200/50 bg-gradient-to-r from-green-600 to-blue-600">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-white drop-shadow-sm">Messages</h1>
              <div className="flex items-center space-x-2 bg-white/20 rounded-full px-3 py-1">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <span className="text-xs text-white/90 font-medium">
                  {isConnected ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
            {totalUnreadCount > 0 && (
              <div className="mt-3">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-500 text-white shadow-md">
                  {totalUnreadCount} unread messages
                </span>
              </div>
            )}
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto bg-white/50">
            {conversationsWithMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <div className="bg-gradient-to-br from-green-100 to-blue-100 p-4 rounded-full mb-6">
                  <MessageCircle className="w-12 h-12 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No conversations yet</h3>
                <p className="text-sm text-gray-600 max-w-xs">
                  Start mentoring learners to begin meaningful conversations and share your expertise
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100/50">
              {conversationsWithMessages.map((conversation) => {
                const learner = conversation.learner
                const isUnread = hasUnreadMessages(conversation)
                const hasLastMessage = conversation.lastMessage && conversation.lastMessageAt
                const seenStatus = getSeenStatus(conversation)

                return (
                  <div
                    key={conversation.id}
                    className={`flex items-center p-4 hover:bg-green-50/50 transition-all duration-200 group cursor-pointer ${selectedConversation?.id === conversation.id ? 'bg-gradient-to-r from-green-100 to-blue-100 border-r-4 border-green-500 shadow-sm' : ''}`}
                  >
                    <Avatar className="w-12 h-12 ring-2 ring-green-200/50 transition-all duration-200 group-hover:ring-green-300">
                      <AvatarImage src={learner.profilePictureUrl || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-green-500 to-blue-600 text-white font-semibold">
                        {learner.firstName[0]}{learner.lastName[0]}
                      </AvatarFallback>
                    </Avatar>

                    <div className="ml-3 flex-1 min-w-0 cursor-pointer" onClick={() => selectConversation(conversation)}>
                      <div className="flex items-center justify-between">
                        <p className={`text-sm font-medium truncate ${isUnread ? 'text-gray-900' : 'text-gray-700'} ${selectedConversation?.id === conversation.id ? 'text-green-600' : ''}`}>
                          {learner.firstName} {learner.lastName}
                        </p>
                        {hasLastMessage && (
                          <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                            {formatMessageTime(conversation.lastMessageAt!)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-1">
                        <p className={`text-sm truncate ${isUnread ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>
                          {getLastMessagePreview(conversation)}
                        </p>
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          {/* Only show seen status for messages sent by current user */}
                          {seenStatus && didCurrentUserSendLastMessage(conversation) && (
                            <span className={`text-xs font-medium ${
                              seenStatus === 'Seen' ? 'text-green-600' : 'text-gray-400'
                            }`}>
                              {seenStatus}
                            </span>
                          )}
                          {/* Show unread indicator only for received messages */}
                          {isUnread && !didCurrentUserSendLastMessage(conversation) && (
                            <div className="w-2 h-2 bg-green-500 rounded-full shadow-sm animate-pulse"></div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleDeleteConversation(conversation.id)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Chat
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

        {/* Main Content Area */}
        <ChatInterface
          user={user}
          conversation={selectedConversation}
          onBack={() => setSelectedConversation(null)}
          className="flex-1 bg-white/60 backdrop-blur-sm shadow-lg rounded-l-xl"
        />
      </div>
    </div>
  )
}