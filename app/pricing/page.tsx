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
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ packageId }),
      })
      const data = await res.json()
      if (data.url) {
        router.push(data.url)
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
        <ArrowRight className="w-4 h-4 ml-2" />
      </>
    )
  }

  const getButtonStyles = (pack: any) => {
    const isDisabled = loading || checkingSession || (session && session.role !== "learner")
    const baseStyles =
      "w-full py-3 px-6 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center text-base md:text-lg"

    if (pack.popular) {
      return `${baseStyles} ${isDisabled ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "cursor-pointer bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 transform hover:scale-105 shadow-lg hover:shadow-xl focus:ring-4 focus:ring-purple-300 focus:ring-opacity-75"}`
    }
    return `${baseStyles} border-2 ${isDisabled ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed" : "cursor-pointer bg-white text-gray-800 border-gray-300 hover:border-purple-500 hover:text-purple-600 transform hover:scale-105 shadow-sm hover:shadow-md focus:ring-2 focus:ring-purple-200 focus:ring-opacity-50"}`
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
              <div className="text-center mb-12 md:mb-16">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 mb-4 leading-tight">
                  Flexible{" "}
                  <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    Credit Packages
                  </span>
                </h1>
                <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
                  Choose the perfect package to fuel your mentorship journey. Every $1 equals 5 credits.
                </p>
              </div>

              {/* Pricing Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
                {creditPackages.map((pack) => (
                  <div
                    key={pack.id}
                    className={`${pack.popular ? "bg-gradient-to-br from-purple-600 to-blue-600 p-1 shadow-2xl" : "bg-white shadow-xl hover:shadow-2xl"} relative rounded-2xl transition-all duration-300 hover:transform hover:scale-105`}
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
                      className={`${pack.popular ? "bg-white m-0.5" : ""} rounded-2xl p-8 h-full flex flex-col justify-between`}
                    >
                      {/* Package Header */}
                      <div className="text-center mb-6">
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">{pack.name}</h3>
                        <p className="text-gray-600 mb-4 text-sm">{pack.description}</p>
                        <div className="mb-4">
                          <div className="flex items-center justify-center space-x-2 mb-2">
                            <span className="text-5xl font-bold text-gray-900">${pack.price}</span>
                            {pack.discount > 0 && (
                              <span className="text-xl text-gray-500 line-through">${pack.originalPrice}</span>
                            )}
                          </div>

                          {pack.discount > 0 && (
                            <div className="text-sm text-green-600 font-semibold mt-1">
                              Save ${pack.originalPrice - pack.price} ({pack.discount}% off)
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-center mb-6">
                        <Coins className="w-8 h-8 text-yellow-500 mr-2" />
                        <span className="text-3xl font-bold text-gray-800">{pack.credits}</span>
                        <span className="text-xl text-gray-600 ml-2">Credits</span>
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