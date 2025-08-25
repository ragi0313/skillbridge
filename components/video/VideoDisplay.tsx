"use client"

import { useEffect, useRef } from "react"
import { ICameraVideoTrack, IAgoraRTCRemoteUser } from "agora-rtc-sdk-ng"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { VideoOff, MicOff, User } from "lucide-react"

interface VideoDisplayProps {
  localVideoTrack: ICameraVideoTrack | null
  remoteUsers: IAgoraRTCRemoteUser[]
  isVideoEnabled: boolean
  userName: string
}

export function VideoDisplay({
  localVideoTrack,
  remoteUsers,
  isVideoEnabled,
  userName
}: VideoDisplayProps) {
  const localVideoRef = useRef<HTMLDivElement>(null)
  const remoteVideoRefs = useRef<Map<number, HTMLDivElement>>(new Map())

  // Play local video
  useEffect(() => {
    if (localVideoTrack && localVideoRef.current && isVideoEnabled) {
      localVideoTrack.play(localVideoRef.current)
      console.log("[VIDEO_DISPLAY] Playing local video")
    }
  }, [localVideoTrack, isVideoEnabled])

  // Play remote videos
  useEffect(() => {
    remoteUsers.forEach((user) => {
      const uid = user.uid as number
      const videoDiv = remoteVideoRefs.current.get(uid)
      
      if (user.videoTrack && videoDiv && user.hasVideo) {
        user.videoTrack.play(videoDiv)
        console.log(`[VIDEO_DISPLAY] Playing remote video for user ${uid}`)
      }
    })
  }, [remoteUsers])

  const remoteUser = remoteUsers[0] // In 1-on-1, there should only be one remote user

  return (
    <div className="h-full relative bg-gray-900">
      {/* Main video (remote user or local if no remote) */}
      <div className="h-full w-full relative">
        {remoteUser ? (
          <div className="h-full w-full relative">
            {remoteUser.hasVideo ? (
              <div
                ref={(div) => {
                  if (div && remoteUser.uid) {
                    remoteVideoRefs.current.set(remoteUser.uid as number, div)
                  }
                }}
                className="h-full w-full object-cover rounded-lg"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-gray-800 rounded-lg">
                <div className="text-center">
                  <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <User className="w-12 h-12 text-gray-400" />
                  </div>
                  <p className="text-white text-lg">Remote video is off</p>
                </div>
              </div>
            )}
            
            {/* Remote user badges */}
            <div className="absolute top-4 left-4 flex space-x-2">
              <Badge variant="secondary" className="bg-black/50 text-white">
                Remote User
              </Badge>
              {!remoteUser.hasVideo && (
                <Badge variant="destructive" className="bg-red-500/80 text-white">
                  <VideoOff className="w-3 h-3 mr-1" />
                  Video Off
                </Badge>
              )}
              {!remoteUser.hasAudio && (
                <Badge variant="destructive" className="bg-red-500/80 text-white">
                  <MicOff className="w-3 h-3 mr-1" />
                  Audio Off
                </Badge>
              )}
            </div>
          </div>
        ) : (
          // No remote user, show local video in main area
          <div className="h-full w-full relative">
            {isVideoEnabled && localVideoTrack ? (
              <div
                ref={localVideoRef}
                className="h-full w-full object-cover rounded-lg"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-gray-800 rounded-lg">
                <div className="text-center">
                  <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <User className="w-12 h-12 text-gray-400" />
                  </div>
                  <p className="text-white text-lg">Your video is off</p>
                  <p className="text-gray-400 text-sm mt-2">Waiting for other participant...</p>
                </div>
              </div>
            )}
            
            <div className="absolute top-4 left-4">
              <Badge variant="secondary" className="bg-black/50 text-white">
                You ({userName})
              </Badge>
            </div>
          </div>
        )}
      </div>

      {/* Picture-in-picture local video when remote user is present */}
      {remoteUser && (
        <Card className="absolute bottom-4 right-4 w-48 h-36 overflow-hidden shadow-xl border-2 border-white">
          {isVideoEnabled && localVideoTrack ? (
            <div
              ref={localVideoRef}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-800">
              <div className="text-center">
                <User className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-white text-xs">You</p>
                <p className="text-gray-400 text-xs">Video off</p>
              </div>
            </div>
          )}
          
          {/* Local video badges */}
          <div className="absolute top-2 left-2">
            <Badge variant="secondary" className="bg-black/70 text-white text-xs">
              You
            </Badge>
          </div>
          
          {!isVideoEnabled && (
            <div className="absolute top-2 right-2">
              <Badge variant="destructive" className="bg-red-500/80 text-white">
                <VideoOff className="w-2 h-2" />
              </Badge>
            </div>
          )}
        </Card>
      )}

      {/* Connection status */}
      {remoteUsers.length === 0 && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
          <div className="bg-black/50 backdrop-blur-sm rounded-lg p-6 text-white">
            <div className="animate-pulse w-6 h-6 bg-blue-500 rounded-full mx-auto mb-3"></div>
            <p className="text-lg font-medium">Waiting for other participant</p>
            <p className="text-sm text-gray-300 mt-2">
              Share this session link with your {userName.includes('mentor') ? 'learner' : 'mentor'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}