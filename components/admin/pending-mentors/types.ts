export type AvailabilitySlot = { id: string; start: string; end: string }
export type Availability = Record<string, AvailabilitySlot[]>

export type PendingMentor = {
  id: number
  firstName: string
  lastName: string
  email: string
  profilePictureUrl: string
  country: string
  timezone: string
  professionalTitle: string
  bio: string
  yearsOfExperience: number
  linkedInUrl: string
  socialLinks: string
  availability: string | Availability
  question1: string
  question2: string
  question3: string
  skills: Array<{ skillName: string; ratePerHour: number }>
  createdAt: string
}
