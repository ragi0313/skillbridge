"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { creditPackages } from "@/lib/payments/creditPackages"
import { useState, useEffect } from "react"

// Define the package type
type CreditPackage = {
  id: string
  name: string
  credits: number
  price: number
}

export default function CheckoutPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null)
  const [localPrice, setLocalPrice] = useState<{ 
    amount: number; 
    currency: string; 
    country?: string;
    originalPrice?: number;
    detectedCurrency?: string;
  } | null>(null)
  const [priceLoading, setPriceLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const packageId = searchParams.get("package")

  useEffect(() => {
    const pkg = creditPackages.find((p) => p.id === packageId)
    if (!pkg) {
      router.replace("/credits-pricing")
      return
    }
    setSelectedPackage(pkg)
  }, [packageId, router])

  useEffect(() => {
    const fetchLocalPrice = async () => {
      if (!selectedPackage) return

      setPriceLoading(true)
      setError(null)
      
      try {
        const requestBody = {
          packageId: selectedPackage.id,
          getLocalizedPriceOnly: true,
        }

        const res = await fetch("/api/credits/create-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        })

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`)
        }

        const data = await res.json()

        if (data.amount && data.currency) {
          setLocalPrice({
            amount: data.amount,
            currency: data.currency,
            country: data.country,
            originalPrice: data.originalPrice,
            detectedCurrency: data.detectedCurrency
          })
        } else {
          throw new Error("Invalid price data received")
        }
      } catch (err) {
        console.error("Failed to fetch localized price", err)
        setError("Failed to load pricing information")
        
        // Fallback to USD price
        setLocalPrice({
          amount: selectedPackage.price,
          currency: "USD",
          originalPrice: selectedPackage.price
        })
      } finally {
        setPriceLoading(false)
      }
    }

    fetchLocalPrice()
  }, [selectedPackage])

  const handlePurchase = async () => {
    if (!selectedPackage) return
    
    setLoading(true)
    setError(null)

    try {
      const requestBody = {
        packageId: selectedPackage.id,
      }

      const res = await fetch("/api/credits/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || `HTTP error! status: ${res.status}`)
      }

      const data = await res.json()

      if (data.url) {
        // Redirect to Xendit payment page
        window.location.href = data.url
      } else {
        throw new Error("No payment URL received")
      }
    } catch (err) {
      console.error("Payment error:", err)
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (!selectedPackage) {
    return (
      <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
        <div className="text-center text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">
        Confirm Purchase
      </h1>
      
      <div className="space-y-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="mb-2">
            <span className="font-semibold text-gray-700">Package:</span>{" "}
            <span className="text-gray-900">{selectedPackage.name}</span>
          </div>
          
          <div className="mb-2">
            <span className="font-semibold text-gray-700">Credits:</span>{" "}
            <span className="text-gray-900">{selectedPackage.credits.toLocaleString()}</span>
          </div>
          
          <div>
            <span className="font-semibold text-gray-700">Amount:</span>{" "}
            {priceLoading ? (
              <span className="text-blue-600">Loading price...</span>
            ) : localPrice ? (
              <div>
                <span className="text-xl font-bold text-green-600">
                  {localPrice.currency} {localPrice.amount.toLocaleString()}
                </span>
                {localPrice.country && (
                  <div className="text-sm text-gray-600 mt-1">
                    Pricing for: {localPrice.country}
                  </div>
                )}
                {localPrice.detectedCurrency && localPrice.detectedCurrency !== localPrice.currency && (
                  <div className="text-xs text-amber-600 mt-1">
                    Detected {localPrice.detectedCurrency}, using {localPrice.currency} (supported by payment processor)
                  </div>
                )}
                {localPrice.originalPrice && localPrice.currency !== "USD" && (
                  <div className="text-sm text-gray-500 mt-1">
                    Original: ${localPrice.originalPrice} USD
                  </div>
                )}
              </div>
            ) : (
              <span className="text-gray-900">
                ${selectedPackage.price.toFixed(2)} USD
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handlePurchase}
          disabled={loading || priceLoading}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition duration-200"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Redirecting to Payment...
            </div>
          ) : (
            "Proceed to Payment"
          )}
        </button>

        <div className="text-center">
          <button
            onClick={() => router.back()}
            className="text-gray-500 hover:text-gray-700 text-sm underline"
          >
            ← Back to packages
          </button>
        </div>
      </div>
    </div>
  )
}