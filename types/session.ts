// Session management types
export interface SessionData {
  id: number
  status: string | null
  scheduledDate: Date
  startTime?: Date | null
  endTime?: Date | null
  durationMinutes: number
  totalCostCredits: number
  sessionNotes: string
  refundAmount?: number | null
  cancelledBy?: string | null
  cancellationReason?: string | null
  mentorResponseAt?: Date | null
  mentorResponseMessage?: string | null
  rejectionReason?: string | null
  createdAt: Date | null
  expiresAt?: Date | null
  
  // Make all user-related fields optional to handle null cases
  mentor?: {
    id: number
    profilePictureUrl?: string | null
    professionalTitle: string
  } | null
  mentorUser?: {
    firstName: string
    lastName: string
  } | null
  learner?: {
    id: number
    profilePictureUrl?: string | null
    experienceLevel: string
  } | null
  learnerUser?: {
    firstName: string
    lastName: string
  } | null
  skill?: {
    skillName: string
    ratePerHour: number
  } | null

  // Agora fields
  agoraChannelName?: string | null
  agoraCallStartedAt?: Date | null
  agoraCallEndedAt?: Date | null

  // Participation tracking
  learnerJoinedAt?: Date | null
  mentorJoinedAt?: Date | null
  learnerLeftAt?: Date | null
  mentorLeftAt?: Date | null
}

export interface SessionAccessData {
  sessionDetails: {
    scheduledDate: string
    startTime: string
    endTime: string
    durationMinutes: number
    status: string
    agoraCallStartedAt?: string
  }
  userRole: 'mentor' | 'learner'
  userName: string
  channel: string
  canJoin: boolean
  isWithinMeetingTime: boolean
  isInWaitingRoom: boolean
  timeUntilMeeting?: number
}

export interface SessionUpdateData {
  type: 'session_update' | 'force_disconnect' | 'session_terminated' | 'participant_joined' | 'participant_left'
  sessionId: number
  updateType?: 'status_change' | 'participant_change'
  newStatus?: string
  previousStatus?: string
  message?: string
  session?: {
    id: number
    status: string
    scheduledDate: string
    createdAt?: string
    mentorResponseAt?: string
    expiresAt?: string
    mentorUser?: {
      firstName: string
      lastName: string
    }
    learnerUser?: {
      firstName: string
      lastName: string
    }
  }
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
  | 'technical_issues'

export type SessionEndType =
  | 'completed'
  | 'technical_issues'
  | 'learner_no_show'
  | 'mentor_no_show'
  | 'both_no_show'