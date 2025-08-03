"use client"

import { useEffect } from "react"
import { getDefaultTimezone, commonTimeZones } from "@/lib/timeZones"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Eye, EyeOff, CheckCircle, Loader2, AlertCircle } from "lucide-react"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { useEmailAvailability } from "@/app/hooks/useEmailAvailability"
import { usePasswordVisibility } from "@/app/hooks/usePasswordVisibility"
import countries from "world-countries"

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/

type Props = {
  formData: {
    firstName?: string
    lastName?: string
    email?: string
    country?: string
    timezone?: string
    password?: string
    confirmPassword?: string
  }
  setFormData: (data: any) => void
  nextStep: () => void
}

export default function LearnerBasicInfo({ formData, setFormData, nextStep }: Props) {
  const { emailAvailable, isChecking } = useEmailAvailability(formData.email || "")
  const { showPassword, showConfirmPassword, togglePassword, toggleConfirmPassword } = usePasswordVisibility()
  
  const countryOptions = countries.map((country) => ({
    value: country.cca2,
    label: country.name.common,
  })).sort((a, b) => a.label.localeCompare(b.label))

  useEffect(() => {
    if (!formData.timezone) {
      const defaultTz = getDefaultTimezone()
      if (defaultTz) {
        setFormData({ ...formData, timezone: defaultTz })
      }
    }
  }, [formData.timezone, setFormData])

  const validateName = (name: string = "") => {
    const trimmedName = name.trim()

    const nameRegex = /^[a-zA-ZÀ-ÿ\u0100-\u017F\u0180-\u024F\u1E00-\u1EFF\s'-]+$/
    return trimmedName.length >= 2 && 
           trimmedName.length <= 50 && 
           nameRegex.test(trimmedName) &&
           !trimmedName.match(/^[\s'-]+$/) 
  }
  const validateLastName = (lastName: string = "") => {
  const trimmed = lastName.trim()

  const lastNameRegex = /^[a-zA-ZÀ-ÿ\u0100-\u017F\u0180-\u024F\u1E00-\u1EFF'-]+$/ // ⛔ no \s
  return trimmed.length >= 2 &&
         trimmed.length <= 50 &&
         lastNameRegex.test(trimmed) &&
         !/^[\'\-]+$/.test(trimmed) // must contain at least one letter
}
  const validateEmail = (email: string = "") => {
    return emailRegex.test(email.trim())
  }

  const validatePassword = (password: string = "") => {
    return passwordRegex.test(password)
  }

  const validateConfirmPassword = (password: string = "", confirmPassword: string = "") => {
    return password === confirmPassword && password.length > 0
  }

  // Validation states
  const firstNameValid = validateName(formData.firstName)
  const lastNameValid = validateLastName(formData.lastName)
  const emailValid = validateEmail(formData.email)
  const passwordValid = validatePassword(formData.password)
  const confirmPasswordValid = validateConfirmPassword(formData.password, formData.confirmPassword)
  const countryValid = !!formData.country
  const timezoneValid = !!formData.timezone

  const isFormValid =
    firstNameValid &&
    lastNameValid &&
    emailValid &&
    emailAvailable === true &&
    countryValid &&
    timezoneValid &&
    passwordValid &&
    confirmPasswordValid

  const handleContinue = () => {
    if (isFormValid && !isChecking) {
      nextStep()
    }
  }

  return (
    <div className="space-y-6">
      {/* First + Last Name */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName" className="mb-2">First Name*</Label>
          <Input
            id="firstName"
            value={formData.firstName || ""}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            placeholder="Enter your first name"
            className={`h-14 ${
              formData.firstName && !firstNameValid ? "border-red-500 focus:border-red-500" : ""
            }`}
            required
            maxLength={50}
          />
          {formData.firstName && !firstNameValid && (
            <div className="flex items-center gap-1 mt-1">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <p className="text-sm text-red-600">Name must contain letters only.</p>
            </div>
          )}
        </div>
        <div>
          <Label htmlFor="lastName" className="mb-2">Last Name*</Label>
          <Input
            id="lastName"
            value={formData.lastName || ""}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            placeholder="Enter your last name"
            className={`h-14 ${
              formData.lastName && !lastNameValid ? "border-red-500 focus:border-red-500" : ""
            }`}
            required
            maxLength={50}
          />
          {formData.lastName && !lastNameValid && (
            <div className="flex items-center gap-1 mt-1">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <p className="text-sm text-red-600">Name must contain letters only and no whitespace.</p>
            </div>
          )}
        </div>
      </div>

      {/* Email */}
      <div>
        <Label htmlFor="email" className="mb-2">Email Address*</Label>
        <div className="relative">
          <Input
            id="email"
            type="email"
            value={formData.email || ""}
            onChange={(e) => setFormData({ ...formData, email: e.target.value.toLowerCase().trim() })}
            placeholder="Enter your email"
            className={`h-14 pr-11 ${
              formData.email && !emailValid ? "border-red-500 focus:border-red-500" : ""
            }`}
            required
          />
          {emailValid && isChecking && (
            <Loader2 className="absolute right-3 top-4 h-5 w-5 text-gray-400 animate-spin" />
          )}
          {emailValid && !isChecking && emailAvailable && (
            <CheckCircle className="absolute right-3 top-4 h-6 w-6 text-green-500" />
          )}
          {emailValid && !isChecking && emailAvailable === false && (
            <AlertCircle className="absolute right-3 top-4 h-6 w-6 text-red-500" />
          )}
        </div>
        {formData.email && !emailValid && (
          <div className="flex items-center gap-1 mt-1">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <p className="text-sm text-red-600">Please enter a valid email address.</p>
          </div>
        )}
        {emailValid && !isChecking && emailAvailable === false && (
          <div className="flex items-center gap-1 mt-1">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <p className="text-sm text-red-600">Email is already taken.</p>
          </div>
        )}
      </div>

      {/* Country & Timezone */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="country" className="mb-2">Country*</Label>
          <Select
            value={formData.country || ""}
            onValueChange={(value) => setFormData({ ...formData, country: value })}
          >
            <SelectTrigger className={`w-full h-14 rounded-sm ${
              formData.country === "" ? "text-gray-400" : ""
            }`}>
              <SelectValue placeholder="Select your country" />
            </SelectTrigger>
            <SelectContent className="max-h-60 overflow-y-auto">
              {countryOptions.map((country) => (
                <SelectItem key={country.value} value={country.value}>
                  {country.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="timezone" className="mb-2">Timezone*</Label>
          <Select 
            value={formData.timezone || ""} 
            onValueChange={(value) => setFormData({ ...formData, timezone: value })}
          >
            <SelectTrigger className={`w-full h-14 rounded-sm ${
              formData.timezone === "" ? "text-gray-400" : ""
            }`}>
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

      {/* Password */}
      <div>
        <Label htmlFor="password" className="mb-2">Password*</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            value={formData.password || ""}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="Create a strong password"
            className={`h-14 pr-11 ${
              formData.password && !passwordValid ? "border-red-500 focus:border-red-500" : ""
            }`}
            required
          />
          <button
            type="button"
            onClick={togglePassword}
            className="absolute right-3 top-4 text-gray-400 hover:text-gray-600"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
          </button>
        </div>
        {formData.password && !passwordValid && (
          <div className="flex items-center gap-1 mt-1">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <p className="text-sm text-red-600">
              Must include uppercase, lowercase, number, and special character (min 8 chars).
            </p>
          </div>
        )}
        {!formData.password && (
          <p className="text-sm text-gray-500 mt-1">
            Password must be at least 8 characters with uppercase, lowercase, number, and special character.
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
            value={formData.confirmPassword || ""}
            onChange={(e) =>
              setFormData({ ...formData, confirmPassword: e.target.value })
            }
            placeholder="Confirm your password"
            className={`h-14 pr-11 ${
              formData.confirmPassword && !confirmPasswordValid ? "border-red-500 focus:border-red-500" : ""
            }`}
            required
          />
          <button
            type="button"
            onClick={toggleConfirmPassword}
            className="absolute right-3 top-4 text-gray-400 hover:text-gray-600"
            tabIndex={-1}
          >
            {showConfirmPassword ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
          </button>
        </div>
        {formData.confirmPassword && !confirmPasswordValid && (
          <div className="flex items-center gap-1 mt-1">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <p className="text-sm text-red-600">Passwords do not match.</p>
          </div>
        )}
      </div>

      {/* Continue Button */}
      <Button
        type="button"
        onClick={handleContinue}
        disabled={!isFormValid || isChecking}
        className="w-full h-14 gradient-bg text-white font-semibold text-base rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isChecking ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Checking email...
          </div>
        ) : (
          "Continue"
        )}
      </Button>
    </div>
  )
}