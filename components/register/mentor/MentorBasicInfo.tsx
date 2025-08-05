"use client"

import type React from "react"

import { useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import countries from "world-countries"
import ProfilePictureUpload from "../ProfilePictureUpload"
import { Eye, EyeOff, CheckCircle, Loader2, X } from "lucide-react"
import { useEmailAvailability } from "@/app/hooks/useEmailAvailability"
import { usePasswordVisibility } from "@/app/hooks/usePasswordVisibility"
import { commonTimeZones, getDefaultTimezone } from "@/lib/timeZones"
import { useState } from "react"

type MentorBasicInfoFormData = {
  profilePicture: string | null
  firstName: string
  lastName: string
  email: string
  country: string
  password?: string // Make password optional for settings page
  confirmPassword?: string // Make confirmPassword optional for settings page
  timezone: string
  gender: string
  languages: string[]
}

type Props = {
  formData: MentorBasicInfoFormData
  setFormData: (data: Partial<MentorBasicInfoFormData>) => void
  nextStep: () => void
  isSettingsPage?: boolean // Add prop to identify if this is being used in settings
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/

export default function MentorBasicInfo({ formData, setFormData, nextStep, isSettingsPage = false }: Props) {
  const [languageInput, setLanguageInput] = useState("")

  const countryOptions = countries.map((country) => ({
    value: country.cca2,
    label: country.name.common,
  }))

  const { emailAvailable, isChecking } = useEmailAvailability(formData.email)
  const { showPassword, showConfirmPassword, togglePassword, toggleConfirmPassword } = usePasswordVisibility()

  useEffect(() => {
    if (!formData.timezone) {
      const defaultTz = getDefaultTimezone()
      if (defaultTz) {
        setFormData({ timezone: defaultTz })
      }
    }
  }, [formData.timezone, setFormData])

  const addLanguage = () => {
    if (languageInput.trim() && !formData.languages.includes(languageInput.trim())) {
      setFormData({
        languages: [...formData.languages, languageInput.trim()],
      })
      setLanguageInput("")
    }
  }

  const removeLanguage = (languageToRemove: string) => {
    setFormData({
      languages: formData.languages.filter((lang) => lang !== languageToRemove),
    })
  }

  const handleLanguageKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      addLanguage()
    }
  }

  const isFormValid = () => {
    const basicValidation = 
      formData.profilePicture &&
      formData.firstName &&
      formData.lastName &&
      emailRegex.test(formData.email) &&
      emailAvailable === true &&
      formData.country &&
      formData.timezone &&
      formData.gender &&
      formData.languages.length > 0

    // For settings page, password validation is optional
    if (isSettingsPage) {
      // If password fields are empty, skip password validation
      if (!formData.password && !formData.confirmPassword) {
        return basicValidation
      }
      // If password fields have content, validate them
      return basicValidation && 
        passwordRegex.test(formData.password || '') &&
        formData.password === formData.confirmPassword
    }

    // For registration, password is required
    return basicValidation &&
      passwordRegex.test(formData.password || '') &&
      formData.password === formData.confirmPassword
  }

  return (
    <div className="space-y-6">
       <ProfilePictureUpload
        initialImageUrl={formData.profilePicture}
        onUploadSuccess={(url) => setFormData({ profilePicture: url })}
        onDeleteSuccess={() => setFormData({ profilePicture: null })}
        showRemoveButton={!isSettingsPage}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName" className="text-sm font-semibold mb-2">
            First Name*
          </Label>
          <Input
            id="firstName"
            value={formData.firstName}
            onChange={(e) => setFormData({ firstName: e.target.value })}
            className="h-12"
            disabled={isSettingsPage}
          />
        </div>
        <div>
          <Label htmlFor="lastName" className="text-sm font-semibold mb-2">
            Last Name*
          </Label>
          <Input
            id="lastName"
            value={formData.lastName}
            onChange={(e) => setFormData({ lastName: e.target.value })}
            className="h-12"
            disabled={isSettingsPage}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="email" className="text-sm font-semibold mb-2">
            Email Address*
          </Label>
          <div className="relative">
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ email: e.target.value })}
              placeholder="Enter your email"
              className="h-14 pr-11"
              disabled={isSettingsPage} // Disable email editing in settings
            />
            {!isSettingsPage && emailRegex.test(formData.email) && isChecking && (
              <Loader2 className="absolute right-3 top-4 h-5 w-5 text-gray-400 animate-spin" />
            )}
            {!isSettingsPage && emailRegex.test(formData.email) && !isChecking && emailAvailable && (
              <CheckCircle className="absolute right-3 top-4 h-6 w-6 text-green-500" />
            )}
          </div>

          {/* Validation message only if not in settings */}
          {!isSettingsPage && emailRegex.test(formData.email) && !isChecking && emailAvailable === false && (
            <p className="text-sm text-red-600 mt-1 ml-1">Email is already taken.</p>
          )}
        </div>

        <div>
          <Label htmlFor="country" className="text-sm font-semibold mb-2">
            Country*
          </Label>
          <Select value={formData.country} onValueChange={(value) => setFormData({ country: value })}>
            <SelectTrigger
              className="w-full text-base border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-sm"
              style={{ height: "56px" }}
            >
              <SelectValue placeholder="Select your country" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {countryOptions.map((country) => (
                <SelectItem key={country.value} value={country.value}>
                  {country.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="gender" className="text-sm font-semibold mb-2">
            Gender*
          </Label>
          <Select value={formData.gender} onValueChange={(value) => setFormData({ gender: value })}>
            <SelectTrigger
              className="w-full text-base border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-sm"
              style={{ height: "56px" }}
            >
              <SelectValue placeholder="Select your gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="timezone" className="text-sm font-semibold mb-2">
            Timezone*
          </Label>
          <Select value={formData.timezone} onValueChange={(value) => setFormData({ timezone: value })}>
            <SelectTrigger
              className="w-full text-base border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-sm"
              style={{ height: "56px" }}
            >
              <SelectValue placeholder="Select your timezone" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {commonTimeZones.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="languages" className="text-sm font-semibold mb-2">
          Languages Spoken* 
        </Label>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              id="languages"
              value={languageInput}
              onChange={(e) => setLanguageInput(e.target.value)}
              onKeyDown={handleLanguageKeyPress}
              placeholder="Enter a language (e.g., English, Spanish, French)"
              className="h-12 flex-1"
            />
            <Button
              type="button"
              onClick={addLanguage}
              disabled={!languageInput.trim()}
              className="h-12 px-6 gradient-bg cursor-pointer text-white"
            >
              Add
            </Button>
          </div>

          {formData.languages.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.languages.map((language, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                >
                  <span>{language}</span>
                  <button
                    type="button"
                    onClick={() => removeLanguage(language)}
                    className="hover:bg-blue-200 rounded-full p-1"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {formData.languages.length === 0 && (
            <p className="text-sm text-gray-500">Add at least one language you can speak fluently</p>
          )}
        </div>
      </div>

      {/* Password Section - Show different behavior for settings vs registration */}
      {!isSettingsPage && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Password */}
          <div>
            <Label htmlFor="password" className="text-sm font-semibold mb-2">
              Password*
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={formData.password || ''}
                onChange={(e) => setFormData({ password: e.target.value })}
                placeholder="Create a strong password"
                className={`h-14 pr-11 ${
                  formData.password && !passwordRegex.test(formData.password) ? "border-red-500" : ""
                }`}
                required
              />
              <button type="button" onClick={togglePassword} className="absolute right-3 top-4 text-gray-400">
                {showPassword ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
              </button>
            </div>
            {formData.password && !passwordRegex.test(formData.password) && (
              <p className="text-sm text-red-600 mt-1">
                Must include uppercase, lowercase, number, and special character.
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <Label htmlFor="confirmPassword" className="text-sm font-semibold mb-2">
              Confirm Password*
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={formData.confirmPassword || ''}
                onChange={(e) => setFormData({ confirmPassword: e.target.value })}
                placeholder="Confirm your password"
                className="h-14 pr-11"
                required
              />
              <button type="button" onClick={toggleConfirmPassword} className="absolute right-3 top-4 text-gray-400">
                {showConfirmPassword ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
              </button>
            </div>
            {formData.confirmPassword && formData.confirmPassword !== formData.password && (
              <p className="text-sm text-red-600 mt-1">Passwords do not match.</p>
            )}
          </div>
        </div>
      )}

      {/* Password change section for settings page */}
      {isSettingsPage && (
        <div className="space-y-4">
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Change Password (Optional)</h3>
            <p className="text-sm text-gray-600 mb-4">Leave blank if you don't want to change your password</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* New Password */}
              <div>
                <Label htmlFor="password" className="text-sm font-semibold mb-2">
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password || ''}
                    onChange={(e) => setFormData({ password: e.target.value })}
                    placeholder="Enter new password (optional)"
                    className={`h-14 pr-11 ${
                      formData.password && !passwordRegex.test(formData.password) ? "border-red-500" : ""
                    }`}
                  />
                  <button type="button" onClick={togglePassword} className="absolute right-3 top-4 text-gray-400">
                    {showPassword ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                  </button>
                </div>
                {formData.password && !passwordRegex.test(formData.password) && (
                  <p className="text-sm text-red-600 mt-1">
                    Must include uppercase, lowercase, number, and special character.
                  </p>
                )}
              </div>

              {/* Confirm New Password */}
              <div>
                <Label htmlFor="confirmPassword" className="text-sm font-semibold mb-2">
                  Confirm New Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword || ''}
                    onChange={(e) => setFormData({ confirmPassword: e.target.value })}
                    placeholder="Confirm new password"
                    className="h-14 pr-11"
                  />
                  <button type="button" onClick={toggleConfirmPassword} className="absolute right-3 top-4 text-gray-400">
                    {showConfirmPassword ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                  </button>
                </div>
                {formData.confirmPassword && formData.confirmPassword !== formData.password && (
                  <p className="text-sm text-red-600 mt-1">Passwords do not match.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {!isSettingsPage && (
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
      )}
    </div>
  )
}