"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Mail } from "lucide-react"
import Logo from "@/components/ui/logo"
import { toast } from "sonner"
import SignupLayout from "@/components/register/SignupLayout"
import SignupHeader from "@/components/register/SignupHeader"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(true)
        toast.success("Check your email for the verification code.")
        setTimeout(() => {
          router.push(`/forgot-password/verify?email=${encodeURIComponent(email)}`)
        }, 2000)
      } else {
        setError(data.error || "Failed to send reset code")
      }
    } catch (error) {
      setError("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }


  return (
    <SignupLayout currentStep={1}>
      <SignupHeader />
      <div className="flex-1 flex items-center justify-center px-6">
      <div className="w-full max-w-md mt-20 lg:mt-0">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Reset Password</h1>
          <p className="text-gray-600 mt-2">Enter your email to receive a verification code</p>
        </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-14"
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full h-14 gradient-bg text-white font-semibold text-base rounded-lg" 
              disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending code...
                  </>
                ) : (
                  "Send verification code"
                )}
              </Button>


            </CardFooter>
          </form>
      </div>
    </div>
    </SignupLayout>
  )
}
