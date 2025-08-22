"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { DollarSign, CreditCard, Building, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { toast } from "@/lib/toast"

interface WithdrawalRequest {
  id: number
  requestedCredits: number
  requestedAmountUsd: string
  status: string
  payoutMethod: string
  createdAt: string
  processedAt?: string
  adminNotes?: string
}

interface WithdrawalSummary {
  availableCredits: number
  pendingCredits: number
  withdrawableCredits: number
  totalFeesPaid: number
}

export function WithdrawalRequest() {
  const [requests, setRequests] = useState<WithdrawalRequest[]>([])
  const [summary, setSummary] = useState<WithdrawalSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showRequestForm, setShowRequestForm] = useState(false)

  // Form state
  const [requestedCredits, setRequestedCredits] = useState("")
  const [payoutMethod, setPayoutMethod] = useState("")
  const [payoutDetails, setPayoutDetails] = useState({
    accountNumber: "",
    routingNumber: "",
    accountHolderName: "",
    country: "US"
  })

  useEffect(() => {
    fetchWithdrawals()
  }, [])

  const fetchWithdrawals = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/withdrawals')
      
      if (!response.ok) {
        throw new Error('Failed to fetch withdrawals')
      }

      const data = await response.json()
      setRequests(data.requests || [])
      setSummary(data.summary || null)
    } catch (error) {
      console.error('Error fetching withdrawals:', error)
      toast.error('Failed to load withdrawal data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmitWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!requestedCredits || !payoutMethod) {
      toast.error('Please fill in all required fields')
      return
    }

    const credits = parseInt(requestedCredits)
    if (credits <= 0 || (summary && credits > summary.withdrawableCredits)) {
      toast.error('Invalid withdrawal amount')
      return
    }

    try {
      setIsSubmitting(true)
      
      const response = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestedCredits: credits,
          payoutMethod,
          payoutDetails
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create withdrawal request')
      }

      toast.success('Withdrawal request submitted successfully!')
      setShowRequestForm(false)
      setRequestedCredits("")
      setPayoutMethod("")
      setPayoutDetails({
        accountNumber: "",
        routingNumber: "",
        accountHolderName: "",
        country: "US"
      })
      
      // Refresh data
      await fetchWithdrawals()
    } catch (error) {
      console.error('Error submitting withdrawal:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to submit withdrawal request')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'approved':
      case 'processing':
        return <AlertCircle className="h-4 w-4 text-blue-500" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'rejected':
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'approved':
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'rejected':
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded-lg"></div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Available Credits</p>
                  <p className="text-2xl font-bold text-green-600">{summary.availableCredits}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending Withdrawals</p>
                  <p className="text-2xl font-bold text-yellow-600">{summary.pendingCredits}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Withdrawable</p>
                  <p className="text-2xl font-bold text-blue-600">{summary.withdrawableCredits}</p>
                </div>
                <CreditCard className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Platform Fees</p>
                  <p className="text-2xl font-bold text-gray-600">{summary.totalFeesPaid}</p>
                </div>
                <Building className="h-8 w-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Withdrawal Request Form */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Withdraw Credits</CardTitle>
              <CardDescription>
                Request to withdraw your earned credits. Minimum withdrawal: 10 credits
              </CardDescription>
            </div>
            {!showRequestForm && (
              <Button 
                onClick={() => setShowRequestForm(true)}
                disabled={!summary || summary.withdrawableCredits < 10}
              >
                Request Withdrawal
              </Button>
            )}
          </div>
        </CardHeader>

        {showRequestForm && (
          <CardContent>
            <form onSubmit={handleSubmitWithdrawal} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="credits">Credits to Withdraw</Label>
                  <Input
                    id="credits"
                    type="number"
                    min="10"
                    max={summary?.withdrawableCredits || 0}
                    value={requestedCredits}
                    onChange={(e) => setRequestedCredits(e.target.value)}
                    placeholder="Enter amount"
                    required
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Available: {summary?.withdrawableCredits || 0} credits
                  </p>
                </div>

                <div>
                  <Label htmlFor="method">Payout Method</Label>
                  <Select value={payoutMethod} onValueChange={setPayoutMethod} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="stripe_connect">Stripe Direct</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {payoutMethod === "bank_transfer" && (
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium">Bank Account Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="accountHolder">Account Holder Name</Label>
                      <Input
                        id="accountHolder"
                        value={payoutDetails.accountHolderName}
                        onChange={(e) => setPayoutDetails(prev => ({ ...prev, accountHolderName: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="accountNumber">Account Number</Label>
                      <Input
                        id="accountNumber"
                        value={payoutDetails.accountNumber}
                        onChange={(e) => setPayoutDetails(prev => ({ ...prev, accountNumber: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="routingNumber">Routing Number</Label>
                      <Input
                        id="routingNumber"
                        value={payoutDetails.routingNumber}
                        onChange={(e) => setPayoutDetails(prev => ({ ...prev, routingNumber: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {payoutMethod === "stripe_connect" && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900">Stripe Direct Deposit</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Funds will be transferred directly to your connected Stripe account
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Submitting..." : "Submit Request"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowRequestForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        )}
      </Card>

      {/* Withdrawal History */}
      <Card>
        <CardHeader>
          <CardTitle>Withdrawal History</CardTitle>
          <CardDescription>Track your withdrawal requests and their status</CardDescription>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No withdrawal requests yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    {getStatusIcon(request.status)}
                    <div>
                      <p className="font-medium">
                        {request.requestedCredits} credits (${request.requestedAmountUsd})
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(request.createdAt).toLocaleDateString()} • {request.payoutMethod.replace('_', ' ')}
                      </p>
                      {request.adminNotes && (
                        <p className="text-sm text-gray-600 mt-1">Note: {request.adminNotes}</p>
                      )}
                    </div>
                  </div>
                  <Badge className={getStatusColor(request.status)}>
                    {request.status.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}