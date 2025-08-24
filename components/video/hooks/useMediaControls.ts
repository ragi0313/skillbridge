import { useCallback } from "react"
import { toast } from "@/lib/toast"
import { CallState, toSafeError } from "../types"
import { VideoCallLogger } from "../utils/logger"

interface UseMediaControlsProps {
  callState: CallState
  setCallState: React.Dispatch<React.SetStateAction<CallState>>
  clientRef: React.MutableRefObject<any>
  localVideoRef: React.RefObject<HTMLDivElement | null>
  localVideoTrackRef: React.MutableRefObject<any>
  localAudioTrackRef: React.MutableRefObject<any>
  screenTrackRef: React.MutableRefObject<any>
  safePublish: (tracks: any[]) => Promise<void>
}

export function useMediaControls({
  callState,
  setCallState,
  clientRef,
  localVideoRef,
  localVideoTrackRef,
  localAudioTrackRef,
  screenTrackRef,
  safePublish,
}: UseMediaControlsProps) {

  const createMediaTracks = useCallback(async (): Promise<void> => {
    if (!clientRef.current) {
      throw new Error("Client not initialized")
    }

    const AgoraRTC = (window as any).AgoraRTC
    let localVideoTrack: any = null
    let localAudioTrack: any = null

    try {
      // Strategy 1: Try to create both tracks together
      const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
        {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          microphoneId: undefined,
        },
        {
          optimizationMode: "motion",
          encoderConfig: "480p_1",
          cameraId: undefined,
        }
      )

      localVideoTrack = videoTrack
      localAudioTrack = audioTrack

      localVideoTrackRef.current = localVideoTrack
      localAudioTrackRef.current = localAudioTrack

      if (localVideoRef.current) {
        localVideoTrack.play(localVideoRef.current)
      }

      await safePublish([localVideoTrack, localAudioTrack])
      
    } catch (mediaError: unknown) {
      const safeError = toSafeError(mediaError)
      VideoCallLogger.error("Media device error", mediaError)

      // Handle specific device errors
      if (safeError.name === 'NotFoundError' || safeError.code === 'DEVICE_NOT_FOUND') {
        toast.error("Camera or microphone not found. Please check your devices and try again.")
      } else if (safeError.name === 'NotAllowedError' || safeError.code === 'PERMISSION_DENIED') {
        toast.error("Camera and microphone access denied. Please allow permissions and refresh.")
      } else if (safeError.name === 'NotReadableError' || safeError.code === 'DEVICE_IN_USE') {
        toast.error("Camera or microphone is being used by another application.")
      } else {
        toast.error("Failed to access camera or microphone. Please check your devices.")
      }

      // Fallback to audio-only
      try {
        VideoCallLogger.log("Attempting audio-only fallback...")
        localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack({
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        })

        localAudioTrackRef.current = localAudioTrack
        await clientRef.current.publish([localAudioTrack])
        
        setCallState((prev) => ({ ...prev, isAudioEnabled: true, isVideoEnabled: false }))
        toast.info("✓ Connected with audio only.")
        
      } catch (audioError) {
        VideoCallLogger.error("Audio fallback failed", audioError)
        toast.error("Unable to access any media devices.")
        setCallState((prev) => ({ ...prev, isVideoEnabled: false, isAudioEnabled: false }))
      }
    }
  }, [clientRef, localVideoRef, localVideoTrackRef, localAudioTrackRef, safePublish, setCallState])

  const toggleVideo = useCallback(async () => {
    if (localVideoTrackRef.current) {
      const newState = !callState.isVideoEnabled
      await localVideoTrackRef.current.setEnabled(newState)
      setCallState((prev) => ({ ...prev, isVideoEnabled: newState }))
      toast.info(newState ? "Camera turned on" : "Camera turned off")
    }
  }, [callState.isVideoEnabled, localVideoTrackRef, setCallState])

  const toggleAudio = useCallback(async () => {
    if (localAudioTrackRef.current) {
      const newState = !callState.isAudioEnabled
      await localAudioTrackRef.current.setEnabled(newState)
      setCallState((prev) => ({ ...prev, isAudioEnabled: newState }))
      toast.info(newState ? "Microphone unmuted" : "Microphone muted")
    }
  }, [callState.isAudioEnabled, localAudioTrackRef, setCallState])

  const toggleScreenShare = useCallback(async () => {
    try {
      if (!clientRef.current) return

      const AgoraRTC = (window as any).AgoraRTC

      if (callState.isScreenSharing) {
        // Stop screen sharing
        try {
          if (screenTrackRef.current) {
            await clientRef.current.unpublish([screenTrackRef.current])
            screenTrackRef.current.close()
            screenTrackRef.current = null
          }

          // Create new camera track
          const videoTrack = await AgoraRTC.createCameraVideoTrack()
          localVideoTrackRef.current = videoTrack

          await clientRef.current.publish([videoTrack])

          if (localVideoRef.current) {
            videoTrack.play(localVideoRef.current)
          }

          setCallState((prev) => ({ ...prev, isScreenSharing: false }))
          toast.info("Screen sharing stopped")
        } catch (stopError) {
          VideoCallLogger.error("Error stopping screen share", stopError)
          setCallState((prev) => ({ ...prev, isScreenSharing: false }))
        }
      } else {
        // Start screen sharing
        try {
          const screenTrack = await AgoraRTC.createScreenVideoTrack({
            encoderConfig: "1080p_1"
          })

          screenTrackRef.current = screenTrack

          if (localVideoTrackRef.current) {
            try {
              await clientRef.current.unpublish([localVideoTrackRef.current])
              localVideoTrackRef.current.close()
              localVideoTrackRef.current = null
            } catch (unpublishError) {
              VideoCallLogger.log("Error unpublishing camera track", unpublishError)
            }
          }

          await clientRef.current.publish([screenTrack])

          if (localVideoRef.current) {
            screenTrack.play(localVideoRef.current)
          }

          screenTrack.on("track-ended", () => {
            VideoCallLogger.log("Screen share ended by user")
            if (callState.isScreenSharing) {
              toggleScreenShare()
            }
          })

          setCallState((prev) => ({ ...prev, isScreenSharing: true }))
          toast.success("Screen sharing started")
        } catch (screenError) {
          const safeError = toSafeError(screenError)
          if (safeError.name === 'NotAllowedError' || 
              safeError.code === 'PERMISSION_DENIED' ||
              safeError.message?.includes('NotAllowedError') ||
              safeError.message?.includes('Permission denied')) {
            // User cancelled screen sharing
            return
          } else {
            VideoCallLogger.error("Screen sharing error", screenError)
            toast.error("Failed to start screen sharing")
          }
        }
      }
    } catch (error) {
      const safeError = toSafeError(error)
      if (!safeError.message?.includes('NotAllowedError') && 
          !safeError.message?.includes('Permission denied')) {
        VideoCallLogger.error("Screen share error", error)
        toast.error("Failed to toggle screen share")
      }
    }
  }, [callState.isScreenSharing, clientRef, localVideoRef, localVideoTrackRef, screenTrackRef, setCallState])

  return {
    createMediaTracks,
    toggleVideo,
    toggleAudio,
    toggleScreenShare,
  }
}