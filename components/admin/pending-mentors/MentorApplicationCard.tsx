import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import {
  Star,
  Calendar,
  MapPin,
  Clock,
  Mail,
  Globe,
  User,
  Languages,
} from "lucide-react"
import type { PendingMentor, Availability, AvailabilitySlot } from "./types"
import { CreditsDisplay } from "./CreditsDisplay"
import { MentorReviewDialog } from "./MentorReviewDialog"

interface MentorApplicationCardProps {
  mentor: PendingMentor
  onApprove: (id: number, notes: string) => void
  onReject: (id: number, notes: string) => void
}

export function MentorApplicationCard({
  mentor,
  onApprove,
  onReject,
}: MentorApplicationCardProps) {
  const name = `${mentor.firstName} ${mentor.lastName}`

  let parsedAvailability: Availability = {}

  if (typeof mentor.availability === "string") {
    try {
      const trimmed = mentor.availability.trim()
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        parsedAvailability = JSON.parse(trimmed)
      } else {
        throw new Error("Not valid JSON")
      }
    } catch (err) {
      console.error("Invalid availability string format", mentor.availability, err)
      parsedAvailability = {}
    }
  } else if (
    typeof mentor.availability === "object" &&
    mentor.availability !== null
  ) {
    parsedAvailability = mentor.availability
  }

  return (
    <Card className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start">
          <div className="flex items-start space-x-4">
            <Avatar className="w-20 h-20 border-4 border-white shadow-lg">
              <AvatarImage
                src={mentor.profilePictureUrl || "/placeholder.svg"}
                alt={name}
              />
              <AvatarFallback className="text-lg font-semibold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                {mentor.firstName[0]}
                {mentor.lastName[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <CardTitle className="text-xl text-gray-900 mb-1">{name}</CardTitle>
              <CardDescription className="text-base font-medium text-gray-700 mb-3">
                {mentor.professionalTitle}
              </CardDescription>

              {/* Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div className="flex items-center text-gray-600">
                  <Mail className="w-4 h-4 mr-2 text-blue-500" />
                  <span className="truncate">{mentor.email}</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <MapPin className="w-4 h-4 mr-2 text-green-500" />
                  <span>{mentor.country}</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <Globe className="w-4 h-4 mr-2 text-purple-500" />
                  <span>{mentor.timezone}</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <User className="w-4 h-4 mr-2 text-pink-500" />
                  <span className="capitalize">{mentor.gender}</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <Languages className="w-4 h-4 mr-2 text-teal-500" />
                  <span>
                    {Array.isArray(mentor.languagesSpoken)
                      ? (mentor.languagesSpoken as string[])
                          .slice(0, 2)
                          .join(", ") +
                        ((mentor.languagesSpoken as string[]).length > 2
                          ? "..."
                          : "")
                      : typeof mentor.languagesSpoken === "string"
                      ? mentor.languagesSpoken
                      : "Not specified"}
                  </span>
                </div>
                <div className="flex items-center text-gray-600">
                  <Calendar className="w-4 h-4 mr-2 text-orange-500" />
                  <span>
                    Applied {new Date(mentor.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center text-gray-600">
                  <Star className="w-4 h-4 mr-2 text-yellow-500" />
                  <span>
                    {mentor.yearsOfExperience}{" "}
                    {mentor.yearsOfExperience === 1 ? "year" : "years"} experience
                  </span>
                </div>
                <div className="flex items-center text-gray-600">
                  <Clock className="w-4 h-4 mr-2 text-indigo-500" />
                  <span>{Object.keys(parsedAvailability).length} days available</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col space-y-2">
            <MentorReviewDialog
              mentor={mentor}
              onApprove={onApprove}
              onReject={onReject}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <Separator className="mb-4" />
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Skills & Rates</h4>
            <div className="flex flex-wrap gap-2">
              {mentor.skills.slice(0, 4).map((skill, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-2 bg-gray-50 rounded-lg px-3 py-2 border"
                >
                  <span className="font-medium text-gray-900">{skill.skillName}</span>
                  <CreditsDisplay credits={skill.ratePerHour} />
                </div>
              ))}
              {mentor.skills.length > 4 && (
                <Badge variant="outline" className="px-3 py-2">
                  +{mentor.skills.length - 4} more
                </Badge>
              )}
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-2">Bio Preview</h4>
            <p className="text-gray-600 text-sm line-clamp-2 leading-relaxed">
              {mentor.bio}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
