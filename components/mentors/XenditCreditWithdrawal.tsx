"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, DollarSign, CreditCard, Clock, CheckCircle, XCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "sonner"

interface WithdrawalData {
  totalCredits: number
  availableCredits: number
  pendingWithdrawalCredits: number
  withdrawals: Array<{
    id: number
    creditsAmount: number
    phpAmount: string
    platformFee: string
    netAmount: string
    status: string
    payoutMethod: string
    createdAt: string
    processedAt: string | null
    completedAt: string | null
    failureReason: string | null
  }>
  conversionRate: number
  withdrawalFeePercentage: number
  minimumWithdrawal: number
}

const philippineBanks = [
  { code: 'BPI', name: 'Bank of the Philippine Islands' },
  { code: 'BDO', name: 'Banco de Oro' },
  { code: 'METRO_BANK', name: 'Metropolitan Bank' },
  { code: 'UNION_BANK', name: 'Union Bank of the Philippines' },
  { code: 'PNB', name: 'Philippine National Bank' },
  { code: 'SECURITY_BANK', name: 'Security Bank' },
  { code: 'RCBC', name: 'Rizal Commercial Banking Corporation' },
  { code: 'CHINABANK', name: 'China Banking Corporation' },
  { code: 'PSB', name: 'Philippine Savings Bank' },
  { code: 'EWB', name: 'East West Banking Corporation' }
]

export function XenditCreditWithdrawal() {
  const [data, setData] = useState<WithdrawalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [withdrawing, setWithdrawing] = useState(false)
  
  // Form state
  const [creditsAmount, setCreditsAmount] = useState("")
  const [bankCode, setBankCode] = useState("")
  const [accountHolderName, setAccountHolderName] = useState("")
  const [accountNumber, setAccountNumber] = useState("")
  
  const [error, setError] = useState("")

  useEffect(() => {
    fetchWithdrawalData()
  }, [])

  const fetchWithdrawalData = async () => {
    try {
      const response = await fetch("/api/xendit/withdrawals")
      if (response.ok) {
        const result = await response.json()
        setData(result.data)
      } else {
        setError("Failed to load withdrawal data")
      }
    } catch (err) {
      setError("Failed to load withdrawal data")
    } finally {
      setLoading(false)
    }
  }

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!data) return

    const credits = parseInt(creditsAmount)
    
    if (credits < data.minimumWithdrawal) {
      setError(`Minimum withdrawal is ${data.minimumWithdrawal} credits`)
      return
    }

    if (credits > data.availableCredits) {
      setError("Insufficient available credits")
      return
    }

    if (!bankCode || !accountHolderName || !accountNumber) {
      setError("Please fill in all bank details")
      return
    }

    setWithdrawing(true)
    setError("")

    try {
      const response = await fetch("/api/xendit/withdrawals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          creditsAmount: credits,
          payoutMethod: "xendit_transfer",
          bankCode,
          accountHolderName,
          accountNumber
        }),
      })

      const result = await response.json()

      if (response.ok) {
        toast.success("Credits withdrawn successfully!")
        setCreditsAmount("")
        setBankCode("")
        setAccountHolderName("")
        setAccountNumber("")
        fetchWithdrawalData() // Refresh data
      } else {
        setError(result.error || "Failed to process withdrawal")
      }
    } catch (err) {
      setError("Network error occurred")
    } finally {
      setWithdrawing(false)
    }
  }

  const calculateAmounts = (credits: number) => {
    if (!data) return { php: 0, fee: 0, net: 0 }
    
    const php = credits * data.conversionRate
    const fee = php * (data.withdrawalFeePercentage / 100)
    const net = php - fee
    
    return { php, fee, net }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-500" />
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50'
      case 'failed':
        return 'text-red-600 bg-red-50'
      case 'processing':
        return 'text-blue-600 bg-blue-50'
      default:
        return 'text-yellow-600 bg-yellow-50'
    }
  }

  if (loading) {
    return <div className="p-6">Loading withdrawal data...</div>
  }

  if (!data) {
    return <div className="p-6 text-red-500">Failed to load withdrawal data</div>
  }

  const credits = parseInt(creditsAmount) || 0
  const { php, fee, net } = calculateAmounts(credits)

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Credits</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalCredits.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available for Withdrawal</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{data.availableCredits.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Withdrawals</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{data.pendingWithdrawalCredits.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Request Withdrawal</CardTitle>
          <CardDescription>
            Withdraw your earned credits to your Philippine bank account via Xendit
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleWithdraw} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="credits">Credits Amount</Label>
                <Input
                  id="credits"
                  type="number"
                  placeholder={`Min. ${data.minimumWithdrawal} credits`}
                  value={creditsAmount}
                  onChange={(e) => setCreditsAmount(e.target.value)}
                  min={data.minimumWithdrawal}
                  max={data.availableCredits}
                />
                {credits > 0 && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    ₱{php.toFixed(2)} PHP - ₱{fee.toFixed(2)} fee = ₱{net.toFixed(2)} net
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="bank">Philippine Bank</Label>
                <Select value={bankCode} onValueChange={setBankCode}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your bank" />
                  </SelectTrigger>
                  <SelectContent>
                    {philippineBanks.map((bank) => (
                      <SelectItem key={bank.code} value={bank.code}>
                        {bank.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="accountHolder">Account Holder Name</Label>
                <Input
                  id="accountHolder"
                  placeholder="Full name as on bank account"
                  value={accountHolderName}
                  onChange={(e) => setAccountHolderName(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="accountNumber">Account Number</Label>
                <Input
                  id="accountNumber"
                  placeholder="Your bank account number"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={withdrawing || !credits || credits < data.minimumWithdrawal || credits > data.availableCredits}
              className="w-full"
            >
              {withdrawing ? "Processing..." : `Withdraw ${credits} Credits`}
            </Button>

            <div className="text-xs text-muted-foreground">
              • Processing fee: {data.withdrawalFeePercentage}%<br />
              • Processing time: 1-3 business days<br />
              • Minimum withdrawal: {data.minimumWithdrawal} credits
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Withdrawal History</CardTitle>
          <CardDescription>Your recent withdrawal transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {data.withdrawals.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No withdrawals yet</p>
          ) : (
            <div className="space-y-4">
              {data.withdrawals.map((withdrawal) => (
                <div
                  key={withdrawal.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    {getStatusIcon(withdrawal.status)}
                    <div>
                      <div className="font-medium">
                        {withdrawal.creditsAmount} Credits → ₱{withdrawal.netAmount}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(withdrawal.createdAt).toLocaleDateString()}
                        {withdrawal.failureReason && (
                          <span className="text-red-500 ml-2">• {withdrawal.failureReason}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(withdrawal.status)}`}>
                    {withdrawal.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}