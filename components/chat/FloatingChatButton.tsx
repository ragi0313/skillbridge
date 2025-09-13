"use client"
import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useChatContext } from "./ChatProvider"
import { useChat } from "@/lib/hooks/useChat"

interface FloatingChatButtonProps {
  userId: number
  userRole: string
}

export function FloatingChatButton({ userId, userRole }: FloatingChatButtonProps) {
  const { chatState, openChat } = useChatContext()
  const { conversations, fetchConversations } = useChat()
  const [hasConversations, setHasConversations] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  useEffect(() => {
    setHasConversations(conversations.length > 0)
  }, [conversations])

  // Define routes where the floating chat button should be hidden
  const hiddenRoutes = [
    '/learner/messages',
    '/mentor/messages',
    '/sessions', // This will match any /sessions/[id] route
  ]

  // Check if current path should hide the chat button
  const shouldHide = hiddenRoutes.some(route => {
    if (route === '/sessions') {
      return pathname.startsWith('/sessions/')
    }
    return pathname === route
  })

  // If chat is already open, don't show the floating button
  if (chatState.isOpen || shouldHide) {
    return null
  }

  const handleChatClick = () => {
    // Always open in conversations list mode
    // Use 0 as otherUserId to indicate we want to show the conversations list
    openChat(0, "Messages", "")
  }

  return (
    <Button
      onClick={handleChatClick}
      className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg"
      size="icon"
    >
      <MessageCircle className="h-6 w-6 text-white" />
    </Button>
  )
}