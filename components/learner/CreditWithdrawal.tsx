"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { DollarSign, CreditCard, AlertCircle, CheckCircle, ArrowLeft } from "lucide-react"
import { toast } from "@/lib/toast"

interface CreditBalance {
  availableCredits: number
  canWithdraw: boolean
}

export function CreditWithdrawal() {
  const [balance, setBalance] = useState<CreditBalance | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [withdrawalAmount, setWithdrawalAmount] = useState("")
  const [showConfirmation, setShowConfirmation] = useState(false)

  // Calculate withdrawal fee
  const calculateFee = (amount: number) => {
    const WITHDRAWAL_FEE_PERCENTAGE = 0.03 // 3%
    const MIN_FEE = 2.99 // Minimum $2.99 fee
    const FREE_WITHDRAWAL_THRESHOLD = 50 // Free for withdrawals over $50

    if (amount >= FREE_WITHDRAWAL_THRESHOLD) return 0
    const percentageFee = amount * WITHDRAWAL_FEE_PERCENTAGE
    return Math.max(percentageFee, MIN_FEE)
  }

  const currentWithdrawalAmount = parseInt(withdrawalAmount) || 0
  const withdrawalFee = calculateFee(currentWithdrawalAmount)
  const totalDeduction = currentWithdrawalAmount + withdrawalFee
  const netAmount = currentWithdrawalAmount - withdrawalFee

  useEffect(() => {
    fetchCreditBalance()
  }, [])

  const fetchCreditBalance = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/learner/withdrawals')
      
      if (!response.ok) {
        throw new Error('Failed to fetch credit balance')
      }

      const data = await response.json()
      setBalance(data)
    } catch (error) {
      console.error('Error fetching credit balance:', error)
      toast.error('Failed to load credit balance')
    } finally {
      setIsLoading(false)
    }
  }

  const handleWithdrawal = async () => {
    if (!withdrawalAmount || !balance) return

    const amount = parseInt(withdrawalAmount)
    if (amount <= 0 || amount > balance.availableCredits) {
      toast.error('Invalid withdrawal amount')
      return
    }

    try {
      setIsProcessing(true)
      
      const response = await fetch('/api/learner/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ withdrawalAmount: amount })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to process withdrawal')
      }

      const result = await response.json()
      toast.success('Withdrawal processed successfully!')
      
      // Reset form and fetch updated balance
      setWithdrawalAmount("")
      setShowConfirmation(false)
      await fetchCreditBalance()
    } catch (error) {
      console.error('Error processing withdrawal:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to process withdrawal')
    } finally {
      setIsProcessing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-40 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    )
  }

  if (!balance) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Unable to load credit balance</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Credit Balance Card */}
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center space-x-2">
            <CreditCard className="h-6 w-6" />
            <span>Credit Balance</span>
          </CardTitle>
          <CardDescription>
            Your available credits from refunds and cancellations
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-blue-100 rounded-full mb-4">
            <DollarSign className="h-12 w-12 text-blue-600" />
          </div>
          <p className="text-4xl font-bold text-blue-600 mb-2">
            {balance.availableCredits}
          </p>
          <p className="text-lg text-gray-600">Credits Available</p>
          <p className="text-sm text-gray-500 mt-2">
            Equivalent to ${balance.availableCredits} USD
          </p>
        </CardContent>
      </Card>

      {/* Withdrawal Form */}
      {balance.availableCredits > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Withdraw Credits</CardTitle>
            <CardDescription>
              Request a refund of your unused credits back to your original payment method
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!balance.canWithdraw ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Minimum withdrawal amount is 10 credits. You currently have {balance.availableCredits} credits.
                </AlertDescription>
              </Alert>
            ) : !showConfirmation ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="amount">Withdrawal Amount (Credits)</Label>
                  <Input
                    id="amount"
                    type="number"
                    min="10"
                    max={balance.availableCredits}
                    value={withdrawalAmount}
                    onChange={(e) => setWithdrawalAmount(e.target.value)}
                    placeholder="Enter amount"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Available: {balance.availableCredits} credits • Minimum: 10 credits
                  </p>
                  
                  {/* Fee Information */}
                  {currentWithdrawalAmount >= 10 && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg text-sm">
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span>Withdrawal amount:</span>
                          <span className="font-medium">${currentWithdrawalAmount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Processing fee:</span>
                          <span className="font-medium">
                            {withdrawalFee === 0 ? "FREE" : `$${withdrawalFee.toFixed(2)}`}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total deducted from credits:</span>
                          <span className="font-medium">${totalDeduction.toFixed(2)}</span>
                        </div>
                        <hr className="my-2" />
                        <div className="flex justify-between font-semibold">
                          <span>You'll receive:</span>
                          <span className="text-green-600">${netAmount.toFixed(2)}</span>
                        </div>
                      </div>
                      
                      {withdrawalFee > 0 && (
                        <p className="text-xs text-blue-600 mt-2">
                          💡 Tip: Withdraw ${50 - currentWithdrawalAmount} more credits to avoid processing fees!
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <Button 
                  onClick={() => {
                    const amount = parseInt(withdrawalAmount)
                    if (amount >= 10 && totalDeduction <= balance.availableCredits) {
                      setShowConfirmation(true)
                    } else if (totalDeduction > balance.availableCredits) {
                      toast.error(`Insufficient credits. You need ${totalDeduction.toFixed(2)} credits (including fees) but only have ${balance.availableCredits}`)
                    } else {
                      toast.error('Please enter a valid amount')
                    }
                  }}
                  disabled={!withdrawalAmount || totalDeduction > balance.availableCredits}
                  className="w-full"
                >
                  Continue to Confirmation
                </Button>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Important:</strong> Withdrawals are processed as refunds to your original payment method. 
                    It may take 5-10 business days for the refund to appear in your account.
                  </AlertDescription>
                </Alert>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">Withdrawal Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Withdrawal amount:</span>
                      <span className="font-medium">${currentWithdrawalAmount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Processing fee:</span>
                      <span className="font-medium">
                        {withdrawalFee === 0 ? "FREE" : `$${withdrawalFee.toFixed(2)}`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total deducted from credits:</span>
                      <span className="font-medium">${totalDeduction.toFixed(2)}</span>
                    </div>
                    <hr className="my-2" />
                    <div className="flex justify-between font-semibold text-base">
                      <span>You'll receive:</span>
                      <span className="text-green-600">${netAmount.toFixed(2)} USD</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Remaining credits:</span>
                      <span className="font-medium">{balance.availableCredits - totalDeduction}</span>
                    </div>
                  </div>
                </div>

                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    This refund will be processed to your original payment method. Processing time: 5-10 business days.
                  </AlertDescription>
                </Alert>

                <div className="flex space-x-3">
                  <Button 
                    onClick={handleWithdrawal}
                    disabled={isProcessing}
                    className="flex-1"
                  >
                    {isProcessing ? "Processing..." : "Confirm Withdrawal"}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setShowConfirmation(false)}
                    disabled={isProcessing}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* No Credits Message */}
      {balance.availableCredits === 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-gray-500">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No Credits Available</p>
              <p className="text-sm">
                You don't have any credits to withdraw. Credits are added to your account when sessions are cancelled or refunded.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}