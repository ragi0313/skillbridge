"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, X, Clock, AlertTriangle } from "lucide-react"

const DAYS_OF_WEEK = [
  { id: "monday", name: "Monday" },
  { id: "tuesday", name: "Tuesday" },
  { id: "wednesday", name: "Wednesday" },
  { id: "thursday", name: "Thursday" },
  { id: "friday", name: "Friday" },
  { id: "saturday", name: "Saturday" },
  { id: "sunday", name: "Sunday" },
]

const TIME_OPTIONS = [
  "6:00 AM",
  "6:30 AM",
  "7:00 AM",
  "7:30 AM",
  "8:00 AM",
  "8:30 AM",
  "9:00 AM",
  "9:30 AM",
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "12:00 PM",
  "12:30 PM",
  "1:00 PM",
  "1:30 PM",
  "2:00 PM",
  "2:30 PM",
  "3:00 PM",
  "3:30 PM",
  "4:00 PM",
  "4:30 PM",
  "5:00 PM",
  "5:30 PM",
  "6:00 PM",
  "6:30 PM",
  "7:00 PM",
  "7:30 PM",
  "8:00 PM",
  "8:30 PM",
  "9:00 PM",
  "9:30 PM",
  "10:00 PM",
  "10:30 PM",
  "11:00 PM",
  "11:30 PM",
]

const QUICK_PRESETS = [
  { label: "Morning", start: "9:00 AM", end: "12:00 PM" },
  { label: "Afternoon", start: "1:00 PM", end: "5:00 PM" },
  { label: "Evening", start: "6:00 PM", end: "9:00 PM" },
  { label: "Business Hours", start: "9:00 AM", end: "5:00 PM" },
]

type TimeSlot = {
  id: string
  start: string
  end: string
}

type WeeklyAvailability = {
  [key: string]: TimeSlot[]
}

type ValidationError = {
  type: "overlap" | "duration" | "order" | "duplicate"
  message: string
}

type Props = {
  availability: WeeklyAvailability
  onChange: (availability: WeeklyAvailability) => void
}

