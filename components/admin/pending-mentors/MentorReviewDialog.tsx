"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, XCircle, Eye, ExternalLink, Clock, Mail, MapPin, Globe, Star } from "lucide-react"
import type { PendingMentor, Availability } from "./types"
import { CreditsDisplay } from "./CreditsDisplay"

interface MentorReviewDialogProps {
  mentor: PendingMentor
  onApprove: (id: number, notes: string) => void
  onReject: (id: number, notes: string) => void
}

export function MentorReviewDialog({ mentor, onApprove, onReject }: MentorReviewDialogProps) {
  const [reviewNotes, setReviewNotes] = useState("")
  const [isOpen, setIsOpen] = useState(false)

  const name = `${mentor.firstName} ${mentor.lastName}`

  let parsedAvailability: Availability = {}
  try {
    parsedAvailability = typeof mentor.availability === "string" ? JSON.parse(mentor.availability) : mentor.availability
  } catch (err) {
    console.error("Invalid availability format", err)
  }

  const handleApprove = () => {
    onApprove(mentor.id, reviewNotes)
    setIsOpen(false)
    setReviewNotes("")
  }

  const handleReject = () => {
    onReject(mentor.id, reviewNotes)
    setIsOpen(false)
    setReviewNotes("")
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm" className="w-full">
          <Eye className="w-4 h-4 mr-2" />
          Review
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-2xl">Review Application - {name}</DialogTitle>
          <DialogDescription className="text-base">
            Complete mentor application review and make approval decision
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="profile" className="text-sm">
              Profile
            </TabsTrigger>
            <TabsTrigger value="skills" className="text-sm">
              Skills & Rates
            </TabsTrigger>
            <TabsTrigger value="availability" className="text-sm">
              Availability
            </TabsTrigger>
            <TabsTrigger value="questions" className="text-sm">
              Screening
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-semibold text-lg text-gray-900 border-b pb-2">Basic Information</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Mail className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Email</p>
                      <p className="text-gray-900">{mentor.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <MapPin className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Country</p>
                      <p className="text-gray-900">{mentor.country}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Globe className="w-5 h-5 text-purple-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Timezone</p>
                      <p className="text-gray-900">{mentor.timezone}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Star className="w-5 h-5 text-yellow-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Experience</p>
                      <p className="text-gray-900">
                        {mentor.yearsOfExperience} {mentor.yearsOfExperience === 1 ? "year" : "years"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="font-semibold text-lg text-gray-900 border-b pb-2">Professional Links</h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">LinkedIn Profile</p>
                    <a
                      href={mentor.linkedInUrl}
                      className="inline-flex items-center text-blue-600 hover:text-blue-800 hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View LinkedIn Profile
                      <ExternalLink className="w-4 h-4 ml-1" />
                    </a>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Social Links</p>
                    <a
                      href={mentor.socialLinks}
                      className="inline-flex items-center text-blue-600 hover:text-blue-800 hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View Social Profile
                      <ExternalLink className="w-4 h-4 ml-1" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
            <Separator />
            <div>
              <h4 className="font-semibold text-lg text-gray-900 mb-3">Professional Bio</h4>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700 leading-relaxed">{mentor.bio}</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="skills" className="space-y-6">
            <div>
              <h4 className="font-semibold text-lg text-gray-900 mb-4">Skills & Hourly Rates</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mentor.skills.map((skill, index) => (
                  <div
                    key={index}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h5 className="font-medium text-gray-900 mb-1">{skill.skillName}</h5>
                        <p className="text-sm text-gray-500">Per hour rate</p>
                      </div>
                      <CreditsDisplay credits={skill.ratePerHour} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="availability" className="space-y-6">
            <div>
              <h4 className="font-semibold text-lg text-gray-900 mb-4">Weekly Availability</h4>
              <div className="grid gap-4">
                {Object.entries(parsedAvailability).map(([day, slots]) => (
                  <div key={day} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <h5 className="font-medium text-gray-900 capitalize mb-2">{day}</h5>
                      <Badge variant="outline" className="text-xs">
                        {slots.length} {slots.length === 1 ? "slot" : "slots"}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {slots.map((slot, index) => (
                        <Badge
                          key={slot?.id || `${day}-${index}`}
                          variant="secondary"
                          className="bg-blue-100 text-blue-800"
                        >
                          <Clock className="w-3 h-3 mr-1" />
                          {slot.start} - {slot.end}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="questions" className="space-y-6">
            <div className="space-y-6">
              <div>
                <h5 className="font-medium text-gray-900 mb-3">Why do you want to become a mentor on SkillBridge?</h5>
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
                  <p className="text-gray-700 leading-relaxed">{mentor.question1}</p>
                </div>
              </div>
              <div>
                <h5 className="font-medium text-gray-900 mb-3">
                  Describe your previous mentoring or teaching experience.
                </h5>
                <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-r-lg">
                  <p className="text-gray-700 leading-relaxed">{mentor.question2}</p>
                </div>
              </div>
              <div>
                <h5 className="font-medium text-gray-900 mb-3">
                  What is your approach to mentoring and helping others learn?
                </h5>
                <div className="bg-purple-50 border-l-4 border-purple-400 p-4 rounded-r-lg">
                  <p className="text-gray-700 leading-relaxed">{mentor.question3}</p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <Separator className="my-6" />

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Admin Review Notes (Optional)</label>
            <Textarea
              placeholder="Add any notes about this application review..."
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="destructive" onClick={handleReject} className="px-6">
              <XCircle className="w-4 h-4 mr-2" />
              Reject Application
            </Button>
            <Button onClick={handleApprove} className="px-6 bg-green-600 hover:bg-green-700">
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve Mentor
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
