import { Users, VideoOff, MicOff, Monitor, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CallState } from "./types"

interface VideoDisplayProps {
  callState: CallState
  localVideoRef: React.RefObject<HTMLDivElement | null>
  remoteVideoRef: React.RefObject<HTMLDivElement | null>
  isLoading: boolean
  onReconnect: () => void
  onLeaveCall: () => void
}

export function VideoDisplay({
  callState,
  localVideoRef,
  remoteVideoRef,
  isLoading,
  onReconnect,
  onLeaveCall,
}: VideoDisplayProps) {
  return (
    <div className="flex-1 bg-gray-900 relative">
      {/* Remote Video (Main) */}
      <div
        ref={remoteVideoRef}
        className="w-full h-full bg-gray-800 flex items-center justify-center"
      >
        {callState.participantCount === 0 && (
          <div className="text-center text-white">
            <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">Waiting for other participant...</p>
            <p className="text-sm opacity-75">They will appear here when they join</p>
          </div>
        )}
      </div>

      {/* Local Video (Picture-in-Picture) */}
      <div className="absolute top-4 right-4 w-48 h-36 bg-gray-700 rounded-lg overflow-hidden border-2 border-white shadow-lg">
        <div
          ref={localVideoRef}
          className="w-full h-full bg-gray-800 flex items-center justify-center"
        >
          {!callState.isVideoEnabled && (
            <div className="text-center text-white">
              <VideoOff className="h-8 w-8 mx-auto mb-2" />
              <p className="text-xs">Camera Off</p>
            </div>
          )}
        </div>

        {/* Local Video Status Indicators */}
        <div className="absolute bottom-2 left-2 flex space-x-1">
          {!callState.isAudioEnabled && (
            <div className="bg-red-500 rounded-full p-1">
              <MicOff className="h-3 w-3 text-white" />
            </div>
          )}
          {callState.isScreenSharing && (
            <div className="bg-blue-500 rounded-full p-1">
              <Monitor className="h-3 w-3 text-white" />
            </div>
          )}
        </div>
      </div>

      {/* Screen Share Indicator */}
      {callState.isScreenSharing && (
        <div className="absolute top-4 left-4 bg-blue-600 text-white px-3 py-1 rounded-full text-sm flex items-center">
          <Monitor className="h-4 w-4 mr-2" />
          You're sharing your screen
        </div>
      )}

      {/* Connection Lost Overlay */}
      {callState.connectionLost && !callState.isReconnecting && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-95 z-50">
          <div className="text-center text-white bg-gray-800 p-8 rounded-lg border border-gray-600 max-w-md">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <h3 className="text-xl font-semibold mb-2">Connection Lost</h3>
            <p className="text-gray-300 mb-6">
              Your connection to the video call was interrupted.
              {callState.lastDisconnectTime && (
                <span className="block text-sm mt-2">
                  Lost at {callState.lastDisconnectTime.toLocaleTimeString()}
                </span>
              )}
            </p>
            <div className="space-y-3">
              <Button onClick={onReconnect} className="w-full bg-blue-600 hover:bg-blue-700">
                Reconnect to Session
              </Button>
              <Button
                variant="outline"
                onClick={onLeaveCall}
                className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Leave Session
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reconnecting Overlay */}
      {callState.isReconnecting && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-80 z-40">
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-lg">Reconnecting to session...</p>
            <p className="text-sm text-gray-300 mt-2">
              Please wait while we restore your connection
            </p>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-90">
          <div className="text-center text-white max-w-md">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-lg">Connecting to video call...</p>
            <p className="text-sm opacity-75 mb-2">
              Please allow camera and microphone access
            </p>
            <div className="text-xs opacity-60 mt-4 p-3 bg-gray-800 rounded">
              <p className="mb-2">
                <strong>Testing with multiple browsers?</strong>
              </p>
              <p>
                If you get device conflicts, the system will automatically try
                alternative devices or fallback to audio-only mode.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}