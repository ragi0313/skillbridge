'use client'
import { ReactNode } from 'react'
import { ChatProvider } from '@/components/chat/ChatProvider'

interface ClientProvidersProps {
  children: ReactNode
}

export function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <ChatProvider>
      {children}
    </ChatProvider>
  )
}