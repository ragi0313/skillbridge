"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Shield, Mail, CheckCircle2, AlertCircle } from "lucide-react"
import { toast } from "sonner"

export function AuthenticationSection() {
  const [is2FAEnabled, setIs2FAEnabled] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isToggling, setIsToggling] = useState(false)

  useEffect(() => {
    fetch2FAStatus()
  }, [])

  const fetch2FAStatus = async () => {
    try {
      const response = await fetch("/api/auth/2fa/status")
      if (response.ok) {
        const data = await response.json()
        setIs2FAEnabled(data.isEnabled)
      }
    } catch (error) {
      console.error("Error fetching 2FA status:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handle2FAToggle = async (enabled: boolean) => {
    setIsToggling(true)
    try {
      const endpoint = enabled ? "/api/auth/2fa/enable" : "/api/auth/2fa/disable"
      const response = await fetch(endpoint, {
        method: "POST",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to ${enabled ? "enable" : "disable"} 2FA`)
      }

      setIs2FAEnabled(enabled)
      toast.success(
        enabled ? "Two-factor authentication enabled" : "Two-factor authentication disabled",
        {
          description: enabled
            ? "You'll receive a verification code via email on your next login."
            : "You will no longer need a verification code to log in.",
        }
      )
    } catch (error: any) {
      toast.error("Error", {
        description: error.message || "An unexpected error occurred.",
      })
      // Revert toggle on error
      setIs2FAEnabled(!enabled)
    } finally {
      setIsToggling(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Two-Factor Authentication */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <CardTitle>Two-Factor Authentication</CardTitle>
          </div>
          <CardDescription>
            Add an extra layer of security to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
            <div className="flex-1 space-y-1">
              <Label
                htmlFor="2fa-toggle"
                className="text-sm font-medium text-gray-900 cursor-pointer flex items-center gap-2"
              >
                <Mail className="h-4 w-4 text-gray-500" />
                Email Verification Code
              </Label>
              <p className="text-sm text-gray-600">
                Receive a verification code via email when signing in from a new device
              </p>
            </div>
            <Switch
              id="2fa-toggle"
              checked={is2FAEnabled}
              onCheckedChange={handle2FAToggle}
              disabled={isLoading || isToggling}
            />
          </div>

          {is2FAEnabled && (
            <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-900">
                  Two-factor authentication is active
                </p>
                <p className="text-sm text-green-700 mt-1">
                  Your account is protected with email verification. You'll receive a code each time you log in.
                </p>
              </div>
            </div>
          )}

          {!is2FAEnabled && !isLoading && (
            <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-900">
                  Two-factor authentication is disabled
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  Enable 2FA to add extra security to your account. This helps protect against unauthorized access.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Tips */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-base">Security Best Practices</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>Use a strong, unique password for your account</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>Enable two-factor authentication for added protection</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>Never share your login credentials with anyone</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>Log out when using shared or public computers</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
