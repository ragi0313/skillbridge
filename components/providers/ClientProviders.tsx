'use client'

import { ReactNode, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { ChatProvider } from '@/lib/context/ChatContext'
import { MiniChatBar } from '@/components/chat/MiniChatBar'

interface ClientProvidersProps {
  children: ReactNode
}

interface User {
  id: number
  role: string
  firstName: string
  lastName: string
  email: string
}

export function ClientProviders({ children }: ClientProvidersProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const pathname = usePathname()

  // Pages where MiniChatBar should not be shown
  const hideMiniChatOnPaths = [
    '/learner/messages',
    '/mentor/messages',
    '/sessions/'  // This will hide for all session pages including waiting room and video call
  ]

  const shouldHideMiniChat = hideMiniChatOnPaths.some(path => pathname?.includes(path))

  // Get current user from cookie/session
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include'
        })

        if (response.ok) {
          const userData = await response.json()
          setUser(userData.user)
        }
      } catch (error) {
        console.error('Failed to get current user:', error)
      } finally {
        setIsLoading(false)
      }
    }

    getCurrentUser()
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <ChatProvider user={user}>
      {children}
      {user && !shouldHideMiniChat && <MiniChatBar user={user} />}
    </ChatProvider>
  )
}