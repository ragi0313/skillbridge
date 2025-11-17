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
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6 min-h-[calc(100vh-200px)]">
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-24 bg-gray-200 rounded"></div>
                <div className="h-4 w-4 bg-gray-200 rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 w-20 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 w-40 bg-gray-200 rounded"></div>
            <div className="h-4 w-64 bg-gray-200 rounded mt-2"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto p-6 min-h-[calc(100vh-200px)] flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-red-600">Failed to load withdrawal data. Please try again.</AlertDescription>
        </Alert>
      </div>
    )
  }

  const credits = parseInt(creditsAmount) || 0
  const { php, fee, net } = calculateAmounts(credits)

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8 min-h-[calc(100vh-200px)]">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Withdrawals</h1>
        <p className="text-gray-600">Manage your earnings and request withdrawals to your bank account</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Total Credits</CardTitle>
            <div className="p-2 bg-blue-100 rounded-lg">
              <CreditCard className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{data.totalCredits.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">All-time earnings</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Available for Withdrawal</CardTitle>
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{data.availableCredits.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">Ready to withdraw</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Pending Withdrawals</CardTitle>
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{data.pendingWithdrawalCredits.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">Being processed</p>
          </CardContent>
        </Card>
      </div>

      {/* Withdrawal Form */}
      <Card className="shadow-md">
        <CardHeader className="border-b bg-gray-50">
          <CardTitle className="text-xl">Request Withdrawal</CardTitle>
          <CardDescription>
            Withdraw your earned credits to your Philippine bank account via Xendit
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleWithdraw} className="space-y-6">
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
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="text-sm font-medium text-blue-900">
                      ₱{php.toFixed(2)} - ₱{fee.toFixed(2)} fee = <span className="font-bold">₱{net.toFixed(2)}</span>
                    </div>
                    <div className="text-xs text-blue-700 mt-1">You will receive this amount</div>
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
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
            >
              {withdrawing ? "Processing Withdrawal..." : credits > 0 ? `Withdraw ${credits} Credits (₱${net.toFixed(2)})` : "Withdraw Credits"}
            </Button>

            <div className="bg-gray-50 border rounded-lg p-4 text-sm text-gray-700 space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                <span>Processing fee: {data.withdrawalFeePercentage}%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                <span>Processing time: 1-3 business days</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                <span>Minimum withdrawal: {data.minimumWithdrawal} credits</span>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Withdrawal History */}
      <Card className="shadow-md">
        <CardHeader className="border-b bg-gray-50">
          <CardTitle className="text-xl">Withdrawal History</CardTitle>
          <CardDescription>Your recent withdrawal transactions</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {data.withdrawals.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium">No withdrawals yet</p>
              <p className="text-sm text-gray-400 mt-1">Your withdrawal history will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.withdrawals.map((withdrawal) => (
                <div
                  key={withdrawal.id}
                  className="flex items-center justify-between p-5 border rounded-lg hover:shadow-md transition-shadow bg-white"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {getStatusIcon(withdrawal.status)}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">
                        {withdrawal.creditsAmount} Credits → ₱{withdrawal.netAmount}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {new Date(withdrawal.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                        {withdrawal.failureReason && (
                          <span className="text-red-600 ml-2 font-medium">• {withdrawal.failureReason}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wide ${getStatusColor(withdrawal.status)}`}>
                    {withdrawal.status}
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