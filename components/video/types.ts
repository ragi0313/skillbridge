// Video call related types and interfaces

export interface TokenResponse {
  token: string
  channel: string
  appId: string
  uid: number
  role: string
  sessionDetails?: SessionDetails
}

export interface SessionDetails {
  id: number
  scheduledDate: string
  durationMinutes: number
  status: string
  agoraCallStartedAt?: string
}

export interface CallState {
  isConnected: boolean
  isVideoEnabled: boolean
  isAudioEnabled: boolean
  isScreenSharing: boolean
  participantCount: number
  connectionQuality: "excellent" | "good" | "poor"
  callDuration: number
  isReconnecting: boolean
  connectionLost: boolean
  lastDisconnectTime: Date | null
  remoteUsers: AgoraUser[]
  // Technical issues tracking
  disconnectionCount: number
  poorQualityDuration: number
  lastPoorQualityStart: Date | null
  reconnectionFailures: number
  technicalIssuesDetected: boolean
}

export interface AgoraUser {
  uid: number
  videoTrack?: any
  audioTrack?: any
}

export interface SessionAccessData {
  sessionDetails: SessionDetails
  userRole: "learner" | "mentor"
  userName: string
  channel: string
  canJoin: boolean
  isWithinMeetingTime: boolean
  isInWaitingRoom: boolean
  timeUntilMeeting: number
  otherParticipant?: {
    name: string
  }
}

export interface VideoCallProps {
  sessionId: string
  userRole: "learner" | "mentor"
  agoraChannel?: string | null
}

export type ConnectionState = "CONNECTED" | "DISCONNECTED" | "RECONNECTING" | "CONNECTING"
export type MediaType = "video" | "audio"
export type EndType = "completed" | "technical_issues"

// Error types
export interface AgoraError extends Error {
  code?: string
  name: string
  message: string
}

export interface MediaError extends Error {
  code?: string
  name: string
  message: string
}

// Utility type for error handling
export type SafeError = {
  message: string
  name?: string
  code?: string
}

// Convert unknown error to SafeError
export const toSafeError = (error: unknown): SafeError => {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      code: (error as any).code
    }
  }
  return {
    message: String(error)
  }
}