"use client"

import { cn } from "@/lib/utils"
import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { DayPicker } from "react-day-picker"
import { format } from "date-fns"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import "react-day-picker/dist/style.css"

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

interface MentorData {
  mentorId: number
  fullName: string
  profilePicture: string
  timezone: string
  availability: MentorAvailability[]
  skills: MentorSkill[]
  bookedSessions: BookedSession[]
}

interface TimeSlot {
  startTime: string
  endTime: string
  available: boolean
}

const dayNameFromDate = (date: Date) =>
  format(date, "EEEE").toLowerCase()

// Helper function to convert time string to minutes since midnight
const timeToMinutes = (timeStr: string): number => {
  console.log(`Converting time: "${timeStr}"`)
  
  // Handle 12-hour format (9:00 AM, 4:00 PM)
  if (timeStr.includes('AM') || timeStr.includes('PM')) {
    const [time, period] = timeStr.split(' ')
    const [hours, minutes] = time.split(':').map(Number)
    
    let convertedHours = hours
    if (period === 'PM' && hours !== 12) {
      convertedHours = hours + 12
    } else if (period === 'AM' && hours === 12) {
      convertedHours = 0
    }
    
    const result = convertedHours * 60 + (minutes || 0)
    console.log(`12-hour format: ${timeStr} -> ${result} minutes`)
    return result
  }
  
  // Handle 24-hour format (09:00, 16:00)
  const [hours, minutes] = timeStr.split(':').map(Number)
  const result = hours * 60 + (minutes || 0)
  console.log(`24-hour format: ${timeStr} -> ${result} minutes`)
  return result
}

