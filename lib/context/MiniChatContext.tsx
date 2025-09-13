'use client'
import { createContext, useContext, ReactNode } from 'react'

interface MiniChatContextType {
  openMiniChat: (otherUserId: number, otherUserName: string, otherUserAvatar?: string) => void
}

const MiniChatContext = createContext<MiniChatContextType | undefined>(undefined)

export function useMiniChat() {
  const context = useContext(MiniChatContext)
  if (!context) {
    throw new Error('useMiniChat must be used within a MiniChatProvider')
  }
  return context
}

export function MiniChatProvider({ 
  children, 
  openChat 
}: { 
  children: ReactNode
  openChat: (otherUserId: number, otherUserName: string, otherUserAvatar?: string) => void
}) {
  const value = {
    openMiniChat: openChat
  }

  return (
    <MiniChatContext.Provider value={value}>
      {children}
    </MiniChatContext.Provider>
  )
}