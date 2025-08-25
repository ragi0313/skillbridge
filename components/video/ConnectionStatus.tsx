"use client"

import { Badge } from "@/components/ui/badge"
import { ConnectionState, NetworkQuality } from "agora-rtc-sdk-ng"
import { 
  Wifi, 
  WifiOff, 
  Signal, 
  SignalLow, 
  SignalMedium, 
  SignalHigh,
  AlertCircle,
  CheckCircle,
  Loader2
} from "lucide-react"

interface ConnectionStatusProps {
  connectionState: ConnectionState
  networkQuality: NetworkQuality | null
}

export function ConnectionStatus({ connectionState, networkQuality }: ConnectionStatusProps) {
  const getConnectionIcon = () => {
    switch (connectionState) {
      case "CONNECTED":
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case "CONNECTING":
      case "RECONNECTING":
        return <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />
      case "DISCONNECTED":
      case "DISCONNECTING":
        return <WifiOff className="w-4 h-4 text-red-500" />
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />
    }
  }

  const getNetworkQualityIcon = () => {
    if (!networkQuality) return <Signal className="w-4 h-4 text-gray-400" />
    
    // NetworkQuality is 0-6, where lower numbers are better
    if (networkQuality <= 2) {
      return <SignalHigh className="w-4 h-4 text-green-500" />
    } else if (networkQuality <= 4) {
      return <SignalMedium className="w-4 h-4 text-yellow-500" />
    } else {
      return <SignalLow className="w-4 h-4 text-red-500" />
    }
  }

  const getConnectionText = () => {
    switch (connectionState) {
      case "CONNECTED":
        return "Connected"
      case "CONNECTING":
        return "Connecting..."
      case "RECONNECTING":
        return "Reconnecting..."
      case "DISCONNECTED":
        return "Disconnected"
      case "DISCONNECTING":
        return "Disconnecting..."
      default:
        return "Unknown"
    }
  }

  const getNetworkQualityText = () => {
    if (!networkQuality) return "Unknown"
    
    // NetworkQuality is 0-6, where lower numbers are better
    if (networkQuality <= 2) {
      return "Excellent"
    } else if (networkQuality <= 4) {
      return "Good"
    } else if (networkQuality === 5) {
      return "Poor"
    } else {
      return "Very Poor"
    }
  }

  const getStatusVariant = () => {
    switch (connectionState) {
      case "CONNECTED":
        return "default"
      case "CONNECTING":
      case "RECONNECTING":
        return "secondary"
      case "DISCONNECTED":
      case "DISCONNECTING":
        return "destructive"
      default:
        return "outline"
    }
  }

  return (
    <div className="flex items-center space-x-2">
      {/* Connection Status */}
      <Badge variant={getStatusVariant() as any} className="flex items-center space-x-1">
        {getConnectionIcon()}
        <span className="text-xs">{getConnectionText()}</span>
      </Badge>

      {/* Network Quality */}
      {connectionState === "CONNECTED" && (
        <div className="flex items-center space-x-1 text-xs text-gray-500">
          {getNetworkQualityIcon()}
          <span>{getNetworkQualityText()}</span>
        </div>
      )}
    </div>
  )
}