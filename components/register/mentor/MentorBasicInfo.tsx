"use client"

import { useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import countries from "world-countries"
import ProfilePictureUpload from "../ProfilePictureUpload"
import { Eye, EyeOff, CheckCircle, Loader2 } from "lucide-react"
import { useEmailAvailability } from "@/app/hooks/useEmailAvailability"
import { usePasswordVisibility } from "@/app/hooks/usePasswordVisibility"
import { commonTimeZones, getDefaultTimezone } from "@/lib/timeZones"

type FormData = {
  profilePicture: string | null
  firstName: string
  lastName: string
  email: string
  country: string
  password: string
  confirmPassword: string
  timezone: string
}

type Props = {
  formData: FormData
  setFormData: (data: Partial<FormData>) => void
  nextStep: () => void
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/

export default function MentorBasicInfo({ formData, setFormData, nextStep }: Props) {
  const countryOptions = countries.map((country) => ({
    value: country.cca2,
    label: country.name.common,
  }))

  const { emailAvailable, isChecking } = useEmailAvailability(formData.email)
  const {showPassword, showConfirmPassword, togglePassword, toggleConfirmPassword } = usePasswordVisibility()

  useEffect(() => {
    if (!formData.timezone) {
      const defaultTz = getDefaultTimezone()
      if (defaultTz) {
        setFormData({ timezone: defaultTz })
      }
    }
  }, [formData.timezone, setFormData])

  const isFormValid = () =>
    formData.profilePicture &&
    formData.firstName &&
    formData.lastName &&
    emailRegex.test(formData.email) &&
    emailAvailable === true &&
    formData.country &&
    passwordRegex.test(formData.password) &&
    formData.password === formData.confirmPassword
    formData.timezone 

  return (
    <div className="space-y-6">
      <ProfilePictureUpload
        value={formData.profilePicture}
        onChange={(file) => setFormData({ profilePicture: file })}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName" className="text-sm font-semibold mb-2">First Name*</Label>
          <Input
            id="firstName"
            value={formData.firstName}
            onChange={(e) => setFormData({ firstName: e.target.value })}
            className="h-12"
          />
        </div>
        <div>
          <Label htmlFor="lastName" className="text-sm font-semibold mb-2">Last Name*</Label>
          <Input
            id="lastName"
            value={formData.lastName}
            onChange={(e) => setFormData({ lastName: e.target.value })}
            className="h-12"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="email" className="text-sm font-semibold mb-2">Email Address*</Label>
          <div className="relative">
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ email: e.target.value })}
              placeholder="Enter your email"
              className="h-14 pr-11"
            />
            {emailRegex.test(formData.email) && isChecking && (
              <Loader2 className="absolute right-3 top-4 h-5 w-5 text-gray-400 animate-spin" />
            )}
            {emailRegex.test(formData.email) && !isChecking && emailAvailable && (
              <CheckCircle className="absolute right-3 top-4 h-6 w-6 text-green-500" />
            )}
          </div>
          {emailRegex.test(formData.email) && !isChecking && emailAvailable === false && (
            <p className="text-sm text-red-600 mt-1 ml-1">Email is already taken.</p>
          )}
        </div>

        <div>
          <Label htmlFor="country" className="text-sm font-semibold mb-2">Country*</Label>
          <Select value={formData.country} onValueChange={(value) => setFormData({ country: value })}>
            <SelectTrigger className="w-full text-base border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-sm" 
            style={{ height: "48px" }}>
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
        {/* Password */}
        <div>
          <Label htmlFor="password" className="mb-2">Password*</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Create a strong password"
              className={`h-14 pr-11 ${
                formData.password && !passwordRegex.test(formData.password)
                  ? "border-red-500"
                  : ""
              }`}
              required
            />
            <button
              type="button"
              onClick={togglePassword}
              className="absolute right-3 top-4 text-gray-400"
            >
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
          <Label htmlFor="confirmPassword" className="mb-2">Confirm Password*</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={formData.confirmPassword}
              onChange={(e) =>
                setFormData({ ...formData, confirmPassword: e.target.value })
              }
              placeholder="Confirm your password"
              className="h-14 pr-11"
              required
            />
            <button
              type="button"
              onClick={toggleConfirmPassword}
              className="absolute right-3 top-4 text-gray-400"
            >
              {showConfirmPassword ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
            </button>
          </div>
          {formData.confirmPassword &&
            formData.confirmPassword !== formData.password && (
              <p className="text-sm text-red-600 mt-1">Passwords do not match.</p>
            )}
        </div>
      </div>
        <div className="mb-4">
        <Label htmlFor="timezone" className="block text-sm font-medium mb-1">Timezone</Label>
        <Select
          value={formData.timezone}
          onValueChange={(value) => setFormData({ ...formData, timezone: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select your timezone" />
          </SelectTrigger>
          <SelectContent>
            {commonTimeZones.map((tz) => (
              <SelectItem key={tz.value} value={tz.value}>
                {tz.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
  )
}
