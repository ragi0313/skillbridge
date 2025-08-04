"use client"

import { useState } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { Trash2 } from "lucide-react"

export function DatePickerWithMultiple({
  blockedDates,
  onChange,
}: {
  blockedDates: Date[]
  onChange: (dates: Date[]) => void
}) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>()

  const addDate = (date: Date | undefined) => {
    if (!date) return
    const alreadyBlocked = blockedDates.some(
      (d) => d.toDateString() === date.toDateString()
    )
    if (!alreadyBlocked) {
      onChange([...blockedDates, date])
    }
    setSelectedDate(undefined)
  }

  const removeDate = (date: Date) => {
    onChange(blockedDates.filter((d) => d.toDateString() !== date.toDateString()))
  }

  return (
    <div className="space-y-4">
      <div>
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => addDate(date)}
        />
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-medium">Blocked Dates</h4>
        {blockedDates.length === 0 ? (
          <p className="text-sm text-muted-foreground">No blocked dates</p>
        ) : (
          <ul className="space-y-1">
            {blockedDates.map((date) => (
              <li
                key={date.toDateString()}
                className="flex items-center justify-between bg-muted px-3 py-1 rounded-md"
              >
                <span className="text-sm">{format(date, "PPP")}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeDate(date)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
