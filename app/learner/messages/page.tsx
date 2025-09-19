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

interface User {
  id: number
  role: string
  firstName: string
  lastName: string
}

export default function LearnerMessagesPage() {
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

  // Show all conversations (including empty ones)
  // const conversationsWithMessages = conversations.filter(conversation =>
  //   conversation.lastMessage && conversation.lastMessageAt
  // )

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
    if (!conversation.lastMessage || !conversation.lastMessage.content) {
      return 'Start a conversation...'
    }

    const mentor = conversation.mentor
    const learner = conversation.learner

    // Determine who sent the last message based on the sender name
    let senderName = ''
    if (conversation.lastMessage.senderName) {
      const senderFirstName = conversation.lastMessage.senderName.split(' ')[0]

      // Only show "You" if the current user sent the message
      if (user && senderFirstName === user.firstName) {
        senderName = 'You'
      }
      // For other participants, show their first name only
      else {
        // Since this is learner messages page, the other participant is always the mentor
        senderName = mentor.firstName
      }
    } else {
      // If no senderName, fallback
      senderName = 'Someone'
    }

    return `${senderName}: ${conversation.lastMessage.content}`
  }

  const selectConversation = (conversation: any) => {
    setSelectedConversation(conversation)
  }

  // Check if conversation has unread messages
  const hasUnreadMessages = (conversation: any) => {
    if (!conversation.lastMessageAt || !user) return false

    // Get the appropriate last read timestamp based on user role
    let lastReadAt: string | null = null

    // Since this is learner messages page, current user is always the learner
    lastReadAt = conversation.learnerLastReadAt

    if (!lastReadAt) return true // If never read, it's unread

    const lastMessageTime = new Date(conversation.lastMessageAt).getTime()
    const lastReadTime = new Date(lastReadAt).getTime()

    return lastMessageTime > lastReadTime
  }

  // Check if the current user sent the last message
  const didCurrentUserSendLastMessage = (conversation: any) => {
    if (!conversation.lastMessage || !user) return false

    const senderFirstName = conversation.lastMessage.senderName?.split(' ')[0]
    return senderFirstName === user.firstName
  }

  // Get seen status text for display
  const getSeenStatus = (conversation: any) => {
    if (!conversation.lastMessage) return null

    if (didCurrentUserSendLastMessage(conversation)) {
      // If current user sent the last message, show if it's been seen by the other party
      const mentorLastReadAt = conversation.mentorLastReadAt
      if (!mentorLastReadAt) return 'Sent'

      const lastMessageTime = new Date(conversation.lastMessageAt).getTime()
      const mentorReadTime = new Date(mentorLastReadAt).getTime()

      return lastMessageTime <= mentorReadTime ? 'Seen' : 'Sent'
    }

    return null // Don't show seen status for messages from others
  }

  const handleDeleteConversation = async (conversationId: number) => {
    try {
      await deleteConversation(conversationId)
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
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">Messages</h1>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-xs text-gray-500">
                {isConnected ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
          {totalUnreadCount > 0 && (
            <div className="mt-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                {totalUnreadCount} unread messages
              </span>
            </div>
          )}
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <MessageCircle className="w-12 h-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No conversations yet</h3>
              <p className="text-sm text-gray-500">
                Start messaging mentors to begin conversations
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {conversations.map((conversation) => {
                const mentor = conversation.mentor
                const isUnread = hasUnreadMessages(conversation)
                const hasLastMessage = conversation.lastMessage && conversation.lastMessageAt
                const seenStatus = getSeenStatus(conversation)

                return (
                  <div
                    key={conversation.id}
                    className={`flex items-center p-4 hover:bg-gray-50 transition-colors group ${selectedConversation?.id === conversation.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''}`}
                  >
                    <div className="relative">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={mentor.profilePictureUrl || undefined} />
                        <AvatarFallback className="bg-blue-100 text-blue-600 font-medium">
                          {mentor.firstName[0]}{mentor.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                    </div>

                    <div className="ml-3 flex-1 min-w-0 cursor-pointer" onClick={() => selectConversation(conversation)}>
                      <div className="flex items-center justify-between">
                        <p className={`text-sm font-medium truncate ${isUnread ? 'text-gray-900' : 'text-gray-700'} ${selectedConversation?.id === conversation.id ? 'text-blue-600' : ''}`}>
                          {mentor.firstName} {mentor.lastName}
                        </p>
                        {hasLastMessage && (
                          <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                            {formatMessageTime(conversation.lastMessageAt!)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-1">
                        <p className={`text-sm truncate ${isUnread ? 'font-medium text-gray-900' : 'text-gray-500'}`}>
                          {getLastMessagePreview(conversation)}
                        </p>
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          {seenStatus && (
                            <span className={`text-xs font-medium ${
                              seenStatus === 'Seen' ? 'text-blue-600' : 'text-gray-400'
                            }`}>
                              {seenStatus}
                            </span>
                          )}
                          {isUnread && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
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
        className="flex-1"
      />
    </div>
  )
}