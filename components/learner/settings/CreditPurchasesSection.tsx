"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, Clock, CreditCard, Calendar, Hash } from "lucide-react"

interface Purchase {
  id: number
  amountCredits: number
  amountPaidUsd: string
  localAmount: string
  localCurrency: string
  provider: string
  paymentStatus: string
  paymentReference: string | null
  externalId: string
  createdAt: string
  completedAt: string | null
}

export function CreditPurchasesSection() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [currentBalance, setCurrentBalance] = useState(0)

  useEffect(() => {
    fetchPurchases()
  }, [])

  const fetchPurchases = async () => {
    try {
      const response = await fetch("/api/debug/recent-purchases")
      if (response.ok) {
        const data = await response.json()
        setPurchases(data.recentPurchases || [])
        setCurrentBalance(data.currentCredits || 0)
      } else {
        setError("Unable to load purchase history")
      }
    } catch (err) {
      setError("Connection error")
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", icon: any, label: string }> = {
      completed: { variant: "default", icon: CheckCircle, label: "Completed" },
      pending: { variant: "secondary", icon: Clock, label: "Pending" },
      failed: { variant: "destructive", icon: XCircle, label: "Failed" },
      cancelled: { variant: "outline", icon: XCircle, label: "Cancelled" }
    }

    const config = statusMap[status] || statusMap.pending
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="gap-1.5">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
            <p className="text-sm text-gray-500">Loading your purchase history...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Current Balance Card */}
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-gray-900">Current Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-blue-600">{currentBalance}</span>
            <span className="text-lg text-gray-600">credits</span>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Available for booking mentorship sessions
          </p>
        </CardContent>
      </Card>

      {/* Purchase History */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase History</CardTitle>
          <CardDescription>
            Your recent credit purchases and transaction details
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="text-center py-8">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {!error && purchases.length === 0 && (
            <div className="text-center py-12">
              <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">No purchases yet</p>
              <p className="text-sm text-gray-500 mt-1">
                Your credit purchase history will appear here
              </p>
            </div>
          )}

          {!error && purchases.length > 0 && (
            <div className="space-y-3">
              {purchases.map((purchase) => (
                <div
                  key={purchase.id}
                  className="border rounded-lg p-4 hover:border-blue-200 hover:bg-blue-50/30 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900 text-lg">
                          {purchase.amountCredits} Credits
                        </span>
                        {getStatusBadge(purchase.paymentStatus)}
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(purchase.createdAt)}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">
                        ₱{parseFloat(purchase.localAmount).toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">{purchase.localCurrency}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Transaction ID</p>
                      <div className="flex items-center gap-1 text-xs font-mono text-gray-700">
                        <Hash className="h-3 w-3" />
                        {purchase.externalId.substring(0, 20)}...
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Payment Method</p>
                      <p className="text-xs font-medium text-gray-700 capitalize">
                        {purchase.provider}
                      </p>
                    </div>
                  </div>

                  {purchase.completedAt && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-500">
                        Completed: {formatDate(purchase.completedAt)}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card className="border-gray-200 bg-gray-50">
        <CardContent className="p-4">
          <p className="text-xs text-gray-600">
            <strong>Need help?</strong> If you don't see a recent purchase or have questions about a transaction,
            please contact support with your transaction ID.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
