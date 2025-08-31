// Simple WebSocket-based chat fallback for when Agora RTM fails
export interface ChatMessage {
  id: string
  message: string
  messageType: "text" | "file"
  timestamp: number
  senderName: string
  senderRole: "learner" | "mentor"
  senderId: string
  attachment?: ChatAttachment
}

export interface ChatAttachment {
  fileName: string
  fileSize: number
  fileType: string
  fileData: string // Base64 encoded file data
}

export class WebSocketChat {
  private ws: WebSocket | null = null
  private sessionId: string
  private userId: string
  private userName: string
  private userRole: "learner" | "mentor"
  private onMessage: (message: ChatMessage) => void
  private onError: (error: string) => void
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectTimeout: NodeJS.Timeout | null = null

  constructor(
    sessionId: string,
    userId: string,
    userName: string,
    userRole: "learner" | "mentor",
    onMessage: (message: ChatMessage) => void,
    onError: (error: string) => void
  ) {
    this.sessionId = sessionId
    this.userId = userId
    this.userName = userName
    this.userRole = userRole
    this.onMessage = onMessage
    this.onError = onError
  }

  connect(): void {
    try {
      // Use environment variable or fallback to localhost for development
      const wsBaseUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'
      const wsUrl = `${wsBaseUrl}/chat/${this.sessionId}`
      console.log(`[WEBSOCKET_CHAT] Connecting to: ${wsUrl}`)
      
      this.ws = new WebSocket(wsUrl)
      
      this.ws.onopen = () => {
        console.log(`[WEBSOCKET_CHAT] Connected to session ${this.sessionId}`)
        this.reconnectAttempts = 0
        
        // Send join message
        this.send({
          type: 'join',
          userId: this.userId,
          userName: this.userName,
          userRole: this.userRole
        })
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          
          if (data.type === 'message' && data.message) {
            this.onMessage(data.message)
          }
        } catch (error) {
          console.error('[WEBSOCKET_CHAT] Error parsing message:', error)
        }
      }

      this.ws.onclose = () => {
        console.log('[WEBSOCKET_CHAT] Connection closed')
        this.attemptReconnect()
      }

      this.ws.onerror = (error) => {
        console.error('[WEBSOCKET_CHAT] WebSocket error:', error)
        const errorMessage = error instanceof ErrorEvent ? error.message : 'Chat server unavailable'
        this.onError(`Chat connection error: ${errorMessage}`)
      }

    } catch (error) {
      console.error('[WEBSOCKET_CHAT] Failed to connect:', error)
      this.onError('Failed to connect to chat')
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.onError('Chat connection lost - maximum reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000)
    
    console.log(`[WEBSOCKET_CHAT] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
    
    this.reconnectTimeout = setTimeout(() => {
      this.connect()
    }, delay)
  }

  sendMessage(message: string, file?: File): Promise<void> {
    return new Promise(async (resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('Chat not connected'))
        return
      }

      try {
        let messageData: any = {
          id: Date.now().toString(),
          message: message.trim(),
          messageType: file ? 'file' : 'text',
          timestamp: Date.now(),
          senderName: this.userName,
          senderRole: this.userRole,
          senderId: this.userId
        }

        if (file) {
          if (file.size > 5 * 1024 * 1024) { // 5MB limit
            reject(new Error('File too large. Maximum size is 5MB.'))
            return
          }

          // Convert file to base64
          const fileData = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = reject
            reader.readAsDataURL(file)
          })
          
          messageData = {
            ...messageData,
            message: file.name,
            attachment: {
              fileName: file.name,
              fileSize: file.size,
              fileType: file.type,
              fileData: fileData
            }
          }
        }

        this.send({
          type: 'message',
          message: messageData
        })

        resolve()
      } catch (error) {
        reject(error)
      }
    })
  }

  private send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    }
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
}