// Helper function to convert minutes since midnight to time string
const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}
// Helper function to check if two time ranges overlap
const timeRangesOverlap = (
  start1: number, end1: number,
  start2: number, end2: number
): boolean => {
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

  useEffect(() => {
    if (session.role !== "learner") {
      toast.error("Only learners can book a session")
      router.replace("/")
      return
    }

    const fetchMentor = async () => {
      try {
        const res = await fetch(`/api/mentors/${id}/booking-info`, {
          cache: "no-store",
        })
        if (!res.ok) throw new Error("Failed to fetch mentor data")
        const data = await res.json()
        setMentor(data)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchMentor()
  }, [id, router, session.role])


const availableTimeSlotsForSelectedDay = useMemo(() => {
  console.log("=== AVAILABILITY CALCULATION DEBUG ===")
  console.log("Mentor exists:", !!mentor)
  console.log("Selected date:", selectedDate)
  
  if (!mentor || !selectedDate) {
    console.log("Missing mentor or selected date")
    return []
  }
  
  const day = format(selectedDate, "EEEE").toLowerCase() // "wednesday"
  
  console.log("Calculated day name:", day)
  console.log("Available days from mentor:", mentor.availability?.map(a => ({ day: a.day, start: a.startTime, end: a.endTime })))
  
  const availabilitySlots = mentor.availability?.filter(
    (slot) => {
      console.log(`Comparing "${slot.day}" === "${day}":`, slot.day === day)
      console.log("Slot isActive:", slot.isActive)
      return slot.day === day && slot.isActive
    }
  ) || []

  console.log("Matching availability slots:", availabilitySlots)

  if (availabilitySlots.length === 0) {
    console.log("No availability slots found for", day)
    return []
  }

  const selectedDateStr = selectedDate.toISOString().split('T')[0]
  console.log("Selected date string:", selectedDateStr)
  
  const bookedSessionsForDay = mentor.bookedSessions?.filter(session => {
    const sessionDate = new Date(session.scheduledDate)
    const sessionDateStr = sessionDate.toISOString().split('T')[0]
    const matches = sessionDateStr === selectedDateStr
    console.log(`Session date ${sessionDateStr} matches ${selectedDateStr}:`, matches)
    return matches
  }) || []

  console.log("Booked sessions for day:", bookedSessionsForDay)

  const timeSlots: TimeSlot[] = []
  const slotInterval = 60 // 1-hour intervals

  availabilitySlots.forEach((availSlot, index) => {
    console.log(`Processing availability slot ${index}:`, availSlot)
    
    const startMinutes = timeToMinutes(availSlot.startTime)
    const endMinutes = timeToMinutes(availSlot.endTime)

    console.log(`Slot ${index}: ${availSlot.startTime} (${startMinutes}min) - ${availSlot.endTime} (${endMinutes}min)`)

    // Validate the time conversion
    if (isNaN(startMinutes) || isNaN(endMinutes)) {
      console.error("Invalid time conversion:", availSlot.startTime, availSlot.endTime)
      return
    }

    // Generate hourly slots within this availability window
    for (let currentMinutes = startMinutes; currentMinutes < endMinutes; currentMinutes += slotInterval) {
      const slotEndMinutes = Math.min(currentMinutes + slotInterval, endMinutes)
      
      console.log(`Generating slot: ${minutesToTime(currentMinutes)} - ${minutesToTime(slotEndMinutes)}`)
      
      // Check if this slot conflicts with any booked session
      let isAvailable = true
      
      bookedSessionsForDay.forEach(bookedSession => {
        const bookedStart = new Date(bookedSession.scheduledDate)
        const bookedStartMinutes = bookedStart.getHours() * 60 + bookedStart.getMinutes()
        const bookedEndMinutes = bookedStartMinutes + bookedSession.durationMinutes

        if (timeRangesOverlap(currentMinutes, slotEndMinutes, bookedStartMinutes, bookedEndMinutes)) {
          isAvailable = false
          console.log(`Slot ${minutesToTime(currentMinutes)}-${minutesToTime(slotEndMinutes)} conflicts with booking`)
        }
      })

      const slot = {
        startTime: minutesToTime(currentMinutes),
        endTime: minutesToTime(slotEndMinutes),
        available: isAvailable
      }
      
      console.log("Created slot:", slot)
      timeSlots.push(slot)
    }
  })

  console.log("Final time slots:", timeSlots)
  return timeSlots
}, [mentor, selectedDate])

  const computeMaxDurationMinutes = () => {
    if (!selectedTimeSlot || !mentor || !selectedDate) return 0
    
    const day = dayNameFromDate(selectedDate)
    const availabilitySlot = mentor.availability.find(
      (slot) => slot.day === day && slot.isActive &&
      timeToMinutes(slot.startTime) <= timeToMinutes(selectedTimeSlot.startTime) &&
      timeToMinutes(slot.endTime) >= timeToMinutes(selectedTimeSlot.endTime)
    )
    
    if (!availabilitySlot) return 0

    const slotStartMinutes = timeToMinutes(selectedTimeSlot.startTime)
    const availabilityEndMinutes = timeToMinutes(availabilitySlot.endTime)
    
    const selectedDateStr = selectedDate.toISOString().split('T')[0]
    const bookedSessionsAfter = mentor.bookedSessions
      .filter(session => {
        const sessionDate = new Date(session.scheduledDate).toISOString().split('T')[0]
        if (sessionDate !== selectedDateStr) return false
        
        const sessionStart = new Date(session.scheduledDate)
        const sessionStartMinutes = sessionStart.getHours() * 60 + sessionStart.getMinutes()
        return sessionStartMinutes > slotStartMinutes
      })
      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())

    if (bookedSessionsAfter.length > 0) {
      const nextBookedSession = bookedSessionsAfter[0]
      const nextSessionStart = new Date(nextBookedSession.scheduledDate)
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

  const handleBooking = async () => {
    if (!mentor || !selectedDate || !selectedTimeSlot || !selectedSkillId) {
      toast.error("Missing required booking information.")
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

    const [startH, startM] = selectedTimeSlot.startTime.split(":").map(Number)
    const scheduledStart = new Date(selectedDate)
    scheduledStart.setHours(startH, startM, 0, 0)

    try {
      const res = await fetch("/api/book-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          learnerId: session.id,
          mentorId: mentor.mentorId,
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
        router.push("/dashboard/learner/sessions")
      }
    } catch (err) {
      toast.error("Something went wrong.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="animate-spin w-6 h-6 text-purple-600" />
        <span className="ml-2 text-gray-600">Loading mentor info...</span>
      </div>
    )
  }

  if (error || !mentor) {
    return (
      <div className="text-center py-20 text-red-600">
        Unable to load mentor info.
        {error && <p className="text-sm text-gray-500 mt-2">{error}</p>}
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 space-y-6">
      <h1 className="text-2xl font-semibold">Book a session with {mentor.fullName}</h1>

      <div>
        <h2 className="font-medium mb-2">Choose a Date</h2>
        <DayPicker
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          disabled={{ before: new Date() }}
        />
      </div>

      <div>
        <h2 className="font-medium mb-2">Select Skill</h2>
        <select
          className="w-full border rounded px-3 py-2"
          value={selectedSkillId ?? ""}
          onChange={(e) => setSelectedSkillId(Number(e.target.value))}
        >
          <option value="" disabled>Select a skill</option>
          {mentor.skills.map((skill) => (
            <option key={skill.id} value={skill.id}>
              {skill.skillName} - {skill.ratePerHour} credits/hour
            </option>
          ))}
        </select>
      </div>

      {selectedDate && (
        <div>
          <h2 className="font-medium mb-2">Available Time Slots on {format(selectedDate, "PPP")}</h2>
          {availableTimeSlotsForSelectedDay.length === 0 ? (
            <p className="text-gray-500">No availability for this date.</p>
          ) : (
            <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
              {availableTimeSlotsForSelectedDay.map((slot, index) => (
                <button
                  key={`${slot.startTime}-${index}`}
                  className={`border px-4 py-2 rounded text-sm ${
                    !slot.available
                      ? "border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed"
                      : selectedTimeSlot?.startTime === slot.startTime
                      ? "border-purple-600 bg-purple-100 text-purple-800"
                      : "hover:bg-gray-50 border-gray-300"
                  }`}
                  onClick={() => slot.available && setSelectedTimeSlot(slot)}
                  disabled={!slot.available}
                >
                  {slot.startTime} – {slot.endTime}
                  {!slot.available && <span className="block text-xs">Booked</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedTimeSlot && selectedTimeSlot.available && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-medium mb-1">Duration (Hours)</label>
              <input
                type="number"
                min={1}
                max={Math.floor(maxDuration / 60)}
                value={durationHours}
                onChange={(e) =>
                  handleDurationChange(Number(e.target.value), durationMinutes)
                }
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Duration (Minutes)</label>
              <select
                className="w-full border rounded px-3 py-2"
                value={durationMinutes}
                onChange={(e) =>
                  handleDurationChange(durationHours, Number(e.target.value))
                }
              >
                {[0, 30, 45].map((min) => (
                  <option key={min} value={min}>
                    {min} min
                  </option>
                ))}
              </select>
            </div>
          </div>

          {maxDuration > 0 && (
            <div className="text-sm text-gray-600">
              Maximum duration for this slot: {Math.floor(maxDuration / 60)}h {maxDuration % 60}m
            </div>
          )}

          {estimatedCost !== null && (
            <div className="mt-3 text-sm text-purple-700 font-medium">
              Estimated Cost: <span className="font-bold">{estimatedCost} credits</span>
            </div>
          )}

          <div className="mt-4">
            <label className="block font-medium mb-1">Session Notes</label>
            <textarea
              className="w-full border rounded px-3 py-2"
              rows={4}
              required
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              placeholder="e.g. I'd like help understanding React hooks and how to optimize rendering."
            />
          </div>

          <button
            onClick={handleBooking}
            disabled={submitting}
            className="mt-6 bg-purple-600 text-white px-6 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
          >
            {submitting ? "Booking..." : "Confirm & Book Session"}
          </button>
        </>
      )}
    </div>
  )
}