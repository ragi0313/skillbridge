import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, CheckCircle, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"

export default function LearnerBasicInfo({ formData, setFormData, nextStep }: any) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="fullName" className="text-sm font-semibold text-gray-700 mb-2 block">
          Full Name*
        </Label>
        <div className="relative">
          <User className="absolute left-3 top-4 h-5 w-5 text-gray-400" />
          <Input
            id="fullName"
            placeholder="Enter your full name"
            value={`${formData.firstName} ${formData.lastName}`.trim()}
            onChange={(e) => {
              const names = e.target.value.split(" ")
              setFormData({
                ...formData,
                firstName: names[0] || "",
                lastName: names.slice(1).join(" ") || "",
              })
            }}
            className="pl-11 h-14 text-base border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="email" className="text-sm font-semibold text-gray-700 mb-2 block">
          Email Address*
        </Label>
        <div className="relative">
          <Input
            id="email"
            type="email"
            placeholder="Enter your email address"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="h-14 text-base border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg pr-11"
            required
          />
          {formData.email && formData.email.includes("@") && (
            <CheckCircle className="absolute right-3 top-4 h-6 w-6 text-green-500" />
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="password" className="text-sm font-semibold text-gray-700 mb-2 block">
          Password*
        </Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Create a strong password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="h-14 text-base pr-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-4 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <EyeOff className="h-6 w-6" /> : <Eye className="h-6 w-6" />}
          </button>
        </div>
      </div>

      <div>
        <Label htmlFor="confirmPassword" className="text-sm font-semibold text-gray-700 mb-2 block">
          Confirm Password*
        </Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            className="h-14 text-base pr-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
            required
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-4 text-gray-400 hover:text-gray-600"
          >
            {showConfirmPassword ? <EyeOff className="h-6 w-6" /> : <Eye className="h-6 w-6" />}
          </button>
        </div>
      </div>

      <Button
        type="button"
        onClick={nextStep}
        className="w-full h-14 gradient-bg text-white font-semibold text-base rounded-lg transition-all"
      >
        Continue
      </Button>
    </div>
  )
}
