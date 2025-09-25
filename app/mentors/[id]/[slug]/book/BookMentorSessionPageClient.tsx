"use client"

import { cn } from "@/lib/utils"
import { useEffect, useMemo, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { DayPicker } from "react-day-picker"
import { format } from "date-fns"
import { toZonedTime } from "date-fns-tz"
import { toast } from "sonner"
import { Loader2, Clock, ArrowRight, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import "react-day-picker/dist/style.css"
import UnifiedHeader from "@/components/UnifiedHeader"

type Props = {
  session: {
    id: number
    role: string
  }
}

interface MentorSkill {
  id: number
  skillName: string
  ratePerHour: number
}

interface MentorAvailability {
  id: number
  day: string
  startTime: string
  endTime: string
  isActive: boolean
}

interface BookedSession {
  scheduledDate: string
  durationMinutes: number
}

interface BlockedDate {
  date: string // YYYY-MM-DD format
  reason?: string
}

interface MentorData {
  mentorId: number
  fullName: string
  profilePicture: string
  timezone: string
  availability: MentorAvailability[]
  skills: MentorSkill[]
  bookedSessions: BookedSession[]
  blockedDates: BlockedDate[]
}

interface TimeSlot {
  startTime: string
  endTime: string
  available: boolean
  conflictReason?: string
}

// Helper function to convert time string to minutes since midnight
const timeToMinutes = (timeStr: string): number => {
  // Handle 12-hour format (9:00 AM, 4:00 PM)
  if (timeStr.includes("AM") || timeStr.includes("PM")) {
    const [time, period] = timeStr.split(" ")
    const [hours, minutes] = time.split(":").map(Number)
    let convertedHours = hours
    if (period === "PM" && hours !== 12) {
      convertedHours = hours + 12
    } else if (period === "AM" && hours === 12) {
      convertedHours = 0
    }
    return convertedHours * 60 + (minutes || 0)
  }
  // Handle 24-hour format (09:00, 16:00)
  const [hours, minutes] = timeStr.split(":").map(Number)
  return hours * 60 + (minutes || 0)
}

// Helper function to convert minutes since midnight to 12-hour format
const minutesToTime12Hour = (minutes: number): string => {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  const period = hours >= 12 ? "PM" : "AM"
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
  return `${displayHours}:${mins.toString().padStart(2, "0")} ${period}`
}

// Enhanced helper function to check if two time ranges overlap or are adjacent
const timeRangesConflict = (start1: number, end1: number, start2: number, end2: number): boolean => {
  // Sessions conflict if they overlap OR if one starts exactly when another ends
  // This prevents back-to-back scheduling issues
  return (start1 < end2 && start2 < end1) || start1 === end2 || end1 === start2
}

export default function BookMentorSessionPageClient({ session }: Props) {
  const router = useRouter()
  const { id } = useParams() as { id: string }

  const [mentor, setMentor] = useState<MentorData | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>()
  const [selectedSkillId, setSelectedSkillId] = useState<number | null>(null)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null)
  const [durationHours, setDurationHours] = useState(1)
  const [durationMinutes, setDurationMinutes] = useState(0)
  const [sessionNotes, setSessionNotes] = useState("")
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Enhanced data fetching with better error handling
  const fetchMentor = useCallback(async () => {
    if (session.role !== "learner") {
      toast.error("Access denied", {
        description: "Only learners can book mentoring sessions.",
        duration: 4000,
      })
      router.replace("/")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/mentors/${id}/booking-info`, {
        cache: "no-store",
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Failed to fetch mentor data' }))
        throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`)
      }
      const data = await res.json()
      if (!data || typeof data !== 'object') throw new Error('Invalid response format')
      if (!data.mentorId || !data.fullName) throw new Error('Incomplete mentor data received')
      setMentor(data)
      if (data.skills && data.skills.length > 0) setSelectedSkillId(data.skills[0].id)
    } catch (err: any) {
      setError(err.message || 'Failed to load mentor information')
    } finally {
      setLoading(false)
    }
  }, [id, router, session.role])

  useEffect(() => { fetchMentor() }, [fetchMentor])

  useEffect(() => {
    if (mentor) {
      if (mentor.skills && mentor.skills.length > 0 && !selectedSkillId) {
        setSelectedSkillId(mentor.skills[0].id)
      }
    }
  }, [mentor, selectedSkillId])

  // Create disabled dates array for DayPicker
  const disabledDates = useMemo(() => {
    const today = new Date()
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate())
    const twoMonthsLater = new Date(today.getFullYear(), today.getMonth() + 2, 1) // First day of the month after next month
    
    if (!mentor?.blockedDates) {
      return { 
        before: new Date(),
        after: twoMonthsLater
      }
    }
    
    // Convert blocked dates to Date objects
    const blockedDateObjects = mentor.blockedDates.map(blocked => new Date(blocked.date + 'T00:00:00'))
    
    return {
      before: new Date(),
      after: twoMonthsLater,
      disabled: blockedDateObjects
    }
  }, [mentor?.blockedDates])

  // Check if a date is blocked
  const isDateBlocked = useCallback((date: Date): boolean => {
    if (!mentor?.blockedDates) return false
    const dateStr = format(date, 'yyyy-MM-dd')
    return mentor.blockedDates.some(blocked => blocked.date === dateStr)
  }, [mentor?.blockedDates])

  // Enhanced helper function to check if a time slot has conflicts
  const checkSlotAvailability = useCallback((
    startMinutes: number, 
    requestedDuration: number, 
    availabilityEndMinutes: number, 
    bookedSessionsForDay: BookedSession[],
    mentorTz: string,
    selectedDateStr: string
  ): { available: boolean; conflictReason?: string } => {
    const slotEndMinutes = startMinutes + requestedDuration
    
    // Check if slot extends beyond availability window
    if (slotEndMinutes > availabilityEndMinutes) {
      return { 
        available: false, 
        conflictReason: 'Extends beyond availability window' 
      }
    }
    
    // Check for conflicts with booked sessions
    for (const bookedSession of bookedSessionsForDay) {
      const bookedStart = toZonedTime(new Date(bookedSession.scheduledDate), mentorTz)
      const bookedStartMinutes = bookedStart.getHours() * 60 + bookedStart.getMinutes()
      const bookedEndMinutes = bookedStartMinutes + bookedSession.durationMinutes
      
      // Enhanced conflict detection including edge cases
      if (timeRangesConflict(startMinutes, slotEndMinutes, bookedStartMinutes, bookedEndMinutes)) {
        const existingSessionTime = `${minutesToTime12Hour(bookedStartMinutes)} - ${minutesToTime12Hour(bookedEndMinutes)}`
        
        // Determine specific conflict type
        if (startMinutes === bookedEndMinutes) {
          return { 
            available: false, 
            conflictReason: `Cannot start when another session ends (${minutesToTime12Hour(bookedEndMinutes)})` 
          }
        } else if (slotEndMinutes === bookedStartMinutes) {
          return { 
            available: false, 
            conflictReason: `Cannot end when another session starts (${minutesToTime12Hour(bookedStartMinutes)})` 
          }
        } else {
          return { 
            available: false, 
            conflictReason: `Overlaps with existing session (${existingSessionTime})` 
          }
        }
      }
    }
    
    return { available: true }
  }, [])

  // Enhanced TIME SLOT LOGIC with detailed conflict detection
  const availableTimeSlotsForSelectedDay = useMemo(() => {
    if (!mentor || !selectedDate) return []
    
    // Check if selected date is blocked
    if (isDateBlocked(selectedDate)) {
      return []
    }
    
    const mentorTz = mentor.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
    const requestedDurationMinutes = Math.max(15, durationHours * 60 + durationMinutes) // Ensure minimum 15 minutes

    // Get "today" in mentor's timezone
    const now = toZonedTime(new Date(), mentorTz)
    const selectedDateInMentorTz = toZonedTime(selectedDate, mentorTz)
    const isToday = format(selectedDateInMentorTz, "yyyy-MM-dd") === format(now, "yyyy-MM-dd")

    const day = format(selectedDateInMentorTz, "EEEE").toLowerCase()
    const availabilitySlots = mentor.availability?.filter((slot) => slot.day === day && slot.isActive) || []

    console.log("Debug - Day:", day, "Available slots:", availabilitySlots, "Requested duration:", requestedDurationMinutes, "minutes")

    if (availabilitySlots.length === 0) return []

    const selectedDateStr = format(selectedDateInMentorTz, "yyyy-MM-dd")
    const bookedSessionsForDay = mentor.bookedSessions?.filter((session) => {
      const sessionDate = toZonedTime(new Date(session.scheduledDate), mentorTz)
      return format(sessionDate, "yyyy-MM-dd") === selectedDateStr
    }) || []

    console.log("Debug - Booked sessions for day:", bookedSessionsForDay)

    const timeSlots: TimeSlot[] = []
    const slotInterval = 30 // Generate slots every 30 minutes

    availabilitySlots.forEach((availSlot) => {
      const startMinutes = timeToMinutes(availSlot.startTime)
      const endMinutes = timeToMinutes(availSlot.endTime)
      
      console.log("Debug - Processing availability slot:", {
        startTime: availSlot.startTime,
        endTime: availSlot.endTime,
        startMinutes,
        endMinutes
      })

      if (isNaN(startMinutes) || isNaN(endMinutes)) {
        console.log("Debug - Invalid time format")
        return
      }

      for (let currentMinutes = startMinutes; currentMinutes < endMinutes; currentMinutes += slotInterval) {
        // Check if there's enough remaining time in the availability window for the requested duration
        if (currentMinutes + requestedDurationMinutes > endMinutes) {
          console.log(`Debug - Not enough time at ${minutesToTime12Hour(currentMinutes)} for ${requestedDurationMinutes}min session`)
          continue
        }

        // Build slot start time as Date in mentor's timezone
        const slotDate = new Date(selectedDateInMentorTz)
        slotDate.setHours(Math.floor(currentMinutes / 60), currentMinutes % 60, 0, 0)

        let isAvailable = true
        let conflictReason: string | undefined

        // Block if slot is in the past (mentor's timezone)
        if (isToday && slotDate < now) {
          isAvailable = false
          conflictReason = 'Time slot is in the past'
          console.log("Debug - Slot in past:", minutesToTime12Hour(currentMinutes))
        }

        // Use our comprehensive availability check
        if (isAvailable) {
          const availabilityCheck = checkSlotAvailability(
            currentMinutes,
            requestedDurationMinutes,
            endMinutes,
            bookedSessionsForDay,
            mentorTz,
            selectedDateStr
          )
          isAvailable = availabilityCheck.available
          conflictReason = availabilityCheck.conflictReason
        }

        // Calculate end time for display
        const displayEndMinutes = currentMinutes + requestedDurationMinutes

        timeSlots.push({
          startTime: minutesToTime12Hour(currentMinutes),
          endTime: minutesToTime12Hour(displayEndMinutes),
          available: isAvailable,
          conflictReason,
        })
      }
    })

    console.log("Debug - Generated time slots for", requestedDurationMinutes, "min duration:", timeSlots)
    return timeSlots
  }, [mentor, selectedDate, isDateBlocked, durationHours, durationMinutes, checkSlotAvailability])

  useEffect(() => {
    setSelectedTimeSlot(null)
  }, [selectedDate])

  const computeMaxDurationMinutes = () => {
    if (!selectedTimeSlot || !mentor || !selectedDate) return 0
    const mentorTz = mentor.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
    const day = format(toZonedTime(selectedDate, mentorTz), "EEEE").toLowerCase()
    
    const availabilitySlot = mentor.availability.find(
      (slot) =>
        slot.day === day &&
        slot.isActive &&
        timeToMinutes(slot.startTime) <= timeToMinutes(selectedTimeSlot.startTime) &&
        timeToMinutes(slot.endTime) >= timeToMinutes(selectedTimeSlot.endTime),
    )
    if (!availabilitySlot) return 0
    
    const slotStartMinutes = timeToMinutes(selectedTimeSlot.startTime)
    const availabilityEndMinutes = timeToMinutes(availabilitySlot.endTime)
    const selectedDateInMentorTz = toZonedTime(selectedDate, mentorTz)
    const selectedDateStr = format(selectedDateInMentorTz, "yyyy-MM-dd")
    
    const bookedSessionsAfter = mentor.bookedSessions
      .filter((session) => {
        const sessionDate = toZonedTime(new Date(session.scheduledDate), mentorTz)
        if (format(sessionDate, "yyyy-MM-dd") !== selectedDateStr) return false
        const sessionStartMinutes = sessionDate.getHours() * 60 + sessionDate.getMinutes()
        return sessionStartMinutes > slotStartMinutes
      })
      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
      
    if (bookedSessionsAfter.length > 0) {
      const nextBookedSession = bookedSessionsAfter[0]
      const nextSessionStart = toZonedTime(new Date(nextBookedSession.scheduledDate), mentorTz)
      const nextSessionStartMinutes = nextSessionStart.getHours() * 60 + nextSessionStart.getMinutes()
      // Subtract a small buffer to prevent adjacent bookings
      return Math.min(nextSessionStartMinutes - slotStartMinutes, availabilityEndMinutes - slotStartMinutes)
    }
    return availabilityEndMinutes - slotStartMinutes
  }

  const maxDuration = computeMaxDurationMinutes()

  const computeEstimatedCost = (minutes: number) => {
    if (!mentor || !selectedSkillId) return null
    const skill = mentor.skills.find((s) => s.id === selectedSkillId)
    if (!skill) return null
    const cost = Math.ceil((skill.ratePerHour / 60) * minutes)
    return cost
  }

  const handleDurationChange = (hours: number, minutes: number) => {
    const totalMinutes = hours * 60 + minutes
    if (totalMinutes < 15) {
      toast.warning("Session too short", {
        description: "Sessions must be at least 15 minutes long.",
        duration: 3000,
      })
      return
    }
    if (totalMinutes > maxDuration) {
      toast.error("Duration too long", {
        description: "The selected duration exceeds the available time slot.",
        duration: 3000,
      })
      return
    }
    setDurationHours(hours)
    setDurationMinutes(minutes)
    const cost = computeEstimatedCost(totalMinutes)
    setEstimatedCost(cost)
  }

  useEffect(() => {
    const totalMinutes = durationHours * 60 + durationMinutes
    const cost = computeEstimatedCost(totalMinutes)
    setEstimatedCost(cost)
  }, [selectedSkillId, durationHours, durationMinutes, mentor])

  const handleBooking = async () => {
    if (!mentor || !selectedDate || !selectedTimeSlot || !selectedSkillId) {
      toast.error("Incomplete booking information", {
        description: "Please select a date, time slot, and skill before booking.",
        duration: 4000,
      })
      return
    }
    
    // Check if date is blocked before proceeding
    if (isDateBlocked(selectedDate)) {
      toast.error("Date unavailable", {
        description: "The selected date is blocked by the mentor. Please choose another date.",
        duration: 4000,
      })
      return
    }
    
    // Check if selected time slot is still available
    if (!selectedTimeSlot.available) {
      toast.error("Selected time slot is no longer available.")
      return
    }
    
    const totalMinutes = durationHours * 60 + durationMinutes
    if (totalMinutes < 15 || totalMinutes > maxDuration) {
      toast.error("Invalid session duration.")
      return
    }
    if (!sessionNotes.trim()) {
      toast.warning("Session notes required", {
        description: "Please describe what you'd like to learn in this session.",
        duration: 4000,
      })
      return
    }
    setSubmitting(true)
    
    // Parse the 12-hour time format and convert to Date
    const mentorTz = mentor.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
    const scheduledStart = toZonedTime(selectedDate, mentorTz)
    
    // Convert 12-hour time to 24-hour for Date object
    const startMinutes = timeToMinutes(selectedTimeSlot.startTime)
    scheduledStart.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0)
    
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          learnerUserId: session.id,        
          mentorUserId: mentor.mentorId,     
          mentorSkillId: selectedSkillId,
          scheduledDate: scheduledStart.toISOString(),
          durationMinutes: totalMinutes,
          sessionNotes,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Booking failed.")
      } else {
        toast.success("Session booked successfully!", {
          description: "Your booking request has been sent to the mentor for approval.",
          duration: 4000,
        })
        router.push("/learner/sessions")
      }
    } catch (err: any) {
      toast.error("Booking failed", {
        description: "Something went wrong. Please try again or contact support if the problem persists.",
        duration: 5000,
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex justify-center items-center">
          <div className="flex flex-col items-center space-y-4 p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20">
            <div className="relative">
              <Loader2 className="animate-spin w-8 h-8 text-indigo-600" />
              <div className="absolute inset-0 w-8 h-8 border-2 border-indigo-200 rounded-full animate-pulse"></div>
            </div>
            <span className="text-slate-700 font-medium text-lg">Loading mentor information...</span>
            <div className="w-24 h-1 bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 rounded-full animate-pulse"></div>
          </div>
      </div>
    )
  }

  if (error || !mentor) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex justify-center items-center">
        <Card className="p-8 text-center max-w-md bg-white/90 backdrop-blur-sm shadow-xl border-0 rounded-2xl">
          <div className="text-red-500 mb-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-50 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-800">Unable to load mentor information</h2>
            {error && <p className="text-sm text-slate-500 mt-2">{error}</p>}
          </div>
          <div className="space-y-3">
            <Button onClick={fetchMentor} className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0 rounded-xl py-3 transition-all duration-200 hover:scale-102">
              Try Again
            </Button>
            <Button onClick={() => router.back()} variant="ghost" className="w-full text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl py-3 transition-all duration-200">
              Go Back
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  const selectedSkill = mentor.skills.find((s) => s.id === selectedSkillId)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <UnifiedHeader />

      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Session Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Date & Time Selection */}
            <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-0 rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-b border-indigo-100/50">
                <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                  Select Date & Time
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <Label className="text-sm font-semibold mb-4 text-slate-700 flex items-center gap-2">
                      <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Choose Date
                    </Label>
                    <div className="border border-indigo-100 rounded-xl p-4 bg-gradient-to-br from-white to-indigo-50/30">
                      <DayPicker
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        disabled={disabledDates}
                        className="rdp-custom"
                        modifiers={{
                          blocked: mentor?.blockedDates?.map(blocked => new Date(blocked.date + 'T00:00:00')) || []
                        }}
                        modifiersStyles={{
                          blocked: {
                            backgroundColor: '#fee2e2',
                            color: '#991b1b',
                            textDecoration: 'line-through'
                          }
                        }}
                      />
                    </div>
                    {mentor?.blockedDates && mentor.blockedDates.length > 0 && (
                      <p className="text-xs text-slate-500 mt-3 flex items-center gap-1 bg-red-50 p-2 rounded-lg">
                        <svg className="w-3 h-3 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        Red strikethrough dates are blocked by the mentor
                      </p>
                    )}
                  </div>

                  {selectedDate && (
                    <div>
                      <Label className="text-sm font-semibold mb-4 text-slate-700 flex items-center gap-2">
                        <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <div>Available Times - {format(selectedDate, "MMM d, yyyy")}</div>
                          {mentor?.timezone && (
                            <span className="text-xs text-slate-500 font-normal block mt-1">
                              Times shown in mentor's timezone: {mentor.timezone}
                            </span>
                          )}
                        </div>
                      </Label>
                      
                      {isDateBlocked(selectedDate) ? (
                        <div className="text-center py-8 bg-red-50 rounded-xl border border-red-100">
                          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                            <Clock className="w-8 h-8 text-red-500" />
                          </div>
                          <p className="font-semibold text-red-600">The mentor is not available on this date</p>
                        </div>
                      ) : availableTimeSlotsForSelectedDay.length === 0 ? (
                        <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                            <Clock className="w-8 h-8 text-slate-400" />
                          </div>
                          <p className="font-medium text-slate-500">No availability for this date</p>
                        </div>
                      ) : (
                        <div className="grid gap-3 max-h-72 overflow-y-auto custom-scrollbar pr-2">
                          {availableTimeSlotsForSelectedDay.map((slot, index) => (
                            <button
                              key={`${slot.startTime}-${index}`}
                              className={cn(
                                "p-4 rounded-xl border text-left transition-all duration-200 relative group hover:scale-102",
                                !slot.available
                                  ? "border-red-200 bg-red-50/50 text-red-400 cursor-not-allowed"
                                  : selectedTimeSlot?.startTime === slot.startTime
                                    ? "border-indigo-300 bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-800 shadow-lg"
                                    : "border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md hover:bg-gradient-to-r hover:from-indigo-50/30 hover:to-purple-50/30",
                              )}
                              onClick={() => slot.available && setSelectedTimeSlot(slot)}
                              disabled={!slot.available}
                              title={slot.conflictReason || (slot.available ? "Available" : "Unavailable")}
                            >
                              <div className="font-semibold">
                                {slot.startTime} – {slot.endTime}
                              </div>
                              {slot.available && selectedTimeSlot?.startTime === slot.startTime && (
                                <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                                  <CheckCircle className="w-4 h-4 text-white" />
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}

                      {selectedTimeSlot && selectedTimeSlot.available && !isDateBlocked(selectedDate) && (
                        <>
                          <div className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
                            <div className="flex justify-between items-center mb-3">
                              <span className="text-slate-700 font-semibold flex items-center gap-2">
                                <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Duration
                              </span>
                              <div className="flex items-center space-x-3">
                                <Select
                                  value={durationHours.toString()}
                                  onValueChange={(value) => handleDurationChange(Number(value), durationMinutes)}
                                >
                                  <SelectTrigger className="w-20 h-10 border-indigo-200 rounded-xl bg-white shadow-sm">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Array.from({ length: Math.floor(maxDuration / 60) + 1 }, (_, i) => i).map(
                                      (hour) => (
                                        <SelectItem key={hour} value={hour.toString()}>
                                          {hour}h
                                        </SelectItem>
                                      ),
                                    )}
                                  </SelectContent>
                                </Select>
                                <Select
                                  value={durationMinutes.toString()}
                                  onValueChange={(value) => handleDurationChange(durationHours, Number(value))}
                                >
                                  <SelectTrigger className="w-20 h-10 border-indigo-200 rounded-xl bg-white shadow-sm">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="0">0m</SelectItem>
                                    <SelectItem value="30">30m</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            {maxDuration > 0 && (
                              <div className="text-sm text-slate-600 bg-white p-3 rounded-lg border border-indigo-100 flex items-center gap-2">
                                <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Maximum duration for this slot: {Math.floor(maxDuration / 60)}h {maxDuration % 60}m
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Session Notes */}
            <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-0 rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-b border-purple-100/50">
                <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  Session Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="relative">
                  <Textarea
                    value={sessionNotes}
                    onChange={(e) => setSessionNotes(e.target.value)}
                    placeholder="Tell the mentor what you'd like to focus on during this session..."
                    rows={4}
                    className="resize-none border-purple-200 rounded-xl bg-gradient-to-br from-white to-purple-50/30 focus:border-purple-400 focus:ring-purple-300 transition-all duration-200"
                  />
                  <div className="absolute bottom-3 right-3 text-xs text-slate-400">
                    {sessionNotes.length}/500
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-3 flex items-center gap-1 bg-purple-50 p-2 rounded-lg">
                  <svg className="w-3 h-3 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Tell the mentor what you'd like to focus on during this session
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Booking Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <Card className="bg-white/90 backdrop-blur-sm shadow-xl border-0 rounded-2xl overflow-hidden">
                <CardContent className="p-0">
                  <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white">
                    <div className="flex items-start space-x-4">
                      <div className="relative">
                        <img
                          src={mentor.profilePicture || "/placeholder.svg?height=60&width=60"}
                          alt={mentor.fullName}
                          className="w-16 h-16 rounded-lg object-cover border-2 border-white/20"
                        />
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white"></div>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg">
                          {durationHours > 0 && `${durationHours} Hour`}
                          {durationMinutes > 0 && ` ${durationMinutes} Minute`} Session
                        </h3>
                        <p className="text-indigo-100 opacity-90">with {mentor.fullName}</p>
                        {selectedSkill && <p className="text-indigo-100 text-sm mt-1 opacity-80">Focus: {selectedSkill.skillName}</p>}
                      </div>
                    </div>
                  </div>

                  <div className="p-6">

                  {/* Skill Selection Grid */}
                  <div className="mb-6">
                    <Label className="text-sm font-bold mb-4 text-slate-700 flex items-center gap-2">
                      <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      Select Skill
                    </Label>
                    <div className="grid gap-3">
                      {mentor.skills.map((skill) => (
                        <button
                          key={skill.id}
                          className={cn(
                            "p-4 rounded-xl border text-left transition-all duration-200 relative group hover:scale-102",
                            selectedSkillId === skill.id
                              ? "border-indigo-300 bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-800 shadow-lg"
                              : "border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md hover:bg-gradient-to-r hover:from-indigo-50/30 hover:to-purple-50/30",
                          )}
                          onClick={() => setSelectedSkillId(skill.id)}
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex-1">
                              <div className="font-semibold text-sm flex items-center gap-2">
                                <div className={cn("w-2 h-2 rounded-full", selectedSkillId === skill.id ? "bg-indigo-500" : "bg-slate-300")}></div>
                                {skill.skillName}
                              </div>
                              <div className="text-xs text-slate-600 mt-1 ml-4">{skill.ratePerHour} credits/hour</div>
                            </div>
                            {selectedSkillId === skill.id && (
                              <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                                <CheckCircle className="w-4 h-4 text-white" />
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Session Details */}
                  <div className="space-y-4 mb-6">
                    {estimatedCost !== null && (
                      <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100 shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-purple-800 font-semibold flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                            </svg>
                            Estimated Cost:
                          </span>
                          <span className="text-purple-900 font-bold text-xl bg-white px-3 py-1 rounded-lg shadow-sm">{estimatedCost} credits</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Checkout Button */}
                  <Button
                    onClick={handleBooking}
                    disabled={submitting || !selectedDate || !selectedTimeSlot || !sessionNotes.trim() || (selectedDate && isDateBlocked(selectedDate))}
                    className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-102 border-0"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        Booking...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Confirm & Book Session
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>

                  {/* Terms */}
                  <div className="mt-4 text-xs text-slate-500 text-center bg-slate-50 p-3 rounded-lg">
                    By clicking "Confirm & Book Session", you agree to our{" "}
                    <a href="#" className="text-indigo-600 hover:text-indigo-800 hover:underline font-medium">
                      Terms of Service
                    </a>{" "}
                    and{" "}
                    <a href="#" className="text-indigo-600 hover:text-indigo-800 hover:underline font-medium">
                      Cancellation Policy
                    </a>
                    .
                  </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}