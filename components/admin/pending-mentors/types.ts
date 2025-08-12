export type AvailabilitySlot = {
  id: string
  start: string // "HH:mm"
  end: string // "HH:mm"
}

export type Availability = Record<string, AvailabilitySlot[]>

export type RawAvailability = string | Availability

export type SkillCategory = {
  id: number
  name: string
  description?: string
  createdAt: string
  updatedAt: string
}

export type SkillCategoryAssignment = {
  skillName: string
  categoryId: number
}

export type PendingMentor = {
  id: number
  firstName: string
  lastName: string
  email: string
  profilePictureUrl: string
  gender: string
  languagesSpoken: string // "English, Tagalog"
  country: string
  timezone: string
  professionalTitle: string
  bio: string
  yearsOfExperience: number
  linkedInUrl: string
  socialLinks: string // Can also be parsed into Record<string, string>
  availability: RawAvailability
  question1: string
  question2: string
  question3: string
  skills: Array<{
    skillName: string
    ratePerHour: number
  }>
  createdAt: string
}

export interface MentorApplicationCardProps {
  mentor: PendingMentor
  onApprove: (id: number, notes: string, skillCategoryAssignments?: SkillCategoryAssignment[]) => void
  onReject: (id: number, notes: string) => void
}
