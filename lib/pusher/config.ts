// Server-side Pusher configuration (only runs on server)
let pusherServer: any = null

// Only attempt to initialize server-side Pusher if we're actually on the server
// and not during SSR compilation
if (typeof window === 'undefined' && typeof process !== 'undefined' && process.env.NODE_ENV) {
  // Only initialize if all required environment variables are present
  if (process.env.PUSHER_APP_ID && process.env.PUSHER_KEY && process.env.PUSHER_SECRET && process.env.PUSHER_CLUSTER) {
    try {
      // Use eval to prevent bundlers from trying to resolve this at compile time
      const requireFunc = eval('require')
      const Pusher = requireFunc('pusher')
      pusherServer = new Pusher({
        appId: process.env.PUSHER_APP_ID,
        key: process.env.PUSHER_KEY,
        secret: process.env.PUSHER_SECRET,
        cluster: process.env.PUSHER_CLUSTER,
        useTLS: true,
      })
      console.log('[PUSHER] Server initialized successfully')
    } catch (error) {
      console.warn('[PUSHER] Server-side Pusher not available, chat will use polling mode:', (error as Error)?.message || 'Unknown error')
      pusherServer = null
    }
  } else {
    console.warn('[PUSHER] Server not initialized - missing environment variables, using polling mode')
    pusherServer = null
  }
}

export { pusherServer }

// Helper function to safely trigger Pusher events
export const triggerPusherEvent = async (
  channel: string,
  event: string,
  data: any,
  options?: { fallbackLog?: boolean }
): Promise<boolean> => {
  if (!pusherServer) {
    if (options?.fallbackLog !== false) {
      console.debug(`[PUSHER] Event not sent - using polling mode: ${channel}/${event}`)
    }
    return false
  }

  try {
    await pusherServer.trigger(channel, event, data)
    return true
  } catch (error) {
    console.warn(`[PUSHER] Failed to trigger event ${channel}/${event}, falling back to polling:`, (error as Error)?.message || 'Unknown error')
    return false
  }
}

// Helper to check if Pusher is available
export const isPusherAvailable = (): boolean => {
  return pusherServer !== null
}

// Client-side Pusher configuration
export const getPusherConfig = () => {
  if (typeof window === 'undefined') {
    return null
  }

  const key = process.env.NEXT_PUBLIC_PUSHER_KEY
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER

  if (!key || !cluster) {
    console.error('Missing client-side Pusher environment variables: NEXT_PUBLIC_PUSHER_KEY and NEXT_PUBLIC_PUSHER_CLUSTER must be set')
    return null
  }

  return {
    key,
    cluster,
  }
}

export const pusherConfig = {
  key: process.env.NEXT_PUBLIC_PUSHER_KEY || '',
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || '',
}

// Channel naming conventions for chat
export const getConversationChannel = (conversationId: number) =>
  `conversation-${conversationId}`

export const getUserPresenceChannel = (userId: number) =>
  `presence-user-${userId}`

// Chat event types
export const PUSHER_EVENTS = {
  NEW_MESSAGE: 'new-message',
  MESSAGE_DELETED: 'message-deleted',
  MESSAGE_EDITED: 'message-edited',
  TYPING_START: 'typing-start',
  TYPING_STOP: 'typing-stop',
  CONVERSATION_READ: 'conversation-read',
  USER_ONLINE: 'user-online',
  USER_OFFLINE: 'user-offline',
} as const

export type PusherEvent = typeof PUSHER_EVENTS[keyof typeof PUSHER_EVENTS]

// Message types for chat
export interface ChatMessage {
  id: number
  conversationId: number
  senderId: number
  content: string
  messageType: 'text' | 'file' | 'image'
  createdAt: string
  editedAt?: string
  sender: {
    id: number
    firstName: string
    lastName: string
    profilePictureUrl?: string
  }
  attachments?: Array<{
    id: number
    originalFilename: string
    fileUrl: string
    fileSize: number
    mimeType: string
  }>
}

export interface TypingData {
  userId: number
  conversationId: number
  userName: string
}