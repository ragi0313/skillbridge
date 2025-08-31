import { RtcTokenBuilder, RtcRole } from "agora-token"

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

    // Validate format
    if (this.appId.length !== 32) {
      console.error(`Invalid AGORA_APP_ID format - expected 32 chars, got ${this.appId.length}`)
      throw new Error("Invalid AGORA_APP_ID format")
    }

    if (this.appCertificate.length !== 32) {
      console.error(`Invalid AGORA_APP_CERTIFICATE format - expected 32 chars, got ${this.appCertificate.length}`) 
      throw new Error("Invalid AGORA_APP_CERTIFICATE format")
    }

    console.log(`[AGORA_SERVICE] Initialized with App ID: ${this.appId.substring(0, 8)}...`)
  }

  async createRoom(sessionId: string, expirationTime?: Date): Promise<AgoraRoom> {
    // Simplified channel name to avoid issues - shorter and simpler
    const timestamp = Date.now().toString(36) // Base36 for shorter string
    const channel = `s${sessionId}_${timestamp}`
    const expiresAt = expirationTime || new Date(Date.now() + 4 * 60 * 60 * 1000) // 4 hours

    console.log(`[AGORA_SERVICE] Creating room with channel: ${channel}`)

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
    try {
      // Validate channel name
      if (!channel || channel.length === 0) {
        throw new Error("Channel name is required")
      }
      
      if (channel.length > 64) {
        throw new Error(`Channel name too long: ${channel.length} chars (max 64)`)
      }

      // Generate UID from userId
      const uid = this.generateUID(userId)
      
      if (!uid || uid < 1 || uid > 2147483647) {
        throw new Error(`Invalid UID generated: ${uid}`)
      }

      // Set expiration time (default to 4 hours)
      const currentTimestamp = Math.floor(Date.now() / 1000)
      const privilegeExpiredTs = expirationTime || (currentTimestamp + 4 * 60 * 60)
      
      // Ensure expiration is in the future
      if (privilegeExpiredTs <= currentTimestamp) {
        throw new Error(`Invalid expiration time: ${privilegeExpiredTs} <= ${currentTimestamp}`)
      }

      console.log(`[AGORA_SERVICE] Generating RTC token for:`, {
        channel,
        uid,
        role,
        originalUserId: userId,
        currentTime: new Date(currentTimestamp * 1000).toISOString(),
        expiresAt: new Date(privilegeExpiredTs * 1000).toISOString(),
        secondsUntilExpiry: privilegeExpiredTs - currentTimestamp
      })

      // Generate RTC token for video/audio only
      const rtcToken = await this.buildRTCToken(channel, uid, privilegeExpiredTs, role)

      // Validate the generated token
      if (!rtcToken || rtcToken.length < 50) {
        throw new Error(`Invalid RTC token generated: length=${rtcToken?.length || 0}`)
      }

      const isRTCTokenValid = await this.validateToken(rtcToken, channel)
      if (!isRTCTokenValid) {
        throw new Error("Generated RTC token failed validation")
      }

      console.log(`[AGORA_SERVICE] Successfully generated RTC token:`, {
        rtcTokenLength: rtcToken.length,
        rtcTokenPrefix: rtcToken.substring(0, 10) + "...",
        uid,
        channel
      })

      return {
        token: rtcToken,
        channel,
        uid,
        appId: this.appId,
      }
    } catch (error) {
      console.error("[AGORA_SERVICE] Error in generateToken:", error)
      throw new Error(`Failed to generate Agora tokens: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private generateUID(userId: string): number {
    try {
      // If userId is already numeric and valid, use it directly
      const numericUserId = parseInt(userId)
      if (!isNaN(numericUserId) && numericUserId > 0 && numericUserId < 2147483647) {
        console.log(`[AGORA_SERVICE] Using numeric userId as UID: ${numericUserId}`)
        return numericUserId
      }

      // Simple hash-based UID generation for string userIds
      let hash = 5381 // djb2 algorithm seed
      for (let i = 0; i < userId.length; i++) {
        const char = userId.charCodeAt(i)
        hash = ((hash << 5) + hash) + char // hash * 33 + char
        hash = hash & 0x7FFFFFFF // Keep positive 31-bit integer
      }
      
      // Ensure within Agora's range (1 to 2^31-1)
      // Use modulo to keep in safe range
      const uid = (hash % 2000000000) + 1000 // Range: 1000 to 2000001000
      
      console.log(`[AGORA_SERVICE] Generated UID ${uid} from userId: ${userId}`)
      return uid

    } catch (error) {
      console.error("[AGORA_SERVICE] Error generating UID:", error)
      // Fallback to random UID
      const fallbackUid = Math.floor(Math.random() * 1000000) + 1000
      console.log(`[AGORA_SERVICE] Using fallback UID: ${fallbackUid}`)
      return fallbackUid
    }
  }

  private async buildRTCToken(
    channel: string,
    uid: number,
    privilegeExpiredTs: number,
    role: "mentor" | "learner",
  ): Promise<string> {
    try {
      // Validate inputs
      if (!channel || channel.length === 0) {
        throw new Error("Channel name is required")
      }
      
      if (channel.length > 64) {
        throw new Error(`Channel name too long: ${channel.length} chars`)
      }

      if (!uid || uid < 1 || uid > 2147483647) {
        throw new Error(`Invalid UID: ${uid}. Must be between 1 and 2147483647`)
      }

      const currentTimestamp = Math.floor(Date.now() / 1000)
      if (!privilegeExpiredTs || privilegeExpiredTs <= currentTimestamp) {
        throw new Error(`Invalid expiration time: ${privilegeExpiredTs} must be > ${currentTimestamp}`)
      }

      // Both mentors and learners should be able to publish and subscribe
      const agoraRole = RtcRole.PUBLISHER

      console.log(`[AGORA_SERVICE] Building RTC token with parameters:`, {
        appId: this.appId.substring(0, 8) + "...",
        appCertLength: this.appCertificate.length,
        channel,
        uid,
        role: agoraRole === RtcRole.PUBLISHER ? "PUBLISHER" : "SUBSCRIBER",
        privilegeExpiredTs,
        userRole: role,
        secondsUntilExpiry: privilegeExpiredTs - currentTimestamp
      })

      // Build RTC token
      const token = RtcTokenBuilder.buildTokenWithUid(
        this.appId,
        this.appCertificate,
        channel,
        uid,
        agoraRole,
        privilegeExpiredTs,
        privilegeExpiredTs,
      )

      if (!token || token.length < 50) {
        throw new Error(`Generated RTC token is invalid: length=${token?.length || 0}`)
      }

      // Verify token starts with expected prefix
      if (!token.startsWith("006") && !token.startsWith("007")) {
        throw new Error(`RTC token has unexpected prefix: ${token.substring(0, 3)}`)
      }

      console.log(`[AGORA_SERVICE] Successfully built RTC token:`, {
        channel,
        uid,
        role,
        tokenLength: token.length,
        tokenPrefix: token.substring(0, 10) + "..."
      })
      
      return token

    } catch (error) {
      console.error("[AGORA_SERVICE] Error building RTC token:", error)
      if (error instanceof Error) {
        throw error
      }
      throw new Error(`RTC token generation failed: ${error}`)
    }
  }


  async validateToken(token: string, channel: string): Promise<boolean> {
    try {
      // Basic validation - check if token contains expected components
      if (!token || !channel) {
        console.log("[AGORA_SERVICE] Token validation failed: missing token or channel")
        return false
      }

      // Agora tokens should be long and start with specific prefixes
      const isValidFormat = token.length > 50 && (token.startsWith("006") || token.startsWith("007"))
      
      console.log(`[AGORA_SERVICE] Token validation result: ${isValidFormat}`, {
        tokenLength: token.length,
        tokenPrefix: token.substring(0, 3),
        channel
      })
      
      return isValidFormat

    } catch (error) {
      console.error("[AGORA_SERVICE] Error validating token:", error)
      return false
    }
  }

  async getChannelInfo(channel: string) {
    try {
      // Create proper authorization header
      const auth = Buffer.from(`${this.appId}:${this.appCertificate}`).toString("base64")
      
      const response = await fetch(`${this.baseUrl}/projects/${this.appId}/rtc/channels/${channel}`, {
        headers: {
          Authorization: `Basic ${auth}`,
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

      console.warn(`[AGORA_SERVICE] Failed to get channel info for ${channel}, status: ${response.status}`)
      
      // Fallback if API call fails
      return {
        channel,
        userCount: 0,
        isActive: true,
      }
    } catch (error) {
      console.error("[AGORA_SERVICE] Error getting channel info:", error)
      return {
        channel,
        userCount: 0,
        isActive: true,
      }
    }
  }

  async endCall(channel: string): Promise<void> {
    try {
      console.log(`[AGORA_SERVICE] Ending call for channel: ${channel}`)

      // Optional: Use Agora's RESTful API to kick all users from channel
      await this.kickAllUsersFromChannel(channel)
      
      console.log(`[AGORA_SERVICE] Successfully ended call for channel: ${channel}`)
    } catch (error) {
      console.error("[AGORA_SERVICE] Error ending call:", error)
    }
  }

  async endRoom(channel: string, reason: string = 'session_ended'): Promise<void> {
    try {
      console.log(`[AGORA_SERVICE] Ending room for channel: ${channel}, reason: ${reason}`)
      
      await this.endCall(channel)
      
    } catch (error) {
      console.error("[AGORA_SERVICE] Error ending room:", error)
      throw error
    }
  }

  private async kickAllUsersFromChannel(channel: string): Promise<void> {
    try {
      // First, get list of users in the channel
      const channelInfo = await this.getChannelInfo(channel)

      if (channelInfo.userCount > 0) {
        const auth = Buffer.from(`${this.appId}:${this.appCertificate}`).toString("base64")
        
        // Use Agora's RESTful API to remove all users from channel
        const response = await fetch(`${this.baseUrl}/projects/${this.appId}/rtc/channels/${channel}/users`, {
          method: "DELETE",
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/json",
          },
        })

        if (response.ok) {
          console.log(`[AGORA_SERVICE] Successfully cleared channel: ${channel}`)
        } else {
          console.warn(`[AGORA_SERVICE] Failed to clear channel: ${channel}, status: ${response.status}`)
        }
      }
    } catch (error) {
      console.error("[AGORA_SERVICE] Error kicking users from channel:", error)
    }
  }

  async startRecording(channel: string, uid: number): Promise<string | null> {
    try {
      const auth = Buffer.from(`${this.appId}:${this.appCertificate}`).toString("base64")
      
      const response = await fetch(`${this.baseUrl}/projects/${this.appId}/cloud_recording/resourceid`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
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

      console.warn(`[AGORA_SERVICE] Failed to start recording, status: ${response.status}`)
      return null
    } catch (error) {
      console.error("[AGORA_SERVICE] Error starting recording:", error)
      return null
    }
  }

  async stopRecording(resourceId: string, sid: string, channel: string, uid: number): Promise<boolean> {
    try {
      const auth = Buffer.from(`${this.appId}:${this.appCertificate}`).toString("base64")
      
      const response = await fetch(
        `${this.baseUrl}/projects/${this.appId}/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/mix/stop`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
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
      console.error("[AGORA_SERVICE] Error stopping recording:", error)
      return false
    }
  }

  // Generate token with specific privileges if needed
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
    // For simplicity, use the main generateToken method
    // In a more complex implementation, you could use RtcTokenBuilder.buildTokenWithUidAndPrivilege
    return this.generateToken(channel, userId, role, expirationTime)
  }

  // Test method to verify service is working
  async testConnection(): Promise<boolean> {
    try {
      const testChannel = `test_${Date.now()}`
      const testUserId = "test_user_123"
      
      console.log("[AGORA_SERVICE] Testing connection...")
      
      const tokenData = await this.generateToken(testChannel, testUserId, "learner")
      const isRTCValid = await this.validateToken(tokenData.token, tokenData.channel)
      
      console.log(`[AGORA_SERVICE] Connection test result: RTC=${isRTCValid}`)
      return isRTCValid
    } catch (error) {
      console.error("[AGORA_SERVICE] Connection test failed:", error)
      return false
    }
  }
}

export const agoraService = new AgoraService()