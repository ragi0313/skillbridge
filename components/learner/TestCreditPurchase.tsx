"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FlaskConical, CheckCircle, AlertTriangle } from "lucide-react"
import { toast } from "sonner"

interface TestCreditPurchaseProps {
  packageId: string
  credits: number
  onSuccess?: () => void
}

export function TestCreditPurchase({ packageId, credits, onSuccess }: TestCreditPurchaseProps) {
  const [loading, setLoading] = useState(false)

  const handleTestPurchase = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/dev/add-credits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          credits,
          packageId
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to add credits")
      }

      toast.success("Test credits added!", {
        description: `${credits} credits added to your account. New balance: ${data.newBalance}`,
      })

      // Refresh the page to show new balance
      setTimeout(() => {
        window.location.reload()
      }, 1500)

      onSuccess?.()
    } catch (error: any) {
      toast.error("Failed to add test credits", {
        description: error.message || "An error occurred"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-yellow-300 bg-yellow-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-yellow-600" />
            <CardTitle className="text-lg text-yellow-900">Test Mode</CardTitle>
          </div>
          <Badge variant="outline" className="bg-yellow-200 text-yellow-800 border-yellow-400">
            Development Only
          </Badge>
        </div>
        <CardDescription className="text-yellow-700">
          Add credits without payment for testing purposes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-2 text-sm text-yellow-800">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">This is a test feature</p>
            <p className="text-xs mt-1">
              Xendit sandbox webhooks don't include user data, so this button simulates
              a successful payment and adds credits directly.
            </p>
          </div>
        </div>

        <Button
          onClick={handleTestPurchase}
          disabled={loading}
          className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
        >
          {loading ? (
            "Adding Credits..."
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Add {credits} Test Credits
            </>
          )}
        </Button>

        <p className="text-xs text-yellow-700 text-center">
          No real payment will be charged. This creates a test purchase record.
        </p>
      </CardContent>
    </Card>
  )
}
