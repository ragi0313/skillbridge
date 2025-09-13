"use client"
import { useState, useEffect, createContext, useContext, ReactNode } from "react"
import { usePathname } from "next/navigation"
import { FloatingChatButton } from "./FloatingChatButton"
import { MiniChatBar } from "./MiniChatBar"
import { MiniChatProvider } from "@/lib/context/MiniChatContext"

interface ChatState {
  isOpen: boolean
  otherUserId?: number
  otherUserName?: string
  otherUserAvatar?: string
}

interface ChatContextType {
  chatState: ChatState
  openChat: (otherUserId: number, otherUserName: string, otherUserAvatar?: string) => void
  closeChat: () => void
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export function useChatContext() {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider')
  }
  return context
}

function ChatComponents() {
  const { chatState, closeChat } = useChatContext()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()

  useEffect(() => {
    const getUserSession = async () => {
      try {
        const response = await fetch("/api/auth/session")
        if (response.ok) {
          const data = await response.json()
          if (data.user) {
            setUser({
              userId: data.user.id,
              role: data.user.role,
              firstName: data.user.firstName,
              lastName: data.user.lastName,
              profilePictureUrl: data.user.profilePictureUrl,
            })
          }
        }
      } catch (error) {
        console.error("Error fetching user session:", error)
      } finally {
        setLoading(false)
      }
    }

    getUserSession()
  }, [])

  if (loading || !user || !["mentor", "learner"].includes(user.role)) {
    return null
  }

  // Define routes where the minichat should be hidden
  const hiddenRoutes = [
    '/learner/messages',
    '/mentor/messages',
    '/sessions', // This will match any /sessions/[id] route
  ]

  // Check if current path should hide the minichat
  const shouldHideChat = hiddenRoutes.some(route => {
    if (route === '/sessions') {
      return pathname.startsWith('/sessions/')
    }
    return pathname === route
  })

  return (
    <>
      <FloatingChatButton userId={user.userId} userRole={user.role} />
      
      {chatState.isOpen && !shouldHideChat && (
        <MiniChatBar
          isOpen={chatState.isOpen}
          onClose={closeChat}
          otherUserId={chatState.otherUserId}
          otherUserName={chatState.otherUserName}
          otherUserAvatar={chatState.otherUserAvatar}
          currentUserId={user.userId}
        />
      )}
    </>
  )
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const [chatState, setChatState] = useState<ChatState>({ isOpen: false })

  const openChat = (otherUserId: number, otherUserName: string, otherUserAvatar?: string) => {
    setChatState({
      isOpen: true,
      otherUserId,
      otherUserName,
      otherUserAvatar
    })
  }

  const closeChat = () => {
    setChatState({ isOpen: false })
  }

  return (
    <ChatContext.Provider value={{ chatState, openChat, closeChat }}>
      <MiniChatProvider openChat={openChat}>
        {children}
      </MiniChatProvider>
      <ChatComponents />
    </ChatContext.Provider>
  )
}