import { Coins } from "lucide-react"

interface CreditsDisplayProps {
  credits: number
}

export function CreditsDisplay({ credits }: CreditsDisplayProps) {
  const dollarAmount = credits / 5 // Convert credits to dollars (5 credits = 1 dollar)

  return (
    <div className="flex items-center space-x-2">
      <div className="flex items-center space-x-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-2 py-1 rounded-full text-sm font-medium">
        <Coins className="w-4 h-4" />
        <span>{credits}</span>
      </div>
      <span className="text-xs text-gray-500">(${dollarAmount}/hr)</span>
    </div>
  )
}
