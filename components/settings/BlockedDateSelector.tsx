"use client"

import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type BlockedDateEntry = {
  date: Date
  reason: string
}

type Props = {
  blockedDates: Date[]
  onBlockedDatesChange: (dates: Date[]) => void
}

export default function BlockedDatesSelector({ blockedDates, onBlockedDatesChange }: Props) {
  const [selectedDates, setSelectedDates] = React.useState<Date[]>(blockedDates)
  const [reasonInput, setReasonInput] = React.useState<string>("")
  const [currentDateForReason, setCurrentDateForReason] = React.useState<Date | undefined>(undefined)
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false)

  React.useEffect(() => {
    setSelectedDates(blockedDates)
  }, [blockedDates])

  const handleDateSelect = (dates: Date[] | undefined) => {
  if (!dates) return

  // Determine what date was added or removed by comparing with current state
  const newDate = dates.find(
    (d) => !selectedDates.some((sd) => sd.toDateString() === d.toDateString())
  )
  const removedDate = selectedDates.find(
    (sd) => !dates.some((d) => d.toDateString() === sd.toDateString())
  )

  setSelectedDates(dates)
  onBlockedDatesChange(dates)

  if (newDate) {
    setCurrentDateForReason(newDate)
    setIsPopoverOpen(true)
  }
}


  const handleReasonSave = () => {
    setReasonInput("")
    setCurrentDateForReason(undefined)
    setIsPopoverOpen(false)
  }

  const removeBlockedDate = (dateToRemove: Date) => {
    const updatedDates = selectedDates.filter((d) => d.toDateString() !== dateToRemove.toDateString())
    setSelectedDates(updatedDates)
    onBlockedDatesChange(updatedDates)
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CalendarIcon className="w-5 h-5 text-orange-600" />
          <span>Block Specific Dates</span>
        </CardTitle>
        <CardDescription>Mark days when you are unavailable for mentoring sessions.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-full justify-start text-left font-normal h-12",
                !selectedDates.length && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDates.length > 0 ? (
                <span>{selectedDates.length} date(s) selected</span>
              ) : (
                <span>Pick dates to block</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="multiple" selected={selectedDates} onSelect={handleDateSelect} initialFocus />
            {currentDateForReason && (
              <div className="p-4 border-t">
                <Label htmlFor="reason" className="text-sm font-semibold mb-2 block">
                  Reason for blocking {format(currentDateForReason, "PPP")} (Optional)
                </Label>
                <Input
                  id="reason"
                  value={reasonInput}
                  onChange={(e) => setReasonInput(e.target.value)}
                  placeholder="e.g., Vacation, Holiday"
                  className="mb-2"
                />
                <Button onClick={handleReasonSave} className="w-full">
                  Save Reason
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        {selectedDates.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Blocked Dates:</p>
            <div className="flex flex-wrap gap-2">
              {selectedDates.map((date, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm"
                >
                  <span>{format(date, "PPP")}</span>
                  <button
                    type="button"
                    onClick={() => removeBlockedDate(date)}
                    className="hover:bg-red-200 rounded-full p-1"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
