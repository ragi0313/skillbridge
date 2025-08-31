"use client"

import MentorHeader from "@/components/mentor/Header"
import Footer from "@/components/landing/Footer"
import { WithdrawalDashboard } from "@/components/withdrawal/WithdrawalDashboard"

export default function MentorWithdrawalsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <MentorHeader />
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Earnings Withdrawals</h1>
          <p className="text-gray-600">
            Withdraw your earned credits from mentoring sessions. Fast, secure payments through Stripe Connect.
          </p>
        </div>
        <WithdrawalDashboard />
      </main>
      <Footer />
    </div>
  )
}