"use client"

import { creditPackages } from "@/lib/payments/creditPackages"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

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

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
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
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Buy Credits</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {creditPackages.map((pack) => {
          const isDisabled = loading || checkingSession

          return (
            <div key={pack.id} className="p-4 border rounded shadow">
              <h2 className="text-xl font-semibold mb-2">{pack.name}</h2>
              <p>{pack.credits} Credits</p>
              <p className="font-bold">${pack.price}</p>
              <button
                className={`mt-3 px-4 py-2 rounded transition ${
                  isDisabled
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
                onClick={() => handleCheckout(pack.id)}
                disabled={isDisabled}
              >
                {loading
                  ? "Redirecting..."
                  : !session
                  ? "Buy Now"
                  : session.role !== "learner"
                  ? "Learners Only"
                  : "Buy Now"}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
