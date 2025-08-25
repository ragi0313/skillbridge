"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  PhoneOff, 
  CheckCircle,
  Settings,
  Monitor,
  MessageCircle
} from "lucide-react"

interface VideoControlsProps {
  isVideoEnabled: boolean
  isAudioEnabled: boolean
  onToggleVideo: () => void
  onToggleAudio: () => void
  onEndCall: () => void
  onCompleteSession: () => void
  userRole: 'mentor' | 'learner'
  showScreenShare?: boolean
  onScreenShare?: () => void
  isScreenSharing?: boolean
  showChat?: boolean
  onToggleChat?: () => void
  hasUnreadMessages?: boolean
}

export function VideoControls({
  isVideoEnabled,
  isAudioEnabled,
  onToggleVideo,
  onToggleAudio,
  onEndCall,
  onCompleteSession,
  userRole,
  showScreenShare = false,
  onScreenShare,
  isScreenSharing = false,
  showChat = false,
  onToggleChat,
  hasUnreadMessages = false
}: VideoControlsProps) {
  return (
    <div className="flex items-center justify-center space-x-4">
      {/* Audio Control */}
      <Button
        variant={isAudioEnabled ? "default" : "destructive"}
        size="lg"
        onClick={onToggleAudio}
        className="w-14 h-14 rounded-full"
        title={isAudioEnabled ? "Mute microphone" : "Unmute microphone"}
      >
        {isAudioEnabled ? (
          <Mic className="w-6 h-6" />
        ) : (
          <MicOff className="w-6 h-6" />
        )}
      </Button>

      {/* Video Control */}
      <Button
        variant={isVideoEnabled ? "default" : "destructive"}
        size="lg"
        onClick={onToggleVideo}
        className="w-14 h-14 rounded-full"
        title={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
      >
        {isVideoEnabled ? (
          <Video className="w-6 h-6" />
        ) : (
          <VideoOff className="w-6 h-6" />
        )}
      </Button>

      {/* Screen Share Control */}
      {showScreenShare && onScreenShare && (
        <Button
          variant={isScreenSharing ? "secondary" : "outline"}
          size="lg"
          onClick={onScreenShare}
          className="w-14 h-14 rounded-full"
          title={isScreenSharing ? "Stop sharing screen" : "Share screen"}
        >
          <Monitor className="w-6 h-6" />
        </Button>
      )}

      {/* Chat Control */}
      {showChat && onToggleChat && (
        <div className="relative">
          <Button
            variant="outline"
            size="lg"
            onClick={onToggleChat}
            className="w-14 h-14 rounded-full"
            title="Toggle chat"
          >
            <MessageCircle className="w-6 h-6" />
          </Button>
          {hasUnreadMessages && (
            <Badge className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs">
              !
            </Badge>
          )}
        </div>
      )}

      {/* Session Actions */}
      <div className="flex items-center space-x-2 ml-8">
        {/* Complete Session - Only for mentors or at end of time */}
        <Button
          variant="outline"
          onClick={onCompleteSession}
          className="flex items-center space-x-2 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
          title="Complete session successfully"
        >
          <CheckCircle className="w-4 h-4" />
          <span>Complete Session</span>
        </Button>

        {/* End Call */}
        <Button
          variant="destructive"
          onClick={onEndCall}
          className="w-14 h-14 rounded-full"
          title="Leave call (session continues)"
        >
          <PhoneOff className="w-6 h-6" />
        </Button>
      </div>

      {/* Additional Controls */}
      <div className="flex items-center space-x-2 ml-4">
        <Button
          variant="ghost"
          size="lg"
          className="w-14 h-14 rounded-full"
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </Button>
      </div>
    </div>
  )
}