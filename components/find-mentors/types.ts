export interface Mentor {
  id: string
  name: string
  title: string
  avatar: string | null
  rating: number
  reviewCount: number
  hourlyRate: number
  experience: number
  skills: string[]
  languages: string[]
  country: string
  bio: string
  isAvailable: boolean
  credits: number
}
