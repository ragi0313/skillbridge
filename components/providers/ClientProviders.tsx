'use client'

import { ReactNode, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { ChatProvider } from '@/lib/context/ChatContext'
import { MiniChatBar } from '@/components/chat/MiniChatBar'
import { useHeartbeat } from '@/lib/hooks/useHeartbeat'

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
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const pathname = usePathname()

  // Send periodic heartbeats to keep online status updated
  useHeartbeat()

  // Pages where MiniChatBar should not be shown
  const hideMiniChatOnPaths = [
    '/learner/messages',
    '/mentor/messages',
    '/sessions/',  // This will hide for all session pages including waiting room and video call
    '/admin'       // Hide on all admin pages
  ]

  // Only show MiniChat for mentors and learners, not admins
  const shouldHideMiniChat = hideMiniChatOnPaths.some(path => pathname?.includes(path)) || user?.role === 'admin'

  // Get current user from cookie/session
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
          cache: 'no-store' // Prevent caching to ensure fresh data
        })

        if (response.ok) {
          const userData = await response.json()
          setUser(userData.user)
        } else if (response.status === 401) {
          // 401 is expected for public pages - not an error, just not authenticated
          setUser(null)
        } else {
          // Other errors (500, etc.) - log in development
          if (process.env.NODE_ENV === 'development') {
            console.error(`Auth check failed with status ${response.status}`)
          }
          setUser(null)
        }
      } catch (error) {
        // Only log network errors in development
        if (process.env.NODE_ENV === 'development') {
          console.error('Network error during auth check:', error)
        }
        setUser(null)
      } finally {
        // Only set initial loading to false on first load
        setIsInitialLoading(false)
      }
    }

    getCurrentUser()
  }, [pathname]) // Re-fetch user when pathname changes

  // Only show loading spinner on initial page load, not on route changes
  if (isInitialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Only wrap with ChatProvider for mentors and learners, not admins
  // Admins don't have conversations feature
  const shouldUseChatProvider = user && (user.role === 'mentor' || user.role === 'learner')

  if (shouldUseChatProvider) {
    return (
      <ChatProvider user={user}>
        {children}
        {!shouldHideMiniChat && <MiniChatBar user={user} />}
      </ChatProvider>
    )
  }

  // For admins or non-authenticated users, don't use ChatProvider
  return <>{children}</>
}