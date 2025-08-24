import { Badge } from "@/components/ui/badge"
import { Users, Wifi, WifiOff } from "lucide-react"
import { CallState } from "./types"

interface ConnectionStatusProps {
  callState: CallState
  formatDuration: (seconds: number) => string
}

export function ConnectionStatus({ callState, formatDuration }: ConnectionStatusProps) {
  const getQualityColor = () => {
    switch (callState.connectionQuality) {
      case "excellent":
        return "text-green-500"
      case "good":
        return "text-yellow-500"
      case "poor":
        return "text-red-500"
      default:
        return "text-gray-500"
    }
  }

  const getQualityIcon = () => {
    return callState.connectionQuality === "poor" ? (
      <WifiOff className="h-4 w-4" />
    ) : (
      <Wifi className="h-4 w-4" />
    )
  }

  return (
    <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
      <div className="flex items-center space-x-4">
        <Badge
          variant={callState.isConnected ? "default" : "secondary"}
          className={
            callState.isConnected
              ? "bg-green-600 text-white"
              : callState.isReconnecting
              ? "bg-orange-600 text-white"
              : callState.connectionLost
              ? "bg-red-600 text-white"
              : "bg-blue-600 text-white"
          }
        >
          {callState.isConnected
            ? "Connected"
            : callState.isReconnecting
            ? "Reconnecting..."
            : callState.connectionLost
            ? "Connection Lost"
            : "Connecting..."}
        </Badge>
        {callState.isConnected && (
          <>
            <div className="flex items-center space-x-1 text-sm text-gray-300">
              <Users className="h-4 w-4" />
              <span>{callState.participantCount + 1} participants</span>
            </div>
            <div className="text-sm font-mono text-gray-300">
              {formatDuration(callState.callDuration)}
            </div>
            <div className={`flex items-center space-x-1 ${getQualityColor()}`}>
              {getQualityIcon()}
              <span className="text-sm capitalize">{callState.connectionQuality}</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}