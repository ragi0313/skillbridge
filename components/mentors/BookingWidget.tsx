"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  CreditCard,
  Calendar,
  Clock,
  MessageCircle,
  Users,
} from "lucide-react"
import Link from "next/link"

interface BookingWidgetProps {
  mentor: {
    id: number
    firstName: string
    lastName: string
    isAvailable?: boolean
    skills: string[]
    rates: Record<string, number>
  }
  averageRate: number
}

export default function BookingWidget({ mentor, averageRate }: BookingWidgetProps) {
  const mentorSlug = `${mentor.firstName}-${mentor.lastName}`.toLowerCase().replace(/\s+/g, "-")
  const bookingUrl = `/mentors/${mentor.id}/${mentorSlug}/book`

  return (
    <div id="booking-widget" className="w-full">
      <Card className="bg-white shadow-xl border overflow-hidden w-full">
        <div className="border-b text-center py-4 px-4 sm:px-6">
          <h1 className="text-lg sm:text-xl font-semibold text-gray-700">Book Session</h1>
        </div>

        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              <span className="text-xl sm:text-2xl font-bold text-gray-900">{averageRate}</span>
              <span className="text-sm sm:text-base text-gray-600">credits/hour</span>
            </div>
            <p className="text-xs sm:text-sm text-gray-500">Average rate</p>
          </div>
        </div>

        <CardContent className="p-4 sm:p-6 pt-4">
          <div className="space-y-4 sm:space-y-6">
            <div className="border-b pb-4 space-y-2 sm:space-y-3 text-sm sm:text-base text-gray-600">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500 flex-shrink-0" />
                <span>Flexible scheduling</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500 flex-shrink-0" />
                <span>1-hour minimum session</span>
              </div>
              <div className="flex items-center gap-3">
                <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500 flex-shrink-0" />
                <span>Q&A support included</span>
              </div>
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500 flex-shrink-0" />
                <span>1-on-1 personalized sessions</span>
              </div>
            </div>

            <div>
              <Link href={bookingUrl}>
                <Button className="w-full cursor-pointer bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 sm:py-4 text-sm sm:text-base transition-colors">
                  Book Now
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
