// Video room service for creating and managing video sessions
// This is a mock implementation - replace with your preferred video provider (Daily, Twilio, LiveKit, etc.)

export interface VideoRoomConfig {
  sessionId: number
  mentorId: number
  learnerId: number
  scheduledDate: Date
  durationMinutes: number
}

export interface VideoRoom {
  externalRoomId: string // External provider's room identifier (Daily.co room name, etc.)
  roomUrl: string
  joinUrl: string
  expiresAt: Date
}

export class VideoRoomService {
  private static instance: VideoRoomService
  private baseUrl = process.env.VIDEO_PROVIDER_BASE_URL || "https://api.daily.co/v1"
  private apiKey = process.env.VIDEO_PROVIDER_API_KEY || "mock-api-key"

  static getInstance(): VideoRoomService {
    if (!VideoRoomService.instance) {
      VideoRoomService.instance = new VideoRoomService()
    }
    return VideoRoomService.instance
  }

  async createRoom(config: VideoRoomConfig): Promise<VideoRoom> {
    try {
      // Calculate room expiration (session duration + 30 minutes buffer)
      const expiresAt = new Date(config.scheduledDate.getTime() + (config.durationMinutes + 30) * 60 * 1000)

      // Mock implementation - replace with actual video provider API call
      if (this.apiKey === "mock-api-key") {
        return this.createMockRoom(config, expiresAt)
      }

      // Example Daily.co API call (uncomment and modify for real implementation)
      /*
      const response = await fetch(`${this.baseUrl}/rooms`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `session-${config.sessionId}`,
          privacy: 'private',
          properties: {
            max_participants: 2,
            enable_screenshare: true,
            enable_chat: true,
            start_video_off: false,
            start_audio_off: false,
            exp: Math.floor(expiresAt.getTime() / 1000),
          },
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to create video room: ${response.statusText}`)
      }

      const roomData = await response.json()
      
      return {
        externalRoomId: roomData.name,
        roomUrl: roomData.url,
        joinUrl: roomData.url,
        expiresAt,
      }
      */

      return this.createMockRoom(config, expiresAt)
    } catch (error) {
      console.error('Error creating video room:', error)
      throw new Error('Failed to create video room')
    }
  }

  private createMockRoom(config: VideoRoomConfig, expiresAt: Date): VideoRoom {
    const externalRoomId = `session-${config.sessionId}-${Date.now()}`
    const roomUrl = `https://skillbridge.daily.co/${externalRoomId}`
    
    return {
      externalRoomId,
      roomUrl,
      joinUrl: roomUrl,
      expiresAt,
    }
  }

  async generateJoinToken(externalRoomId: string, userId: number, role: 'mentor' | 'learner'): Promise<string> {
    try {
      // Mock implementation - replace with actual video provider token generation
      if (this.apiKey === "mock-api-key") {
        return `mock-token-${externalRoomId}-${userId}-${role}-${Date.now()}`
      }

      // Example Daily.co token generation (uncomment and modify for real implementation)
      /*
      const response = await fetch(`${this.baseUrl}/meeting-tokens`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          properties: {
            room_name: externalRoomId,
            user_name: role,
            is_owner: role === 'mentor',
            exp: Math.floor(Date.now() / 1000) + (60 * 60 * 2), // 2 hours
          },
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to generate join token: ${response.statusText}`)
      }

      const tokenData = await response.json()
      return tokenData.token
      */

      return `mock-token-${externalRoomId}-${userId}-${role}-${Date.now()}`
    } catch (error) {
      console.error('Error generating join token:', error)
      throw new Error('Failed to generate join token')
    }
  }

  async deleteRoom(externalRoomId: string): Promise<void> {
    try {
      // Mock implementation - replace with actual video provider API call
      if (this.apiKey === "mock-api-key") {
        console.log(`Mock: Deleting room ${externalRoomId}`)
        return
      }

      // Example Daily.co room deletion (uncomment and modify for real implementation)
      /*
      const response = await fetch(`${this.baseUrl}/rooms/${externalRoomId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to delete video room: ${response.statusText}`)
      }
      */
    } catch (error) {
      console.error('Error deleting video room:', error)
      // Don't throw error for room deletion failures
    }
  }

  isJoinTimeValid(scheduledDate: Date, durationMinutes: number): boolean {
    const sessionEndTime = new Date(scheduledDate.getTime() + durationMinutes * 60 * 1000)
    const now = new Date()
    
    // Allow joining 10 minutes before session start
    const joinStartTime = new Date(scheduledDate.getTime() - 10 * 60 * 1000)
    
    // Allow joining up to 10 minutes after session end
    const joinEndTime = new Date(sessionEndTime.getTime() + 10 * 60 * 1000)
    
    return now >= joinStartTime && now <= joinEndTime
  }
}
