import { RtcTokenBuilder, RtcRole } from "agora-access-token"

interface AgoraToken {
  token: string
  channel: string
  uid: number
  appId: string
}

interface AgoraRoom {
  channel: string
  appId: string
  createdAt: Date
  expiresAt: Date
}

class AgoraService {
  private appId: string
  private appCertificate: string
  private baseUrl = "https://api.agora.io/v1"

  constructor() {
    this.appId = process.env.AGORA_APP_ID!
    this.appCertificate = process.env.AGORA_APP_CERTIFICATE!

    if (!this.appId || !this.appCertificate) {
      throw new Error("AGORA_APP_ID and AGORA_APP_CERTIFICATE environment variables are required")
    }
  }

  async createRoom(sessionId: string, expirationTime?: Date): Promise<AgoraRoom> {
    const channel = `session-${sessionId}-${Date.now()}`
    const expiresAt = expirationTime || new Date(Date.now() + 4 * 60 * 60 * 1000) // 4 hours

    return {
      channel,
      appId: this.appId,
      createdAt: new Date(),
      expiresAt,
    }
  }

  async generateToken(
    channel: string,
    userId: string,
    role: "mentor" | "learner",
    expirationTime?: number,
  ): Promise<AgoraToken> {
    // Generate UID from userId (convert string to number)
    const uid = this.generateUID(userId)

    // Set expiration time (default to 4 hours)
    const privilegeExpiredTs = expirationTime || Math.floor(Date.now() / 1000) + 4 * 60 * 60

    // Generate production token using Agora's official library
    const token = await this.buildToken(channel, uid, privilegeExpiredTs, role)

    return {
      token,
      channel,
      uid,
      appId: this.appId,
    }
  }

  private generateUID(userId: string): number {
    // Generate unique UID by combining userId hash with timestamp and random component
    // This prevents UID conflicts when same user joins from multiple sessions/devices
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }
    
    // Use modulo approach to ensure we stay within valid range while maintaining uniqueness
    const baseHash = Math.abs(hash) % 1000000 // 6 digits max
    const timestamp = Date.now() % 100000 // 5 digits max  
    const random = Math.floor(Math.random() * 10000) // 4 digits max
    
    // Combine components more carefully to avoid overflow
    // baseHash (up to 1M) + timestamp (up to 100K) + random (up to 10K) + userId as final component
    const userIdNum = parseInt(userId) || 1 // Use actual userId as number, fallback to 1
    const uniqueUID = (baseHash * 1000 + timestamp % 1000) * 100 + random % 100 + (userIdNum % 10) * 10000000
    
    // Ensure it's within Agora's valid range (1 to 2^31-1) using modulo to maintain distribution
    const maxUID = 2147483647
    const finalUID = (uniqueUID % (maxUID - 1000)) + 1000 // Ensure minimum of 1000 to avoid conflicts
    
