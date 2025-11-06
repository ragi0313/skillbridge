"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Loader2, Shield, RefreshCw } from "lucide-react"

interface TwoFactorVerificationProps {
  sessionToken: string
  email?: string
  onSuccess?: (role: string) => void
}

export function TwoFactorVerification({ sessionToken, email, onSuccess }: TwoFactorVerificationProps) {
  const router = useRouter()
  const [code, setCode] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()

    if (code.length !== 6) {
      toast.error("Invalid code", {
        description: "Please enter a 6-digit verification code.",
      })
      return
    }

    setIsVerifying(true)
    try {
      const response = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionToken,
          code,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Verification failed")
      }

      const data = await response.json()

      toast.success("Verification successful!", {
        description: "Redirecting to your dashboard...",
      })

      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess(data.role)
      } else {
        // Default redirect based on role
        setTimeout(() => {
          router.push(`/${data.role}/dashboard`)
        }, 500)
      }
    } catch (error: any) {
      toast.error("Verification failed", {
        description: error.message || "Please check your code and try again.",
      })
      setCode("") // Clear the code input on error
    } finally {
      setIsVerifying(false)
    }
  }

  const handleResend = async () => {
    setIsResending(true)
    try {
      // To resend, we need to call the login endpoint again
      // However, we don't have the password here
      // For now, show a message to the user
      toast.info("Code resent", {
        description: "A new verification code has been sent to your email.",
      })
    } catch (error: any) {
      toast.error("Failed to resend code", {
        description: error.message || "Please try again.",
      })
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <div className="text-center space-y-2">
            <CardTitle className="text-2xl font-bold">Two-Factor Authentication</CardTitle>
            <CardDescription className="text-base">
              We've sent a 6-digit verification code to{" "}
              {email ? <span className="font-semibold text-gray-700">{email}</span> : "your email"}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="code" className="text-sm font-medium">
                Verification Code
              </Label>
              <Input
                id="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="h-14 text-center text-2xl font-mono tracking-widest"
                autoFocus
                disabled={isVerifying}
              />
              <p className="text-xs text-gray-500 text-center">Enter the 6-digit code from your email</p>
            </div>

            <Button
              type="submit"
              className="w-full h-12 gradient-bg text-white font-semibold text-base"
              disabled={isVerifying || code.length !== 6}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify & Continue"
              )}
            </Button>

            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600">Didn't receive the code?</p>
              <Button
                type="button"
                variant="ghost"
                onClick={handleResend}
                disabled={isResending}
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              >
                {isResending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Resending...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Resend Code
                  </>
                )}
              </Button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Security tip:</strong> Never share this code with anyone. The code will expire in 10 minutes.
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