export default function WeeklyAvailabilitySelector({ availability, onChange }: Props) {
  const [activeDay, setActiveDay] = useState<string>("")
  const [newSlots, setNewSlots] = useState<{ [key: string]: { start: string; end: string } }>({})
  const [errors, setErrors] = useState<{ [key: string]: ValidationError | null }>({})

  // Validation Functions
  const timeToMinutes = (time: string): number => {
    const [timePart, period] = time.split(" ")
    const [hours, minutes] = timePart.split(":").map(Number)
    let totalMinutes = hours * 60 + minutes
    if (period === "PM" && hours !== 12) totalMinutes += 12 * 60
    if (period === "AM" && hours === 12) totalMinutes -= 12 * 60
    return totalMinutes
  }

  const validateTimeSlot = (start: string, end: string, dayId: string): ValidationError | null => {
    const startMinutes = timeToMinutes(start)
    const endMinutes = timeToMinutes(end)

    if (endMinutes <= startMinutes) {
      return { type: "order", message: "End time must be after start time" }
    }

    if (endMinutes - startMinutes < 30) {
      return { type: "duration", message: "Minimum 30 minutes required" }
    }

    if (endMinutes - startMinutes > 480) {
      return { type: "duration", message: "Maximum 8 hours allowed" }
    }

    const existingSlots = availability[dayId] || []
    for (const slot of existingSlots) {
      const slotStart = timeToMinutes(slot.start)
      const slotEnd = timeToMinutes(slot.end)

      if (
        (startMinutes >= slotStart && startMinutes < slotEnd) ||
        (endMinutes > slotStart && endMinutes <= slotEnd) ||
        (startMinutes <= slotStart && endMinutes >= slotEnd)
      ) {
        return { type: "overlap", message: `Overlaps with ${slot.start} - ${slot.end}` }
      }
    }

    for (const slot of existingSlots) {
      if (slot.start === start && slot.end === end) {
        return { type: "duplicate", message: "This time slot already exists" }
      }
    }

    return null
  }

  const handlePresetSelect = (dayId: string, preset: (typeof QUICK_PRESETS)[0]) => {
    setNewSlots((prev) => ({
      ...prev,
      [dayId]: { start: preset.start, end: preset.end },
    }))
    setErrors((prev) => ({ ...prev, [dayId]: null }))
  }

  const handleTimeChange = (dayId: string, field: "start" | "end", value: string) => {
    setNewSlots((prev) => ({
      ...prev,
      [dayId]: { ...prev[dayId], [field]: value },
    }))
    setErrors((prev) => ({ ...prev, [dayId]: null }))
  }

  const addTimeSlot = (dayId: string) => {
    const slot = newSlots[dayId]
    if (!slot?.start || !slot?.end) return

    const error = validateTimeSlot(slot.start, slot.end, dayId)
    if (error) {
      setErrors((prev) => ({ ...prev, [dayId]: error }))
      return
    }

    const timeSlot: TimeSlot = {
      id: `${dayId}-${Date.now()}`,
      start: slot.start,
      end: slot.end,
    }

    const updatedAvailability = {
      ...availability,
      [dayId]: [...(availability[dayId] || []), timeSlot].sort((a, b) => {
        return timeToMinutes(a.start) - timeToMinutes(b.start)
      }),
    }

    onChange(updatedAvailability)
    setNewSlots((prev) => ({ ...prev, [dayId]: { start: "", end: "" } }))
    setErrors((prev) => ({ ...prev, [dayId]: null }))
  }

  const removeTimeSlot = (dayId: string, slotId: string) => {
    const updatedAvailability = {
      ...availability,
      [dayId]: (availability[dayId] || []).filter((slot) => slot.id !== slotId),
    }
    onChange(updatedAvailability)
  }

  const getValidEndTimes = (startTime: string) => {
    const startIndex = TIME_OPTIONS.indexOf(startTime)
    return TIME_OPTIONS.slice(startIndex + 1)
  }

  const getSlotDuration = (slot: TimeSlot) => {
    const duration = timeToMinutes(slot.end) - timeToMinutes(slot.start)
    const hours = Math.floor(duration / 60)
    const minutes = duration % 60
    if (hours === 0) return `${minutes}m`
    if (minutes === 0) return `${hours}h`
    return `${hours}h ${minutes}m`
  }

  const getDaySlotCount = (dayId: string) => {
    return availability[dayId]?.length || 0
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 mb-4">
        <Clock className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Weekly Availability</h3>
      </div>

      <Accordion type="single" collapsible value={activeDay} onValueChange={setActiveDay}>
        {DAYS_OF_WEEK.map((day) => (
          <AccordionItem key={day.id} value={day.id} className="border rounded-lg mb-2">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex items-center justify-between w-full mr-4">
                <span className="font-medium text-gray-900">{day.name}</span>
                <div className="flex items-center space-x-2">
                  {getDaySlotCount(day.id) > 0 && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      {getDaySlotCount(day.id)} slot{getDaySlotCount(day.id) > 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="space-y-4">
                {/* Quick Presets */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Quick Presets</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {QUICK_PRESETS.map((preset) => (
                      <Button
                        key={preset.label}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handlePresetSelect(day.id, preset)}
                        className="h-8 text-xs hover:bg-blue-50 hover:border-blue-300"
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Custom Time Selection */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Start Time</label>
                    <Select
                      value={newSlots[day.id]?.start || ""}
                      onValueChange={(value) => handleTimeChange(day.id, "start", value)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Start" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_OPTIONS.slice(0, -1).map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">End Time</label>
                    <Select
                      value={newSlots[day.id]?.end || ""}
                      onValueChange={(value) => handleTimeChange(day.id, "end", value)}
                      disabled={!newSlots[day.id]?.start}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="End" />
                      </SelectTrigger>
                      <SelectContent>
                        {newSlots[day.id]?.start &&
                          getValidEndTimes(newSlots[day.id].start).map((time) => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Add Button */}
                <Button
                  type="button"
                  onClick={() => addTimeSlot(day.id)}
                  disabled={!newSlots[day.id]?.start || !newSlots[day.id]?.end}
                  className="w-full h-9 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Time Slot
                </Button>

                {/* Validation Error */}
                {errors[day.id] && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800 text-sm">{errors[day.id]?.message}</AlertDescription>
                  </Alert>
                )}

                {/* Existing Time Slots */}
                {availability[day.id] && availability[day.id].length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-gray-100">
                    <label className="text-sm font-medium text-gray-700">Added Time Slots</label>
                    {availability[day.id].map((slot) => (
                      <div key={slot.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="font-medium text-gray-900">
                            {slot.start} - {slot.end}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {getSlotDuration(slot)}
                          </Badge>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTimeSlot(day.id, slot.id)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {/* Summary */}
      {Object.values(availability).some((slots) => slots.length > 0) && (
        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-green-800">
              Total: {Object.values(availability).reduce((total, slots) => total + slots.length, 0)} time slots
            </span>
            <Badge className="bg-green-600 text-white text-xs">
              {Object.entries(availability).filter(([_, slots]) => slots.length > 0).length} active days
            </Badge>
          </div>
        </div>
      )}
    </div>
  )
}
