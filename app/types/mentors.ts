export type MentorAvailabilityItem = {
  id?: number 
  day: string
  startTime: string
  endTime: string
  isActive?: boolean
}

export type MentorBlockedDateItem = {
  id?: number 
  blockedDate: Date 
  reason?: string
}