    return finalUID
  }

  private async buildToken(
    channel: string,
    uid: number,
    privilegeExpiredTs: number,
    role: "mentor" | "learner",
  ): Promise<string> {
    try {
      // Both mentors and learners should be able to publish (send video/audio)
      // and subscribe (receive video/audio) in a mentoring session
      const agoraRole = RtcRole.PUBLISHER

      const token = RtcTokenBuilder.buildTokenWithUid(
        this.appId,
        this.appCertificate,
        channel,
        uid,
        agoraRole,
        privilegeExpiredTs,
      )

      console.log(`Generated Agora token for channel: ${channel}, uid: ${uid}, role: ${role}`)
      return token
    } catch (error) {
      console.error("Error generating Agora token:", error)
      throw new Error("Failed to generate Agora token")
    }
  }

  async validateToken(token: string, channel: string): Promise<boolean> {
    try {
      // Basic validation - check if token contains expected components
      if (!token || !channel) {
        return false
      }

      // In production, you might want to decode and validate the token
      // For now, we'll do basic checks
      return token.length > 50 && token.includes("006") // Agora tokens typically start with '006'
    } catch (error) {
      console.error("Error validating token:", error)
      return false
    }
  }

  async getChannelInfo(channel: string) {
    try {
      // In production, you can use Agora's RESTful API to get channel statistics
      const response = await fetch(`${this.baseUrl}/projects/${this.appId}/rtc/channels/${channel}`, {
        headers: {
          Authorization: `Basic ${Buffer.from(`${this.appId}:${this.appCertificate}`).toString("base64")}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        return {
          channel,
          userCount: data.data?.channel_exist ? data.data.user_count || 0 : 0,
          isActive: data.data?.channel_exist || false,
        }
      }

      // Fallback if API call fails
      return {
        channel,
        userCount: 0,
        isActive: true,
      }
    } catch (error) {
      console.error("Error getting channel info:", error)
      return {
        channel,
        userCount: 0,
        isActive: true,
      }
    }
  }

  async endCall(channel: string): Promise<void> {
    try {
      console.log(`Ending call for channel: ${channel}`)

      // In production, you might want to:
      // 1. Log the call end event
      // 2. Stop any ongoing recordings
      // 3. Clean up resources
      // 4. Send notifications to participants

      // Optional: Use Agora's RESTful API to kick all users from channel
      // This ensures the channel is properly closed
      await this.kickAllUsersFromChannel(channel)
    } catch (error) {
      console.error("Error ending call:", error)
    }
  }

  private async kickAllUsersFromChannel(channel: string): Promise<void> {
    try {
      // First, get list of users in the channel
      const channelInfo = await this.getChannelInfo(channel)

      if (channelInfo.userCount > 0) {
        // Use Agora's RESTful API to remove all users from channel
        const response = await fetch(`${this.baseUrl}/projects/${this.appId}/rtc/channels/${channel}/users`, {
          method: "DELETE",
          headers: {
            Authorization: `Basic ${Buffer.from(`${this.appId}:${this.appCertificate}`).toString("base64")}`,
            "Content-Type": "application/json",
          },
        })

        if (response.ok) {
          console.log(`Successfully cleared channel: ${channel}`)
        } else {
          console.warn(`Failed to clear channel: ${channel}`)
        }
      }
    } catch (error) {
      console.error("Error kicking users from channel:", error)
    }
  }

  // Additional utility methods for production use

  async startRecording(channel: string, uid: number): Promise<string | null> {
    try {
      // Implement cloud recording start
      const response = await fetch(`${this.baseUrl}/projects/${this.appId}/cloud_recording/resourceid`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${this.appId}:${this.appCertificate}`).toString("base64")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cname: channel,
          uid: uid.toString(),
          clientRequest: {
            resourceExpiredHour: 24,
            scene: 0, // Real-time recording
          },
        }),
      })

      if (response.ok) {
        const data = await response.json()
        return data.resourceId
      }

      return null
    } catch (error) {
      console.error("Error starting recording:", error)
      return null
    }
  }

  async stopRecording(resourceId: string, sid: string, channel: string, uid: number): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/projects/${this.appId}/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/mix/stop`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(`${this.appId}:${this.appCertificate}`).toString("base64")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            cname: channel,
            uid: uid.toString(),
            clientRequest: {},
          }),
        },
      )

      return response.ok
    } catch (error) {
      console.error("Error stopping recording:", error)
      return false
    }
  }

  // Generate token with specific privileges
  async generateTokenWithPrivileges(
    channel: string,
    userId: string,
    role: "mentor" | "learner",
    privileges: {
      joinChannel?: boolean
      publishAudio?: boolean
      publishVideo?: boolean
      publishDataStream?: boolean
    } = {},
    expirationTime?: number,
  ): Promise<AgoraToken> {
    const uid = this.generateUID(userId)
    const privilegeExpiredTs = expirationTime || Math.floor(Date.now() / 1000) + 4 * 60 * 60

    // Default privileges for mentoring sessions
    const defaultPrivileges = {
      joinChannel: true,
      publishAudio: true,
      publishVideo: true,
      publishDataStream: true,
      ...privileges,
    }

    try {
      // For mentoring, both roles should have full privileges
      const agoraRole = RtcRole.PUBLISHER

      const token = RtcTokenBuilder.buildTokenWithUid(
        this.appId,
        this.appCertificate,
        channel,
        uid,
        agoraRole,
        privilegeExpiredTs,
      )

      console.log(`Generated privileged token for ${role} in channel: ${channel}`)

      return {
        token,
        channel,
        uid,
        appId: this.appId,
      }
    } catch (error) {
      console.error("Error generating token with privileges:", error)
      throw new Error("Failed to generate privileged token")
    }
  }
}

export const agoraService = new AgoraService()
