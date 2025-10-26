"use client"

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import SignupLayout from "@/components/register/SignupLayout";
import SignupHeader from "@/components/register/SignupHeader";
import Link from "next/link";
import { usePasswordVisibility } from "@/app/hooks/usePasswordVisibility";
import { toast } from "@/lib/toast";

const Login = () => {
  const [formData, setFormData] = useState({ email: "", password: "" })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const { showPassword, togglePassword } = usePasswordVisibility()

  // Check if user is already logged in (prevent back button issues)
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/check-session', {
          method: 'GET',
          credentials: 'include',
        })

        if (response.ok) {
          const data = await response.json()
          if (data.authenticated && data.role) {
            // User is already logged in, redirect to their dashboard
            const destination = data.role === 'admin' ? '/admin/dashboard' : `/${data.role}`
            router.replace(destination)
          }
        }
      } catch (error) {
        // Not logged in or error checking - continue showing login page
      }
    }

    checkAuth()
  }, [router])

  const isFormValid = formData.email.trim() && formData.password.trim()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isFormValid) return

    setIsLoading(true)
    setError("")

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        // Handle specific error cases for banned/suspended users
        if (res.status === 403) {
          if (data.status === 'blacklisted') {
            toast.error(
              `🚨 Account Blacklisted\n\n${data.error}\n\nReason: ${data.reason}\n\n📧 Check your email for appeal instructions!`,
              {
                duration: 8000,
                style: {
                  background: '#fee2e2',
                  border: '1px solid #fecaca',
                  color: '#dc2626',
                  fontSize: '14px',
                  maxWidth: '500px',
                },
              }
            )
            setError(`Your account has been blacklisted. Check your email for appeal instructions.`)
            // Show appeal link in the UI
            setTimeout(() => {
              const appealLink = document.createElement('div')
              appealLink.innerHTML = `
                <p class="mt-2 text-sm">
                  <a href="/appeal" class="text-blue-600 hover:underline font-medium">
                    → Submit an appeal online
                  </a>
                </p>
              `
              const errorElement = document.querySelector('.text-red-600')
              if (errorElement && errorElement.parentNode) {
                errorElement.parentNode.insertBefore(appealLink, errorElement.nextSibling)
              }
            }, 100)
            return
          } else if (data.status === 'suspended') {
            const suspensionEnd = new Date(data.suspensionEndsAt).toLocaleDateString("en-US", {
              weekday: 'short',
              year: "numeric",
              month: "short",
              day: "numeric",
            })
            toast.error(
              `⏸️ Account Suspended\n\n${data.error}\n\nReason: ${data.reason}\nEnds: ${suspensionEnd}\n\n📧 Check your email for appeal instructions!`,
              {
                duration: 8000,
                style: {
                  background: '#fef3c7',
                  border: '1px solid #fde68a',
                  color: '#d97706',
                  fontSize: '14px',
                  maxWidth: '500px',
                },
              }
            )
            setError(`Your account is suspended until ${suspensionEnd}. Check your email for details.`)
            // Show appeal link in the UI
            setTimeout(() => {
              const appealLink = document.createElement('div')
              appealLink.innerHTML = `
                <p class="mt-2 text-sm">
                  <a href="/appeal" class="text-blue-600 hover:underline font-medium">
                    → Submit an appeal online
                  </a>
                </p>
              `
              const errorElement = document.querySelector('.text-red-600')
              if (errorElement && errorElement.parentNode && !document.querySelector('a[href="/appeal"]')) {
                errorElement.parentNode.insertBefore(appealLink, errorElement.nextSibling)
              }
            }, 100)
            return
          }
        }
        
        throw new Error(data.message || data.error || "Invalid credentials")
      }

      // Show success toast
      toast.success("✅ Login successful! Redirecting...", {
        duration: 2000,
      })

      // Small delay for better UX
      setTimeout(() => {
        // Use router.replace instead of router.push to prevent back button issues
        switch (data.role) {
          case "learner":
            router.replace("/learner")
            break
          case "mentor":
            router.replace("/mentor")
            break
          case "admin":
            router.replace("/admin/dashboard")
            break
          default:
            router.replace("/")
        }
      }, 500)
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
              Sign in to your BridgeMentor account
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
