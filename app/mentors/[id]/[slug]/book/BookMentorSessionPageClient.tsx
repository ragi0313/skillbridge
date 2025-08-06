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

// Helper function to check if two time ranges overlap
const timeRangesOverlap = (start1: number, end1: number, start2: number, end2: number): boolean => {
  return start1 < end2 && start2 < end1
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
      toast.error("Only learners can book a session")
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
      setSelectedDate(undefined)
      setSelectedTimeSlot(null)
      if (mentor.skills && mentor.skills.length > 0 && !selectedSkillId) {
        setSelectedSkillId(mentor.skills[0].id)
      }
    }
  }, [mentor, selectedSkillId])

  // Create disabled dates array for DayPicker
  const disabledDates = useMemo(() => {
    if (!mentor?.blockedDates) return { before: new Date() }
    
    // Convert blocked dates to Date objects
    const blockedDateObjects = mentor.blockedDates.map(blocked => new Date(blocked.date + 'T00:00:00'))
    
    return {
      before: new Date(),
      disabled: blockedDateObjects
    }
  }, [mentor?.blockedDates])

  // Check if a date is blocked
  const isDateBlocked = useCallback((date: Date): boolean => {
    if (!mentor?.blockedDates) return false
    const dateStr = format(date, 'yyyy-MM-dd')
    return mentor.blockedDates.some(blocked => blocked.date === dateStr)
  }, [mentor?.blockedDates])

  // Fixed TIME SLOT LOGIC with proper AM/PM handling
  const availableTimeSlotsForSelectedDay = useMemo(() => {
    if (!mentor || !selectedDate) return []
    
    // Check if selected date is blocked
    if (isDateBlocked(selectedDate)) {
      return []
    }
    
    const mentorTz = mentor.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone

    // Get "today" in mentor's timezone
    const now = toZonedTime(new Date(), mentorTz)
    const selectedDateInMentorTz = toZonedTime(selectedDate, mentorTz)
    const isToday = format(selectedDateInMentorTz, "yyyy-MM-dd") === format(now, "yyyy-MM-dd")

    const day = format(selectedDateInMentorTz, "EEEE").toLowerCase()
    const availabilitySlots = mentor.availability?.filter((slot) => slot.day === day && slot.isActive) || []

    console.log("Debug - Day:", day, "Available slots:", availabilitySlots)

    if (availabilitySlots.length === 0) return []

    const selectedDateStr = format(selectedDateInMentorTz, "yyyy-MM-dd")
    const bookedSessionsForDay = mentor.bookedSessions?.filter((session) => {
      const sessionDate = toZonedTime(new Date(session.scheduledDate), mentorTz)
      return format(sessionDate, "yyyy-MM-dd") === selectedDateStr
    }) || []

    console.log("Debug - Booked sessions for day:", bookedSessionsForDay)

    const timeSlots: TimeSlot[] = []
    const slotInterval = 60 // 1-hour intervals

    availabilitySlots.forEach((availSlot) => {
      const startMinutes = timeToMinutes(availSlot.startTime)
      const endMinutes = timeToMinutes(availSlot.endTime)
      
      console.log("Debug - Processing slot:", {
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
        const slotEndMinutes = Math.min(currentMinutes + slotInterval, endMinutes)

        // Build slot start time as Date in mentor's timezone
        const slotDate = new Date(selectedDateInMentorTz)
        slotDate.setHours(Math.floor(currentMinutes / 60), currentMinutes % 60, 0, 0)

        let isAvailable = true

        // Block if slot is in the past (mentor's timezone)
        if (isToday && slotDate < now) {
          isAvailable = false
          console.log("Debug - Slot in past:", minutesToTime12Hour(currentMinutes))
        }

        // Block if slot overlaps with a booked session
        bookedSessionsForDay.forEach((bookedSession) => {
          const bookedStart = toZonedTime(new Date(bookedSession.scheduledDate), mentorTz)
          const bookedStartMinutes = bookedStart.getHours() * 60 + bookedStart.getMinutes()
          const bookedEndMinutes = bookedStartMinutes + bookedSession.durationMinutes
          
          if (timeRangesOverlap(currentMinutes, slotEndMinutes, bookedStartMinutes, bookedEndMinutes)) {
            isAvailable = false
            console.log("Debug - Slot conflicts with booking:", {
              slotStart: minutesToTime12Hour(currentMinutes),
              slotEnd: minutesToTime12Hour(slotEndMinutes),
              bookedStart: minutesToTime12Hour(bookedStartMinutes),
              bookedEnd: minutesToTime12Hour(bookedEndMinutes)
            })
          }
        })

        timeSlots.push({
          startTime: minutesToTime12Hour(currentMinutes),
          endTime: minutesToTime12Hour(slotEndMinutes),
          available: isAvailable,
        })
      }
    })

    console.log("Debug - Generated time slots:", timeSlots)
    return timeSlots
  }, [mentor, selectedDate, isDateBlocked])

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
    if (totalMinutes < 60) {
      toast.warning("Session must be at least 1 hour.")
      return
    }
    if (totalMinutes > maxDuration) {
      toast.error("Selected duration exceeds available time.")
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
      toast.error("Missing required booking information.")
      return
    }
    
    // Check if date is blocked before proceeding
    if (isDateBlocked(selectedDate)) {
      toast.error("Selected date is blocked and not available for booking.")
      return
    }
    
    const totalMinutes = durationHours * 60 + durationMinutes
    if (totalMinutes < 60 || totalMinutes > maxDuration) {
      toast.error("Invalid session duration.")
      return
    }
    if (!sessionNotes.trim()) {
      toast.warning("Please provide session notes.")
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
        toast.success("Session booked! Pending mentor approval.")
        router.push("/learner/sessions")
      }
    } catch (err: any) {
      toast.error("Something went wrong. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <Card className="p-8">
          <div className="flex items-center space-x-3">
            <Loader2 className="animate-spin w-6 h-6 text-teal-600" />
            <span className="text-gray-700 font-medium">Loading mentor information...</span>
          </div>
        </Card>
      </div>
    )
  }

  if (error || !mentor) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <Card className="p-8 text-center max-w-md">
          <div className="text-red-600 mb-4">
            <h2 className="text-xl font-semibold">Unable to load mentor information</h2>
            {error && <p className="text-sm text-gray-500 mt-2">{error}</p>}
          </div>
          <div className="space-y-3">
            <Button onClick={fetchMentor} variant="outline" className="w-full">
              Try Again
            </Button>
            <Button onClick={() => router.back()} variant="ghost" className="w-full">
              Go Back
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  const selectedSkill = mentor.skills.find((s) => s.id === selectedSkillId)

  return (
    <div className="min-h-screen">
      {/* Header */}
      <UnifiedHeader />

      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Session Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Date & Time Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Select Date & Time</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-sm font-medium mb-3 block">Choose Date</Label>
                    <div className="border rounded-lg p-4">
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
                      <p className="text-xs text-gray-500 mt-2">
                        Red strikethrough dates are blocked by the mentor
                      </p>
                    )}
                  </div>

                  {selectedDate && (
                    <div>
                      <Label className="text-sm font-medium mb-3 block">
                        Available Times - {format(selectedDate, "MMM d, yyyy")}
                      </Label>
                      
                      {isDateBlocked(selectedDate) ? (
                        <div className="text-center py-8 text-red-500">
                          <Clock className="w-8 h-8 mx-auto mb-2" />
                          <p className="font-medium">The mentor is not available on this date</p>
                        </div>
                      ) : availableTimeSlotsForSelectedDay.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <Clock className="w-8 h-8 mx-auto mb-2" />
                          <p>No availability for this date</p>
                        </div>
                      ) : (
                        <div className="grid gap-2 max-h-64 overflow-y-auto">
                          {availableTimeSlotsForSelectedDay.map((slot, index) => (
                            <button
                              key={`${slot.startTime}-${index}`}
                              className={cn(
                                "p-3 rounded-lg border text-left transition-all",
                                !slot.available
                                  ? "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
                                  : selectedTimeSlot?.startTime === slot.startTime
                                    ? "border-teal-600 bg-teal-50 text-teal-800"
                                    : "border-gray-200 bg-white hover:border-teal-300",
                              )}
                              onClick={() => slot.available && setSelectedTimeSlot(slot)}
                              disabled={!slot.available}
                            >
                              <div className="font-medium">
                                {slot.startTime} – {slot.endTime}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {selectedTimeSlot && !isDateBlocked(selectedDate) && (
                        <>
                          <div className="flex justify-between mt-4">
                            <span className="text-gray-600">Duration</span>
                            <div className="flex items-center space-x-2">
                              <Select
                                value={durationHours.toString()}
                                onValueChange={(value) => handleDurationChange(Number(value), durationMinutes)}
                              >
                                <SelectTrigger className="w-20 h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.from({ length: Math.max(1, Math.floor(maxDuration / 60)) }, (_, i) => i + 1).map(
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
                                <SelectTrigger className="w-20 h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="0">0m</SelectItem>
                                  <SelectItem value="30">30m</SelectItem>
                                  <SelectItem value="45">45m</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {maxDuration > 0 && (
                            <div className="mt-4 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                              Maximum duration for this slot: {Math.floor(maxDuration / 60)}h {maxDuration % 60}m
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Session Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="ml-1 text-lg font-semibold">Session Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  placeholder="Tell the mentor what you'd like to focus on during this session..."
                  rows={4}
                  className="resize-none h-30"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Tell the mentor what you'd like to focus on during this session
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Booking Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <Card>
                <CardContent className="p-6">
                  {/* Session Header */}
                  <div className="flex items-start space-x-4 mb-6">
                    <img
                      src={mentor.profilePicture || "/placeholder.svg?height=60&width=60"}
                      alt={mentor.fullName}
                      className="w-15 h-15 rounded-lg object-cover"
                    />
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {durationHours > 0 && `${durationHours} Hour`}
                        {durationMinutes > 0 && ` ${durationMinutes} Minute`} Session
                      </h3>
                      <p className="text-sm text-gray-600">Carried out by {mentor.fullName}</p>
                      {selectedSkill && <p className="text-sm text-gray-600 mt-1">Focus: {selectedSkill.skillName}</p>}
                    </div>
                  </div>

                  {/* Skill Selection Grid */}
                  <div className="mb-6">
                    <Label className="text-sm font-medium mb-3 block">Select Skill Area</Label>
                    <div className="grid gap-2">
                      {mentor.skills.map((skill) => (
                        <button
                          key={skill.id}
                          className={cn(
                            "p-3 rounded-lg border text-left transition-all",
                            selectedSkillId === skill.id
                              ? "border-teal-600 bg-teal-50 text-teal-800"
                              : "border-gray-200 bg-white hover:border-teal-300",
                          )}
                          onClick={() => setSelectedSkillId(skill.id)}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-medium text-sm">{skill.skillName}</div>
                              <div className="text-xs text-gray-600">{skill.ratePerHour} credits/hour</div>
                            </div>
                            {selectedSkillId === skill.id && <CheckCircle className="w-4 h-4 text-teal-600" />}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Session Details */}
                  <div className="space-y-4 mb-6">
                    {estimatedCost !== null && (
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-purple-800 font-medium">Estimated Cost:</span>
                          <span className="text-purple-900 font-bold text-lg">{estimatedCost} credits</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Checkout Button */}
                  <Button
                    onClick={handleBooking}
                    disabled={submitting || !selectedDate || !selectedTimeSlot || !sessionNotes.trim() || (selectedDate && isDateBlocked(selectedDate))}
                    className="w-full gradient-bg text-white py-3"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Booking...
                      </>
                    ) : (
                      <>
                        Confirm & Book Session
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>

                  {/* Terms */}
                  <div className="mt-4 text-xs text-gray-500 text-center">
                    By clicking "Confirm & Book Session", you agree to our{" "}
                    <a href="#" className="text-teal-600 hover:underline">
                      Terms of Service
                    </a>{" "}
                    and{" "}
                    <a href="#" className="text-teal-600 hover:underline">
                      Cancellation Policy
                    </a>
                    .
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