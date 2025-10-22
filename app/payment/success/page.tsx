"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, Loader2, AlertTriangle } from "lucide-react"

export default function PaymentSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<"checking" | "success" | "pending" | "error">("checking")
  const [credits, setCredits] = useState<number | null>(null)
  const [message, setMessage] = useState("")

  useEffect(() => {
    const checkPaymentStatus = async () => {
      try {
        // Get parameters from Xendit redirect
        const externalId = searchParams.get("external_id")
        const invoiceId = searchParams.get("invoice_id")

        if (!externalId && !invoiceId) {
          // Generic success page without specific invoice details
          setStatus("success")
          setMessage("Payment received! Your credits are being processed.")
          return
        }

        // Wait a moment for webhook to process
        await new Promise(resolve => setTimeout(resolve, 2000))

        // Check if credits were added by fetching user profile
        const response = await fetch("/api/learner/me")
        if (response.ok) {
          const userData = await response.json()
          setCredits(userData.learner?.creditsBalance || null)
          setStatus("success")
          setMessage("Your credits have been added successfully!")
        } else {
          // Still processing
          setStatus("pending")
          setMessage("Your payment is being processed. Credits will be added shortly.")
        }
      } catch (error) {
        console.error("Error checking payment status:", error)
        setStatus("pending")
        setMessage("Your payment is being processed. Please check your dashboard in a few moments.")
      }
    }

    checkPaymentStatus()
  }, [searchParams])

  const handleContinue = () => {
    router.push("/learner")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          {status === "checking" && (
            <>
              <Loader2 className="h-16 w-16 text-blue-600 animate-spin mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Processing Payment...
              </h2>
              <p className="text-gray-600">
                Please wait while we confirm your payment
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Payment Successful!
              </h2>
              <p className="text-gray-600 mb-4">{message}</p>
              {credits !== null && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-gray-600 mb-1">Your Credit Balance</p>
                  <p className="text-3xl font-bold text-blue-600">{credits} Credits</p>
                </div>
              )}
              <Button onClick={handleContinue} className="w-full">
                Go to Dashboard
              </Button>
            </>
          )}

          {status === "pending" && (
            <>
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Loader2 className="h-10 w-10 text-yellow-600 animate-spin" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Payment Processing
              </h2>
              <p className="text-gray-600 mb-6">{message}</p>
              <Button onClick={handleContinue} variant="outline" className="w-full">
                Go to Dashboard
              </Button>
              <p className="text-xs text-gray-500 mt-4">
                Credits typically appear within 1-2 minutes
              </p>
            </>
          )}

          {status === "error" && (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="h-10 w-10 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Unable to Verify Payment
              </h2>
              <p className="text-gray-600 mb-6">
                We couldn't verify your payment status. Please check your dashboard or contact support.
              </p>
              <Button onClick={handleContinue} className="w-full">
                Go to Dashboard
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
