"use client"

import { useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import ProfilePictureUpload from "../ProfilePictureUpload"
import { Eye, EyeOff, CheckCircle, Loader2 } from "lucide-react"
import { useEmailAvailability } from "@/app/hooks/useEmailAvailability"
import { usePasswordVisibility } from "@/app/hooks/usePasswordVisibility"
import { useCountryOptions } from "@/app/hooks/useCountryOptions"
import { useFormValidation } from "@/app/hooks/useFormValidation"
import { useFormInput } from "@/app/hooks/useFormInput";
import { commonTimeZones, getDefaultTimezone } from "@/lib/timeZones"

type FormData = {
  firstName: string
  lastName: string
  email: string
  country: string
  password: string
  confirmPassword: string
  profilePictureUrl: File | null
  timezone: string
}

type Props = {
  formData: FormData
  setFormData: (data: Partial<FormData>) => void
  nextStep: () => void
}






export default function MentorBasicInfo({ formData, setFormData, nextStep }: Props) {
  // Custom hooks
  const { emailAvailable, isChecking } = useEmailAvailability(formData.email)
  const { showPassword, showConfirmPassword, togglePassword, toggleConfirmPassword } = usePasswordVisibility()
  const countryOptions = useCountryOptions()
  const { isFormValid, isPasswordValid, doPasswordsMatch, emailRegex, passwordRegex } = useFormValidation(formData, emailAvailable)
  const { updateField } = useFormInput(formData, setFormData)

  useEffect(() => {
    if (!formData.timezone) {
      const defaultTz = getDefaultTimezone()
      if (defaultTz) {
        setFormData({ ...formData, timezone: defaultTz })
      }
    }
  }, [formData.timezone, setFormData])

  return (
    <div className="space-y-6">
      <ProfilePictureUpload
        value={formData.profilePictureUrl}
        onChange={(file) => updateField('profilePictureUrl', file)}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName" className="mb-2">First Name*</Label>
          <Input
            id="firstName"
            placeholder="Enter your first name"
            value={formData.firstName}
            onChange={(e) => updateField('firstName', e.target.value)}
            className="h-14"
            required
          />
        </div>
        <div>
          <Label htmlFor="lastName" className="mb-2">Last Name*</Label>
          <Input
            id="lastName"
            placeholder="Enter your last name"
            value={formData.lastName}
            onChange={(e) => updateField('lastName', e.target.value)}
            className="h-14"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="email" className="mb-2">Email Address*</Label>
          <div className="relative">
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="Enter your email"
              className="h-14 pr-11"
              required
            />
            {isChecking && (
              <Loader2 className="absolute right-3 top-4 h-6 w-6 text-gray-400 animate-spin" />
            )}
            {!isChecking && emailRegex.test(formData.email) && emailAvailable === true && (
              <CheckCircle className="absolute right-3 top-4 h-6 w-6 text-green-500" />
            )}
          </div>
          {emailRegex.test(formData.email) && emailAvailable === false && (
            <p className="text-sm text-red-600 mt-1">Email is already taken.</p>
          )}
        </div>
        <div>
          <Label htmlFor="country" className="text-sm font-semibold text-gray-700 mb-2 block">
            Country*
          </Label>
          <Select value={formData.country} onValueChange={(value) => updateField('country', value)}>
            <SelectTrigger className="w-full text-base border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-sm" style={{ height: "48px" }}>
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="password" className="mb-2">Password*</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Create a strong password"
              value={formData.password}
              onChange={(e) => updateField('password', e.target.value)}
              className={`h-14 pr-11 ${
                formData.password && !isPasswordValid ? "border-red-500" : ""
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
             {formData.password && !passwordRegex.test(formData.password) && (
              <p className="mt-1 text-sm text-red-600">Must include uppercase, lowercase, number, and special character.</p>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="confirmPassword" className="mb-2">Confirm Password*</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={(e) => updateField('confirmPassword', e.target.value)}
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
          {formData.confirmPassword && !doPasswordsMatch && (
            <p className="mt-1 text-sm text-red-600">Passwords do not match.</p>
          )}
        </div>
      </div>
    <div className="mb-4">
  <label className="block text-sm font-medium mb-1">Timezone</label>
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
          disabled={!isFormValid}
          className="w-[15%] h-14 gradient-bg text-white font-semibold text-base rounded-lg"
        >
          Continue
        </Button>
      </div>
    </div>
  )
}