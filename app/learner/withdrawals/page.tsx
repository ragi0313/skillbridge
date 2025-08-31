"use client"

import { LearnerHeader } from "@/components/learner/Header"
import Footer from "@/components/landing/Footer"
import { WithdrawalDashboard } from "@/components/withdrawal/WithdrawalDashboard"

export default function LearnerWithdrawalsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <LearnerHeader />
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Credit Withdrawals</h1>
          <p className="text-gray-600">
            Convert your unused credits back to cash. Withdrawals are processed securely through Stripe.
          </p>
        </div>
        <WithdrawalDashboard />
      </main>
      <Footer />
    </div>
  )
}