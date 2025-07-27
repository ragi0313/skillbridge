"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { creditPackages } from "@/lib/payments/creditPackages"

export default function CreditsPage() {
  const [session, setSession] = useState<null | {
    id: number
    role: string
    firstName: string
    lastName: string
    profilePictureUrl?: string
  }>(null)

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch("/api/auth/session")
        if (res.ok) {
          const data = await res.json()
          setSession(data.user)
        }
      } catch (error) {
        console.error("Error fetching session:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchSession()
  }, [])

  return (
    <div className="max-w-3xl mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">Buy Credits</h1>
      <div className="grid gap-6 md:grid-cols-3">
        {creditPackages.map((pkg) => (
          <div key={pkg.id} className="border rounded-xl p-6 bg-white shadow">
            <h2 className="text-lg font-semibold mb-2">{pkg.name}</h2>
            <p className="text-sm mb-4">{pkg.credits} credits</p>
            <p className="text-xl font-bold mb-4">${pkg.price}</p>

            {loading ? (
              <p>Loading...</p>
            ) : session?.role === "learner" ? (
              <Link
                href={`/credits-pricing/checkout?package=${pkg.id}`}
                className="btn-primary"
              >
                Buy Now
              </Link>
            ) : session ? (
              <p className="text-red-600 text-sm">Only learners can purchase credits.</p>
            ) : (
              <Link href={`/login?redirect=/credits-pricing`} className="btn-primary">
                Buy now
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
