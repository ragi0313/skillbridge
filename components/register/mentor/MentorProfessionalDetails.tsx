"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Briefcase, Linkedin, Plus, X, Link, Globe, Github, Palette, FileText } from "lucide-react"

const LINK_TYPES = [
  { value: "portfolio", label: "Portfolio", icon: Globe, placeholder: "https://yourportfolio.com" },
  { value: "github", label: "GitHub", icon: Github, placeholder: "https://github.com/yourusername" },
  { value: "behance", label: "Behance", icon: Palette, placeholder: "https://behance.net/yourusername" },
  { value: "dribbble", label: "Dribbble", icon: Palette, placeholder: "https://dribbble.com/yourusername" },
  { value: "website", label: "Personal Website", icon: Globe, placeholder: "https://yourwebsite.com" },
  { value: "blog", label: "Blog", icon: FileText, placeholder: "https://yourblog.com" },
  { value: "other", label: "Other", icon: Link, placeholder: "https://example.com" },
]

type LinkAttachment = {
  id: string
  type: string
  label: string
  url: string
}

type Props = {
  formData: any
  setFormData: (data: any) => void
  nextStep: () => void
  prevStep: () => void
  isSettingsPage?: boolean // Add prop to identify if this is being used in settings
}

export default function MentorProfessionalDetails({ formData, setFormData, nextStep, prevStep, isSettingsPage = false }: Props) {
  const [linkAttachments, setLinkAttachments] = useState<LinkAttachment[]>(() => {
    return formData.linkAttachments || []
  })

  const isFormValid = () => {
    const hasRequiredFields =
      formData.professionalTitle &&
      formData.bio &&
      formData.bio.length >= 100 &&
      formData.bio.length <= 500 &&
      formData.yearsOfExperience &&
      formData.linkedinUrl

    const hasValidLinkedIn = formData.linkedinUrl && formData.linkedinUrl.includes("linkedin.com")

    // For settings page, make link attachments optional
    if (isSettingsPage) {
      return hasRequiredFields && hasValidLinkedIn
    }

    // For registration, require at least one link attachment
    const hasValidAttachments = linkAttachments.length >= 1 && linkAttachments.every((link) => link.url && link.label)
    return hasRequiredFields && hasValidLinkedIn && hasValidAttachments
  }

  const addLinkAttachment = () => {
    const newLink: LinkAttachment = {
      id: `link-${Date.now()}`,
      type: "portfolio",
      label: "Portfolio",
      url: "",
    }
    const updatedLinks = [...linkAttachments, newLink]
    setLinkAttachments(updatedLinks)
    setFormData({ ...formData, linkAttachments: updatedLinks })
  }

  const removeLinkAttachment = (id: string) => {
    const updatedLinks = linkAttachments.filter((link) => link.id !== id)
    setLinkAttachments(updatedLinks)
    setFormData({ ...formData, linkAttachments: updatedLinks })
  }

  const updateLinkAttachment = (id: string, field: keyof LinkAttachment, value: string) => {
    const updatedLinks = linkAttachments.map((link) => {
      if (link.id === id) {
        const updatedLink = { ...link, [field]: value }
        // Auto-update label when type changes
        if (field === "type") {
          const linkType = LINK_TYPES.find((type) => type.value === value)
          updatedLink.label = linkType?.label || value
        }
        return updatedLink
      }
      return link
    })
    setLinkAttachments(updatedLinks)
    setFormData({ ...formData, linkAttachments: updatedLinks })
  }

  const getLinkIcon = (type: string) => {
    const linkType = LINK_TYPES.find((t) => t.value === type)
    const IconComponent = linkType?.icon || Link
    return <IconComponent className="w-4 h-4" />
  }

  const getLinkPlaceholder = (type: string) => {
    const linkType = LINK_TYPES.find((t) => t.value === type)
    return linkType?.placeholder || "https://example.com"
  }

  return (
    <div className="space-y-6">
      {/* Professional Title */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Briefcase className="w-5 h-5 text-blue-600" />
            <span>Professional Title</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Label htmlFor="professionalTitle" className="text-base font-semibold text-gray-700">
            How would you describe your professional role?*
          </Label>
          <Input
            id="professionalTitle"
            placeholder="e.g., Digital Marketing Specialist, UI/UX Designer, Full-Stack Web Developer"
            value={formData.professionalTitle}
            onChange={(e) => setFormData({ ...formData, professionalTitle: e.target.value })}
            className="h-12 text-base"
            required
          />
          <p className="text-sm text-gray-500">This will be displayed as your headline to learners</p>
        </CardContent>
      </Card>

      {/* Bio */}
      <Card>
        <CardContent className="px-6 space-y-4">
          <Label htmlFor="bio" className="text-base font-semibold text-gray-700">
            About Me* (at least 100 characters)
          </Label>
          <Textarea
            id="bio"
            placeholder="Tell learners about yourself, your experience, and what makes you a great mentor. Share your passion for teaching and helping others grow..."
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            rows={6}
            className="resize-none text-base h-40"
            minLength={100}
            maxLength={500}
            required
          />
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">This will be visible on your mentor profile</p>
            <span className={`text-sm ${formData.bio?.length >= 100 && formData.bio?.length <= 500 ? "text-green-600" : "text-gray-400"}`}>
              {formData.bio?.length || 0}/500 characters
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Experience */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <Label htmlFor="yearsOfExperience" className="text-base font-semibold text-gray-700">
            Years of Professional Experience*
          </Label>
          <Input
            id="yearsOfExperience"
            type="number"
            placeholder="5"
            value={formData.yearsOfExperience}
            onChange={(e) => {
              const value = parseInt(e.target.value, 10)
              setFormData({ ...formData, yearsOfExperience: isNaN(value) ? "" : value })
            }}
            className="h-12 text-base"
            min="0"
            max="50"
            required
          />
          <p className="text-sm text-gray-500">How many years have you been working in your field?</p>
        </CardContent>
      </Card>

      {/* Required LinkedIn */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Linkedin className="w-5 h-5 text-blue-600" />
            <span>LinkedIn Profile*</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Label htmlFor="linkedinUrl" className="text-base font-semibold text-gray-700">
            LinkedIn URL (Required)
          </Label>
          <Input
            id="linkedinUrl"
            type="url"
            placeholder="https://linkedin.com/in/yourprofile"
            value={formData.linkedinUrl}
            onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
            className="h-12 text-base"
            disabled={isSettingsPage} // Disable LinkedIn editing in settings if desired
            required
          />
          <p className="text-sm text-gray-500">
            {isSettingsPage 
              ? "LinkedIn URL cannot be changed from settings" 
              : "We require LinkedIn to verify your professional background"
            }
          </p>
          {formData.linkedinUrl && !formData.linkedinUrl.includes("linkedin.com") && (
            <p className="text-sm text-red-600">Please enter a valid LinkedIn URL</p>
          )}
        </CardContent>
      </Card>

      {/* Link Attachments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Link className="w-5 h-5 text-purple-600" />
              <span>
                Website/Portfolio Links{!isSettingsPage && "*"} ({linkAttachments.length})
              </span>
            </div>
            <Button
              type="button"
              onClick={addLinkAttachment}
              className="h-9 bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Link
            </Button>
          </CardTitle>
          <p className="text-sm text-gray-600">
            {isSettingsPage 
              ? "Add links to showcase your work (portfolio, GitHub, etc.)" 
              : "Add at least one additional link to showcase your work (portfolio, GitHub, etc.)"
            }
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {linkAttachments.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
              <Link className="w-8 h-8 mx-auto mb-3 text-gray-400" />
              <p className="text-sm font-medium text-gray-600 mb-1">No links added yet</p>
              <p className="text-xs text-gray-400">Click "Add Link" to showcase your work</p>
            </div>
          ) : (
            <div className="space-y-4">
              {linkAttachments.map((link, index) => (
                <div key={link.id} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      {getLinkIcon(link.type)}
                      <span className="font-medium text-gray-900">Link {index + 1}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLinkAttachment(link.id)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">Link Type</Label>
                      <Select value={link.type} onValueChange={(value) => updateLinkAttachment(link.id, "type", value)}>
                        <SelectTrigger className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LINK_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              <div className="flex items-center space-x-2">
                                <type.icon className="w-4 h-4" />
                                <span>{type.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">Custom Label (Optional)</Label>
                      <Input
                        placeholder={`e.g., ${link.label}`}
                        value={link.label}
                        onChange={(e) => updateLinkAttachment(link.id, "label", e.target.value)}
                        className="h-10"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">URL*</Label>
                    <Input
                      type="url"
                      placeholder={getLinkPlaceholder(link.type)}
                      value={link.url}
                      onChange={(e) => updateLinkAttachment(link.id, "url", e.target.value)}
                      className="h-10"
                      required
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {linkAttachments.length === 0 && !isSettingsPage && (
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-sm text-amber-800">
                <strong>Required:</strong> Please add at least one additional link to showcase your work or professional
                presence.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      {!isSettingsPage && (
          <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={prevStep} className="h-12 px-6 text-base bg-transparent">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous Step
            </Button>
            <div className="flex justify-end w-full">
              <Button
                type="button"
                onClick={nextStep}
                disabled={!isFormValid()}
                className="w-[15%] h-14 gradient-bg text-white font-semibold text-base rounded-lg"
              >
                Continue
              </Button>
            </div>
          </div>
        )}
    </div>
  )
}