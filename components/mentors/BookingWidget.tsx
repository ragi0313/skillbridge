"use client"

import { useEffect, useState } from "react"
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
  const [isSticky, setIsSticky] = useState(false)

  const mentorSlug = `${mentor.firstName}-${mentor.lastName}`.toLowerCase().replace(/\s+/g, "-")
  const bookingUrl = `/mentors/${mentor.id}/${mentorSlug}/book`

  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 450)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <div
      id="booking-widget"
      className={`relative lg:pr-20 z-30 transition-all duration-300 w-full lg:max-w-md ${
        isSticky ? "lg:fixed top-0" : "lg:absolute -top-20"
      }`}
    >
      <Card className="bg-white shadow-xl border overflow-hidden w-full">
        <div className="border-b text-center pb-3 px-6">
          <h1 className="text-lg font-semibold text-gray-700">Book Session</h1>
        </div>

        <div className="px-6 pb-5 border-b">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <CreditCard className="w-5 h-5 text-purple-600" />
              <span className="text-xl font-bold text-gray-900">{averageRate}</span>
              <span className="text-sm text-gray-600">credits/hour</span>
            </div>
            <p className="text-sm text-gray-500">Average rate</p>
          </div>
        </div>

        <CardContent className="p-6 pt-4">
          <div className="space-y-6">
            <div className="border-b pb-4 space-y-3 text-sm text-gray-600">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-purple-500" />
                <span>Flexible scheduling</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-purple-500" />
                <span>1-hour minimum session</span>
              </div>
              <div className="flex items-center gap-3">
                <MessageCircle className="w-4 h-4 text-purple-500" />
                <span>Q&A support included</span>
              </div>
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 text-purple-500" />
                <span>1-on-1 personalized sessions</span>
              </div>
            </div>

            <div className="space-y-4">
              <Link href={bookingUrl}>
                <Button className="w-full cursor-pointer bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 text-sm">
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
