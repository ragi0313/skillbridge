"use client"

import React, { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import countries from "world-countries"
import ProfilePictureUpload from "../ProfilePictureUpload"
import { Eye, EyeOff, CheckCircle } from "lucide-react"

type FormData = {
  firstName: string
  lastName: string
  email: string
  country: string
  password: string
  confirmPassword: string
  profilePicture: File | null
}

type Props = {
  formData: FormData
  setFormData: (data: Partial<FormData>) => void
  nextStep: () => void
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/

export default function MentorBasicInfo({ formData, setFormData, nextStep }: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null)

  const countryOptions = countries.map((country) => ({
    value: country.cca2,
    label: country.name.common,
  }))

  useEffect(() => {
    const checkEmail = setTimeout(async () => {
      if (!formData.email || !emailRegex.test(formData.email)) {
        setEmailAvailable(null)
        return
      }

      try {
        const res = await fetch("/api/check-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: formData.email }),
        })
        const data = await res.json()
        // Fixed: API returns 'exists', we need 'available' (opposite)
        setEmailAvailable(!data.exists)
      } catch {
        setEmailAvailable(null)
      }
    }, 500)

    return () => clearTimeout(checkEmail)
  }, [formData.email])

  const isFormValid = () =>
    formData.firstName &&
    formData.lastName &&
    emailRegex.test(formData.email) &&
    emailAvailable === true &&
    formData.country &&
    formData.profilePicture &&
    passwordRegex.test(formData.password) &&
    formData.password === formData.confirmPassword 

  return (
    <div className="space-y-6">
      <ProfilePictureUpload
        value={formData.profilePicture}
        onChange={(file) => setFormData({ profilePicture: file })}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName" className="mb-2">
            First Name*
          </Label>
          <Input
            id="firstName"
            placeholder="Enter your first name"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            className="h-14"
            required
          />
        </div>
        <div>
          <Label htmlFor="lastName" className="mb-2">
            Last Name*
          </Label>
          <Input
            id="lastName"
            placeholder="Enter your last name"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
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
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Enter your email"
              className="h-14 pr-11"
              required
            />
            {emailRegex.test(formData.email) && emailAvailable === true && (
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
          <Select value={formData.country} onValueChange={(value) => setFormData({ ...formData, country: value })}>
            <SelectTrigger className="w-full text-base border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-sm"
            style={{ height: "48px" }}
            >
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
        <Label htmlFor="password" className="mb-2">
          Password*
        </Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Create a strong password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className={`h-14 pr-11 ${
              formData.password && !passwordRegex.test(formData.password) ? "border-red-500" : ""
            }`}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-4 text-gray-400"
          >
            {showPassword ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
          </button>
        </div>
        {formData.password && !passwordRegex.test(formData.password) && (
          <p className="mt-1 text-sm text-red-600">Must include uppercase, lowercase, number, and special character.</p>
        )}
      </div>

      <div>
        <Label htmlFor="confirmPassword" className="mb-2">
          Confirm Password*
        </Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            className="h-14 pr-11"
            required
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-4 text-gray-400"
          >
            {showConfirmPassword ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
          </button>
        </div>
        {formData.confirmPassword && formData.confirmPassword !== formData.password && (
          <p className="mt-1 text-sm text-red-600">Passwords do not match.</p>
        )}
       </div>
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
