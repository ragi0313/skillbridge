export interface SessionDetails {
  id: number
  status: string
  scheduledDate: string
  startTime: string | null
  endTime: string | null
  durationMinutes: number
  agoraCallStartedAt: string | null
}

export interface SessionAccessData {
  success: boolean
  sessionDetails: SessionDetails
  userRole: 'mentor' | 'learner'
  canJoin: boolean
  isWithinMeetingTime: boolean
  channel: string
  userName?: string
}

export interface SessionState {
  id: number
  status: string
  startTime: Date
  endTime: Date
  learnerJoined: boolean
  mentorJoined: boolean
  isActive: boolean
  timeRemaining: number
}

export interface SessionUpdateData {
  type: string
  sessionId: number
  updateType?: string
  message?: string
  reason?: string
  userRole?: string
  newStatus?: string
  timestamp: string
}

export type SessionStatus = 
  | 'pending'
  | 'confirmed' 
  | 'upcoming'
  | 'ongoing'
  | 'completed'
  | 'cancelled'
  | 'rejected'
  | 'both_no_show'
  | 'learner_no_show'
  | 'mentor_no_show'
  | 'mentor_no_response'
  | 'technical_issues'

export type SessionEndType = 'completed' | 'technical_issues' | 'cancelled'

export interface AgoraTokenData {
  token: string
  channel: string
  uid: string
  role: 'mentor' | 'learner'
  sessionDetails: SessionDetails
}