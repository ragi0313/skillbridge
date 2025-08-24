// Legacy VideoCall component - now uses the refactored VideoCallMain
import VideoCallMain from "./VideoCallMain"
import { VideoCallProps } from "./types"

export default function VideoCall({ sessionId, userRole, agoraChannel }: VideoCallProps) {
  return (
    <VideoCallMain 
      sessionId={sessionId}
      userRole={userRole}
      agoraChannel={agoraChannel}
    />
  )
}