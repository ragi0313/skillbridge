import { Button } from "@/components/ui/button"
import { Video, VideoOff, Mic, MicOff, Monitor, PhoneOff } from "lucide-react"
import { CallState } from "./types"

interface VideoControlsProps {
  callState: CallState
  onToggleVideo: () => void
  onToggleAudio: () => void
  onToggleScreenShare: () => void
  onLeaveCall: () => void
}

export function VideoControls({
  callState,
  onToggleVideo,
  onToggleAudio,
  onToggleScreenShare,
  onLeaveCall,
}: VideoControlsProps) {
  if (!callState.isConnected) {
    return null
  }

  return (
    <div className="flex items-center justify-center space-x-4 p-6 bg-gray-800 border-t border-gray-700">
      <Button
        variant="outline"
        size="lg"
        onClick={onToggleAudio}
        className={`rounded-full w-14 h-14 border-2 transition-colors ${
          callState.isAudioEnabled
            ? "bg-green-600 border-green-600 text-white hover:bg-green-700"
            : "bg-red-600 border-red-600 text-white hover:bg-red-700"
        }`}
      >
        {callState.isAudioEnabled ? (
          <Mic className="h-6 w-6" />
        ) : (
          <MicOff className="h-6 w-6" />
        )}
      </Button>

      <Button
        variant="outline"
        size="lg"
        onClick={onToggleVideo}
        className={`rounded-full w-14 h-14 border-2 transition-colors ${
          callState.isVideoEnabled
            ? "bg-green-600 border-green-600 text-white hover:bg-green-700"
            : "bg-red-600 border-red-600 text-white hover:bg-red-700"
        }`}
      >
        {callState.isVideoEnabled ? (
          <Video className="h-6 w-6" />
        ) : (
          <VideoOff className="h-6 w-6" />
        )}
      </Button>

      <Button
        variant="outline"
        size="lg"
        onClick={onToggleScreenShare}
        className={`rounded-full w-14 h-14 border-2 transition-colors ${
          callState.isScreenSharing
            ? "bg-blue-600 border-blue-600 text-white hover:bg-blue-700"
            : "bg-gray-600 border-gray-600 text-white hover:bg-gray-700"
        }`}
      >
        <Monitor className="h-6 w-6" />
      </Button>

      <div className="flex-1" />

      <Button
        variant="destructive"
        size="lg"
        onClick={onLeaveCall}
        className="rounded-full w-14 h-14 bg-red-600 hover:bg-red-700 border-2 border-red-600"
        title="Leave Call"
      >
        <PhoneOff className="h-6 w-6" />
      </Button>
    </div>
  )
}