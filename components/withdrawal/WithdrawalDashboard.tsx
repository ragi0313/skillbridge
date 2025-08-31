"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { DollarSign, CreditCard, Building, Clock, CheckCircle, XCircle, AlertCircle, ExternalLink } from "lucide-react"
import { toast } from "sonner"

interface WithdrawalRequest {
  id: number
  requestedCredits: number
  requestedAmountUsd: string
  status: string
  payoutMethod: string
  createdAt: string
  processedAt?: string
  completedAt?: string
  adminNotes?: string
}

interface WithdrawalSummary {
  availableCredits: number
  pendingCredits: number
  withdrawableCredits: number
  totalFeesPaid: number
  canWithdraw: boolean
  minWithdrawal: number
  conversionRate: number
}

interface StripeAccount {
  accountId: string
  chargesEnabled: boolean
  payoutsEnabled: boolean
  detailsSubmitted: boolean
  dashboardUrl?: string
  requirements: {
    currentlyDue: string[]
    eventuallyDue: string[]
    pastDue: string[]
    pendingVerification: string[]
  }
}

export function WithdrawalDashboard() {
  const [requests, setRequests] = useState<WithdrawalRequest[]>([])
  const [summary, setSummary] = useState<WithdrawalSummary | null>(null)
  const [stripeAccount, setStripeAccount] = useState<StripeAccount | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [requestedCredits, setRequestedCredits] = useState("")

  useEffect(() => {
    Promise.all([
      fetchWithdrawals(),
      fetchStripeAccount()
    ]).finally(() => setIsLoading(false))
  }, [])

  const fetchWithdrawals = async () => {
    try {
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
    }
  }

  const fetchStripeAccount = async () => {
    try {
      // Remove localStorage dependency - get account info from database via API
      const response = await fetch('/api/stripe/connect')
      
      if (response.ok) {
        const data = await response.json()
        setStripeAccount(data)
      } else if (response.status === 404) {
        // No Stripe account exists yet - this is normal for new users
        setStripeAccount(null)
      } else {
        console.error('Error fetching Stripe account:', response.statusText)
        setStripeAccount(null)
      }
    } catch (error) {
      console.error('Error fetching Stripe account:', error)
      setStripeAccount(null)
    }
  }

  const setupStripeAccount = async () => {
    try {
      setIsSubmitting(true)
      const returnUrl = `${window.location.origin}/dashboard/withdrawals?setup=complete`
      const refreshUrl = `${window.location.origin}/dashboard/withdrawals?setup=refresh`

      const response = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnUrl, refreshUrl })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to setup Stripe account')
      }

      const data = await response.json()
      // Remove localStorage - the account ID is now saved in the database
      
      // Redirect to Stripe onboarding
      window.location.href = data.onboardingUrl
    } catch (error) {
      console.error('Error setting up Stripe account:', error)
      toast.error('Failed to setup payment account')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmitWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!requestedCredits || !stripeAccount?.accountId) {
      toast.error('Please fill in all required fields and setup your payment account')
      return
    }

    const credits = parseInt(requestedCredits)
    if (credits <= 0 || (summary && credits > summary.withdrawableCredits)) {
      toast.error('Invalid withdrawal amount')
      return
    }

    if (!stripeAccount.payoutsEnabled) {
      toast.error('Your Stripe account is not ready for payouts. Please complete the setup.')
      return
    }

    try {
      setIsSubmitting(true)
      
      const response = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestedCredits: credits,
          payoutMethod: 'stripe_express',
          stripeAccountId: stripeAccount.accountId
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create withdrawal request')
      }

      const result = await response.json()
      toast.success('Withdrawal request submitted successfully!')
      
      setShowRequestForm(false)
      setRequestedCredits("")
      
      // Refresh data
      await fetchWithdrawals()
    } catch (error) {
      console.error('Error submitting withdrawal:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to submit withdrawal request')
    } finally {
      setIsSubmitting(false)
    }
  }

  const calculateWithdrawalPreview = (credits: number) => {
    if (!credits || credits <= 0 || !summary) return null

    const amountUsd = credits * summary.conversionRate
    const FEE_PERCENTAGE = 0.015 // 1.5%
    const MIN_FEE = 0.50
    const MAX_FEE_PERCENTAGE = 0.05

    const percentageFee = amountUsd * FEE_PERCENTAGE
    const maxFee = amountUsd * MAX_FEE_PERCENTAGE
    const fee = Math.min(Math.max(percentageFee, MIN_FEE), maxFee)
    const netAmount = amountUsd - fee

    return {
      grossAmount: amountUsd,
      fee: fee,
      netAmount: netAmount
    }
  }

  const preview = requestedCredits ? calculateWithdrawalPreview(parseInt(requestedCredits)) : null

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

  const needsStripeSetup = !stripeAccount || !stripeAccount.detailsSubmitted
  const hasStripeIssues = stripeAccount && (!stripeAccount.payoutsEnabled || stripeAccount.requirements.currentlyDue.length > 0)

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
                  <p className="text-sm text-gray-500">${(summary.availableCredits * summary.conversionRate).toFixed(2)}</p>
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
                  <p className="text-sm text-gray-500">${(summary.pendingCredits * summary.conversionRate).toFixed(2)}</p>
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
                  <p className="text-sm text-gray-500">${(summary.withdrawableCredits * summary.conversionRate).toFixed(2)}</p>
                </div>
                <CreditCard className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Fees Paid</p>
                  <p className="text-2xl font-bold text-gray-600">${summary.totalFeesPaid.toFixed(2)}</p>
                </div>
                <Building className="h-8 w-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Stripe Account Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Payment Account
            {stripeAccount?.dashboardUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(stripeAccount.dashboardUrl, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
                Dashboard
              </Button>
            )}
          </CardTitle>
          <CardDescription>Manage your payment account for withdrawals</CardDescription>
        </CardHeader>
        <CardContent>
          {needsStripeSetup ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You need to setup your payment account before you can withdraw funds.
                <Button 
                  className="ml-2" 
                  size="sm" 
                  onClick={setupStripeAccount}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Setting up..." : "Setup Payment Account"}
                </Button>
              </AlertDescription>
            </Alert>
          ) : hasStripeIssues ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Your payment account needs attention. 
                {stripeAccount?.requirements.currentlyDue.length > 0 && (
                  <>Required: {stripeAccount.requirements.currentlyDue.join(", ")}</>
                )}
                {stripeAccount?.dashboardUrl && (
                  <Button 
                    className="ml-2" 
                    size="sm" 
                    variant="outline"
                    onClick={() => window.open(stripeAccount.dashboardUrl, '_blank')}
                  >
                    Fix Issues
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span>Payment account is ready for withdrawals</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Withdrawal Request Form */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Withdraw Credits</CardTitle>
              <CardDescription>
                Convert your credits to cash. Rate: {summary?.conversionRate ? `$${summary.conversionRate} per credit` : '5 credits = $1'}
              </CardDescription>
            </div>
            {!showRequestForm && (
              <Button 
                onClick={() => setShowRequestForm(true)}
                disabled={!summary?.canWithdraw || needsStripeSetup || hasStripeIssues || false}
              >
                Request Withdrawal
              </Button>
            )}
          </div>
        </CardHeader>

        {showRequestForm && (
          <CardContent>
            <form onSubmit={handleSubmitWithdrawal} className="space-y-4">
              <div>
                <Label htmlFor="credits">Credits to Withdraw</Label>
                <Input
                  id="credits"
                  type="number"
                  min={summary?.minWithdrawal || 25}
                  max={summary?.withdrawableCredits || 0}
                  value={requestedCredits}
                  onChange={(e) => setRequestedCredits(e.target.value)}
                  placeholder="Enter amount"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  Available: {summary?.withdrawableCredits || 0} credits • 
                  Minimum: {summary?.minWithdrawal || 25} credits
                </p>
              </div>

              {preview && (
                <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                  <h4 className="font-medium">Withdrawal Preview</h4>
                  <div className="flex justify-between text-sm">
                    <span>Gross Amount:</span>
                    <span>${preview.grossAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Platform Fee:</span>
                    <span>-${preview.fee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-medium pt-2 border-t">
                    <span>Net Amount:</span>
                    <span>${preview.netAmount.toFixed(2)}</span>
                  </div>
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
                        {new Date(request.createdAt).toLocaleDateString()}
                        {request.completedAt && ` • Completed ${new Date(request.completedAt).toLocaleDateString()}`}
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