"use client"

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import SignupLayout from "@/components/register/SignupLayout";
import SignupHeader from "@/components/register/SignupHeader";
import Link from "next/link";
import { usePasswordVisibility } from "@/app/hooks/usePasswordVisibility";

const Login = () => {
  const [formData, setFormData] = useState({ email: "", password: "" })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const { showPassword, togglePassword } = usePasswordVisibility()

  const isFormValid = formData.email.trim() && formData.password.trim()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isFormValid) return

    setIsLoading(true)
    setError("")

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.message || "Invalid credentials")

      // Redirect based on role
      switch (data.role) {
        case "learner":
          router.push("/learner/dashboard")
          break
        case "mentor":
          router.push("/mentor/dashboard")
          break
        case "admin":
          router.push("/admin/dashboard")
          break
        default:
          router.push("/")
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <SignupLayout currentStep={1}>
      <SignupHeader />
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          <div className="mb-8 mt-10 lg:mt-0">
            <h1 className="font-extrabold mb-4 text-4xl">Welcome</h1>
            <p className="text-gray-600 text-lg">
              Sign in to your SkillBridge account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="email" className="mb-2">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="Enter your email"
                className="h-14"
                required
              />
            </div>

            <div>
              <Label htmlFor="password" className="mb-2">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder="Enter your password"
                  className="h-14 pr-11"
                  required
                />
                <button
                  type="button"
                  onClick={togglePassword}
                  className="absolute right-3 top-4 text-gray-400"
                >
                  {showPassword ? (
                    <EyeOff className="w-6 h-6" />
                  ) : (
                    <Eye className="w-6 h-6" />
                  )}
                </button>
              </div>
              <div className="flex justify-end mt-2">
                <Link
                  href="/forgot-password"
                  className="text-sm text-blue-600 hover:underline font-medium"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 font-medium">{error}</p>
            )}

            <Button
              type="submit"
              disabled={!isFormValid || isLoading}
              className="w-full h-14 gradient-bg text-white font-semibold text-base rounded-lg"
            >
              {isLoading ? "Signing in..." : "Login"}
            </Button>

            <div className="text-center pt-4">
              <p className="text-gray-600">
                Don&apos;t have an account?{" "}
                <Link
                  href="/register"
                  className="font-medium text-blue-600 hover:underline"
                >
                  Sign up
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </SignupLayout>
  )
}

export default Login
