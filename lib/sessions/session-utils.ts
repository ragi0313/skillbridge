import { SessionStatus } from "@/types/session"

export const SESSION_STATUSES: Record<SessionStatus, string> = {
  'pending': 'Pending Approval',
  'confirmed': 'Confirmed',
  'upcoming': 'Starting Soon', 
  'ongoing': 'In Progress',
  'completed': 'Completed',
  'cancelled': 'Cancelled',
  'rejected': 'Declined',
  'both_no_show': 'Both No Show',
  'learner_no_show': 'Learner No Show',
  'mentor_no_show': 'Mentor No Show',
  'technical_issues': 'Technical Issues'
}

export const getStatusColor = (status: string | null): string => {
  if (!status) return "bg-gray-100 text-gray-800"
  
  switch (status as SessionStatus) {
    case "pending":
      return "bg-yellow-100 text-yellow-800"
    case "confirmed":
      return "bg-blue-100 text-blue-800"
    case "upcoming":
      return "bg-indigo-100 text-indigo-800"
    case "ongoing":
      return "bg-purple-100 text-purple-800"
    case "completed":
      return "bg-green-100 text-green-800"
    case "cancelled":
      return "bg-gray-100 text-gray-800"
    case "rejected":
      return "bg-red-100 text-red-800"
    case "both_no_show":
    case "learner_no_show":
    case "mentor_no_show":
      return "bg-orange-100 text-orange-800"
    case "technical_issues":
      return "bg-purple-100 text-purple-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

export const formatStatus = (status: string | null): string => {
  if (!status) return "Unknown"
  
  return SESSION_STATUSES[status as SessionStatus] || 
    status.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())
}

export const isSessionJoinable = (status: string | null): boolean => {
  if (!status) return false
  return ['confirmed', 'upcoming', 'ongoing'].includes(status)
}

export const isSessionActive = (status: string | null): boolean => {
  if (!status) return false
  return status === 'ongoing'
}

export const isSessionCompleted = (status: string | null): boolean => {
  if (!status) return false
  return ['completed', 'both_no_show', 'learner_no_show', 'mentor_no_show', 'cancelled'].includes(status)
}