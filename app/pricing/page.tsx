"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2, CreditCard, Check, Zap, TrendingUp, Target } from "lucide-react"
import { creditPackages } from "@/lib/payments/creditPackages"
import UnifiedHeader from "@/components/UnifiedHeader"
import { Footer } from "@/components/landing/Footer"

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
        Get Started
      </>
    )
  }

  const getButtonStyles = (pack: any) => {
    const isDisabled = loading || checkingSession || (session && session.role !== "learner")
    const baseStyles =
      "w-full py-3 px-6 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center text-base"

    if (isDisabled) {
      return `${baseStyles} bg-gray-300 text-gray-500 cursor-not-allowed`
    }

    if (pack.popular) {
      return `${baseStyles} bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 transform hover:scale-[1.02] shadow-lg hover:shadow-xl`
    }

    return `${baseStyles} bg-white text-purple-600 border-2 border-purple-600 hover:bg-purple-50 transform hover:scale-[1.02]`
  }

  const getPackageIcon = (packId: string) => {
    if (packId === "starter" || packId === "basic") return <Target className="w-8 h-8 text-purple-600" />
    if (packId === "standard" || packId === "premium") return <Zap className="w-8 h-8 text-purple-600" />
    return <TrendingUp className="w-8 h-8 text-purple-600" />
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-purple-600" />
          <p className="text-gray-600">Loading pricing information...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50">
      <UnifiedHeader />
      <div className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Section */}
          <div className="text-center mb-16">
            <div className="inline-block mb-4">
              <span className="bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm font-semibold">
                Flexible Pricing
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
              Invest in Your Future
            </h1>
            <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Purchase credits to book sessions with expert mentors. Choose the package that fits your learning goals and budget.
            </p>

            {/* Value Props */}
            <div className="flex flex-wrap justify-center gap-6 mb-12">
              <div className="flex items-center gap-2 text-gray-700">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Check className="w-5 h-5 text-green-600" />
                </div>
                <span className="font-medium">Credits never expire</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Check className="w-5 h-5 text-blue-600" />
                </div>
                <span className="font-medium">Book any mentor</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <Check className="w-5 h-5 text-purple-600" />
                </div>
                <span className="font-medium">Secure payments</span>
              </div>
            </div>
          </div>

          {/* Pricing Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {creditPackages.map((pack) => (
              <div
                key={pack.id}
                className={`relative rounded-2xl transition-all duration-300 hover:transform hover:scale-[1.02] ${
                  pack.popular
                    ? "bg-gradient-to-br from-purple-600 to-blue-600 p-1 shadow-2xl ring-4 ring-purple-200"
                    : "bg-white shadow-lg hover:shadow-xl border border-gray-200"
                }`}
              >
                {/* Popular Badge */}
                {pack.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                    <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg">
                      🔥 MOST POPULAR
                    </div>
                  </div>
                )}

                {/* Discount Badge */}
                {pack.discount > 0 && !pack.popular && (
                  <div className="absolute -top-3 -right-3 z-10">
                    <div className="bg-red-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg">
                      SAVE {pack.discount}%
                    </div>
                  </div>
                )}

                <div className={`rounded-2xl p-8 h-full flex flex-col ${pack.popular ? "bg-white" : ""}`}>
                  {/* Package Icon and Name */}
                  <div className="mb-6">
                    <div className="flex justify-center mb-3">
                      {getPackageIcon(pack.id)}
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 text-center mb-2">
                      {pack.name}
                    </h3>
                    <p className="text-sm text-gray-600 text-center">
                      {pack.description}
                    </p>
                  </div>

                  {/* Credits Display */}
                  <div className="text-center mb-6">
                    <div className="inline-flex items-baseline justify-center mb-2">
                      <span className="text-5xl font-bold text-gray-900">{pack.credits}</span>
                      <span className="text-lg text-gray-600 ml-2">credits</span>
                    </div>
                  </div>

                  {/* Price Display */}
                  <div className="text-center mb-6 pb-6 border-b border-gray-200">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <span className="text-3xl font-bold text-gray-900">₱{pack.price.toLocaleString()}</span>
                      {pack.discount > 0 && (
                        <span className="text-lg text-gray-400 line-through">₱{pack.originalPrice.toLocaleString()}</span>
                      )}
                    </div>
                    {pack.discount > 0 && (
                      <div className="text-sm text-green-600 font-semibold">
                        Save ₱{(pack.originalPrice - pack.price).toLocaleString()}
                      </div>
                    )}
                    <div className="text-xs text-gray-500 mt-1">
                      ₱{(pack.price / pack.credits).toFixed(2)} per credit
                    </div>
                  </div>

                  {/* Features */}
                  <div className="flex-1 mb-6 space-y-3">
                    <div className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">Book sessions with any mentor</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">Credits never expire</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">Instant credit delivery</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">Secure payment processing</span>
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

          {/* FAQ Section */}
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              <div className="bg-white rounded-xl p-6 shadow-md">
                <h3 className="font-semibold text-gray-900 mb-2">How do credits work?</h3>
                <p className="text-gray-600 text-sm">
                  Each mentor sets their hourly rate in credits. When you book a session, the corresponding credits are deducted from your balance. Your credits never expire, so you can use them whenever you're ready.
                </p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-md">
                <h3 className="font-semibold text-gray-900 mb-2">What payment methods do you accept?</h3>
                <p className="text-gray-600 text-sm">
                  We accept all major credit cards, debit cards, and popular Philippine payment methods through our secure payment processor Xendit.
                </p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-md">
                <h3 className="font-semibold text-gray-900 mb-2">Can I get a refund?</h3>
                <p className="text-gray-600 text-sm">
                  Credits are non-refundable once purchased. However, if a mentor cancels a session, your credits will be automatically returned to your account for future use.
                </p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-md">
                <h3 className="font-semibold text-gray-900 mb-2">Do credits expire?</h3>
                <p className="text-gray-600 text-sm">
                  No! Your credits never expire. Purchase at your own pace and use them whenever you're ready to learn.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}