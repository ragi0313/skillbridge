"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2, CreditCard, ArrowRight, Coins } from "lucide-react"
import { creditPackages } from "@/lib/payments/creditPackages"
import UnifiedHeader from "@/components/UnifiedHeader"

type SessionUser = {
  id: number
  role: string
  firstName: string
  lastName: string
  profilePictureUrl: string | null
}

export default function PricingPage() {
  const [loading, setLoading] = useState(false)
  const [session, setSession] = useState<SessionUser | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch("/api/auth/session")
        const data = await res.json()
        setSession(data.user)
      } catch {
        setSession(null)
      } finally {
        setCheckingSession(false)
      }
    }
    fetchSession()
  }, [])

  const handleCheckout = async (packageId: string) => {
    if (!session) {
      router.push("/login")
      return
    }
    if (session.role !== "learner") {
      alert("Only learners can purchase credits.")
      return
    }
    setLoading(true)
    setSelectedPackage(packageId)
    try {
      const res = await fetch("/api/xendit/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ packageId }),
      })
      const data = await res.json()
      if (data.invoiceUrl) {
        router.push(data.invoiceUrl)
      } else {
        alert("Checkout failed.")
      }
    } catch {
      alert("Something went wrong.")
    } finally {
      setLoading(false)
      setSelectedPackage(null)
    }
  }

  const getButtonContent = (pack: any) => {
    if (loading && selectedPackage === pack.id) {
      return (
        <>
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          Processing...
        </>
      )
    }
    return (
      <>
        <CreditCard className="w-4 h-4 mr-2" />
        Buy Credits
      </>
    )
  }

  const getButtonStyles = (pack: any) => {
    const isDisabled = loading || checkingSession || (session && session.role !== "learner")
    const baseStyles =
      "w-full py-4 px-8 rounded-2xl font-semibold transition-all duration-300 flex items-center justify-center text-lg text-white"

    if (isDisabled) {
      return `${baseStyles} bg-gray-300 text-gray-500 cursor-not-allowed`
    }
    return `${baseStyles} gradient-bg transform hover:scale-[1.02] shadow-lg hover:shadow-xl focus:ring-4 focus:ring-blue-300 focus:ring-opacity-75`
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-purple-600" />
          <p className="text-gray-600">Loading pricing information...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <UnifiedHeader />
          <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 py-16 md:py-24 relative overflow-hidden">
            <div className="absolute top-0 -z-10 h-full w-full bg-white">
              <div className="absolute bottom-auto left-auto right-0 top-0 h-[500px] w-[500px] -translate-x-[30%] translate-y-[20%] rounded-full bg-[rgba(173,109,244,0.5)] opacity-50 blur-[80px]"></div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {/* Header Section */}
              <div className="text-center mb-16">
                <h1 className="text-5xl md:text-6xl font-extrabold leading-tight tracking-tight">
                  <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                    Fuel Your Growth
                     <span className="block mt-2 text-gray-900">with Flexible Credits Packages</span>
                  </span>
                </h1>
                <p className="mt-6 text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
                  Unlock personalized mentorship and skill-building opportunities. 
                  Choose a credit package that matches your ambition.
                </p>
              </div>

              {/* Pricing Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
                {creditPackages.map((pack) => (
                  <div
                    key={pack.id}
                    className={`${pack.popular ? "bg-gradient-to-br from-purple-600 to-blue-600 p-1 shadow-2xl" : "bg-white shadow-lg hover:shadow-xl"} relative rounded-3xl transition-all duration-300 hover:transform hover:scale-[1.02]`}
                  >
                    {/* Popular Badge */}
                    {pack.popular && (
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg whitespace-nowrap">
                          🔥 Most Popular
                        </div>
                      </div>
                    )}
                    {/* Discount Badge */}
                    {pack.discount > 0 && (
                      <div className="absolute -top-3 -right-3 z-10">
                        <div className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                          -{pack.discount}%
                        </div>
                      </div>
                    )}
                    <div
                      className="bg-white rounded-3xl p-10 h-full flex flex-col justify-between"
                    >
                      {/* Package Header */}
                      <div className="text-center mb-8">
                        <div className="mb-6">
                          <div className="flex items-center justify-center mb-4">
                            <Coins className="w-12 h-12 text-yellow-500 mr-3" />
                            <span className="text-4xl font-bold text-gray-800">{pack.credits}</span>
                            <span className="text-2xl text-gray-600 ml-2">Credits</span>
                          </div>
                          <div className="flex items-center justify-center space-x-3">
                            <span className="text-4xl font-bold text-gray-900">₱{pack.price}</span>
                            {pack.discount > 0 && (
                              <span className="text-2xl text-gray-400 line-through">₱{pack.originalPrice}</span>
                            )}
                          </div>
                          {pack.discount > 0 && (
                            <div className="text-lg text-green-600 font-semibold mt-2">
                              Save ₱{pack.originalPrice - pack.price} ({pack.discount}% off)
                            </div>
                          )}
                        </div>
                      </div>
                      {/* CTA Button */}
                      <button
                        className={getButtonStyles(pack)}
                        onClick={() => handleCheckout(pack.id)}
                        disabled={
                          !!loading ||
                          !!checkingSession ||
                          (session ? session.role !== "learner" : false)
                        }
                      >
                        {getButtonContent(pack)}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
    </div>
  )
}