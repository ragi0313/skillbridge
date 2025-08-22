"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Video, VideoOff, Mic, MicOff, Settings, RefreshCw, AlertTriangle, CheckCircle, Clock, Users } from "lucide-react"
import { toast } from "@/lib/toast"

interface WaitingRoomProps {
  sessionId: string
  userRole: "learner" | "mentor"
  sessionDetails: {
    scheduledDate: string
    durationMinutes: number
    status: string
  }
  userName: string
  onJoinSession: () => void
  canJoin: boolean
  waitingMinutes?: number
}

interface DeviceState {
  camera: {
    available: boolean
    enabled: boolean
    device: MediaDeviceInfo | null
    stream: MediaStream | null
    error: string | null
  }
  microphone: {
    available: boolean
    enabled: boolean
    device: MediaDeviceInfo | null
    stream: MediaStream | null
    error: string | null
  }
}

export default function WaitingRoom({
  sessionId,
  userRole,
  sessionDetails,
  userName,
  onJoinSession,
  canJoin,
  waitingMinutes
}: WaitingRoomProps) {
  const [deviceState, setDeviceState] = useState<DeviceState>({
    camera: { available: false, enabled: true, device: null, stream: null, error: null },
    microphone: { available: false, enabled: true, device: null, stream: null, error: null }
  })
  
  const [availableDevices, setAvailableDevices] = useState<{
    cameras: MediaDeviceInfo[]
    microphones: MediaDeviceInfo[]
  }>({ cameras: [], microphones: [] })
  
  const [isTestingDevices, setIsTestingDevices] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Calculate time until session starts
  const getTimeUntilSession = useCallback(() => {
    if (!sessionDetails?.scheduledDate) return 0
    const now = new Date()
    const sessionStart = sessionDetails?.scheduledDate ? new Date(sessionDetails.scheduledDate) : new Date()
    const diff = sessionStart.getTime() - now.getTime()
    return Math.max(0, Math.floor(diff / 1000))
  }, [sessionDetails?.scheduledDate])

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Get available media devices
  const getAvailableDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const cameras = devices.filter(device => device.kind === 'videoinput')
      const microphones = devices.filter(device => device.kind === 'audioinput')
      
      setAvailableDevices({ cameras, microphones })
      
      return { cameras, microphones }
    } catch (error) {
      console.error("Error enumerating devices:", error)
      toast.error("Failed to detect available devices")
      return { cameras: [], microphones: [] }
    }
  }, [])

  // Test camera access
  const testCamera = useCallback(async (deviceId?: string) => {
    try {
      setDeviceState(prev => ({
        ...prev,
        camera: { ...prev.camera, error: null }
      }))

      const constraints: MediaStreamConstraints = {
        video: deviceId ? { deviceId: { exact: deviceId } } : true,
        audio: false
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }

      const videoTrack = stream.getVideoTracks()[0]
      const device = availableDevices.cameras.find(d => d.deviceId === videoTrack.getSettings().deviceId)

      setDeviceState(prev => ({
        ...prev,
        camera: {
          available: true,
          enabled: true,
          device: device || null,
          stream,
          error: null
        }
      }))

      // Store the stream reference
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      streamRef.current = stream

      return true
    } catch (error: any) {
      console.error("Camera test failed:", error)
      
      let errorMessage = "Camera access failed"
      if (error.name === 'NotFoundError') {
        errorMessage = "No camera found"
      } else if (error.name === 'NotAllowedError') {
        errorMessage = "Camera permission denied"
      } else if (error.name === 'NotReadableError') {
        errorMessage = "Camera is being used by another application"
      }

      setDeviceState(prev => ({
        ...prev,
        camera: {
          available: false,
          enabled: false,
          device: null,
          stream: null,
          error: errorMessage
        }
      }))

      return false
    }
  }, [availableDevices.cameras])

  // Test microphone access
  const testMicrophone = useCallback(async (deviceId?: string) => {
    try {
      setDeviceState(prev => ({
        ...prev,
        microphone: { ...prev.microphone, error: null }
      }))

      const constraints: MediaStreamConstraints = {
        video: false,
        audio: deviceId ? { deviceId: { exact: deviceId } } : true
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      const audioTrack = stream.getAudioTracks()[0]
      const device = availableDevices.microphones.find(d => d.deviceId === audioTrack.getSettings().deviceId)

      setDeviceState(prev => ({
        ...prev,
        microphone: {
          available: true,
          enabled: true,
          device: device || null,
          stream,
          error: null
        }
      }))

      // Stop the test stream immediately (we just needed to verify access)
      stream.getTracks().forEach(track => track.stop())

      return true
    } catch (error: any) {
      console.error("Microphone test failed:", error)
      
      let errorMessage = "Microphone access failed"
      if (error.name === 'NotFoundError') {
        errorMessage = "No microphone found"
      } else if (error.name === 'NotAllowedError') {
        errorMessage = "Microphone permission denied"
      } else if (error.name === 'NotReadableError') {
        errorMessage = "Microphone is being used by another application"
      }

      setDeviceState(prev => ({
        ...prev,
        microphone: {
          available: false,
          enabled: false,
          device: null,
          stream: null,
          error: errorMessage
        }
      }))

      return false
    }
  }, [availableDevices.microphones])

  // Test all devices
  const testAllDevices = useCallback(async () => {
    setIsTestingDevices(true)
    
    try {
      // Get available devices first
      const devices = await getAvailableDevices()
      
      // Test camera and microphone
      const [cameraOk, microphoneOk] = await Promise.all([
        testCamera(devices.cameras[0]?.deviceId),
        testMicrophone(devices.microphones[0]?.deviceId)
      ])

      if (cameraOk && microphoneOk) {
        toast.success("Camera and microphone are working correctly")
      } else if (cameraOk) {
        toast.warning("Camera OK, but microphone has issues")
      } else if (microphoneOk) {
        toast.warning("Microphone OK, but camera has issues")
      } else {
        toast.error("Both camera and microphone have issues")
      }
    } catch (error) {
      console.error("Device test failed:", error)
      toast.error("Failed to test devices")
    } finally {
      setIsTestingDevices(false)
    }
  }, [getAvailableDevices, testCamera, testMicrophone])

  // Toggle camera
  const toggleCamera = useCallback(() => {
    if (deviceState.camera.available) {
      setDeviceState(prev => ({
        ...prev,
        camera: { ...prev.camera, enabled: !prev.camera.enabled }
      }))
    }
  }, [deviceState.camera.available])

  // Toggle microphone
  const toggleMicrophone = useCallback(() => {
    if (deviceState.microphone.available) {
      setDeviceState(prev => ({
        ...prev,
        microphone: { ...prev.microphone, enabled: !prev.microphone.enabled }
      }))
    }
  }, [deviceState.microphone.available])

  // Initialize devices on mount
  useEffect(() => {
    testAllDevices()
  }, [testAllDevices])

  // Countdown timer
  useEffect(() => {
    if (canJoin) {
      setCountdown(null)
      return
    }

    const updateCountdown = () => {
      const timeLeft = getTimeUntilSession()
      setCountdown(timeLeft)
      
      if (timeLeft <= 0) {
        window.location.reload() // Refresh to check if can join now
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [canJoin, getTimeUntilSession])

  // Cleanup streams on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const sessionStart = sessionDetails?.scheduledDate ? new Date(sessionDetails.scheduledDate) : new Date()
  const readyToJoin = deviceState.camera.available && deviceState.microphone.available

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl mx-auto shadow-2xl">
        <CardHeader className="text-center bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
          <CardTitle className="text-2xl font-bold">Session Waiting Room</CardTitle>
          <p className="text-blue-100">Prepare for your mentoring session</p>
        </CardHeader>
        
        <CardContent className="p-8">
          {/* Session Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-semibold">Session Time</p>
                  <p className="text-gray-600">{sessionStart.toLocaleString()}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-semibold">Your Role</p>
                  <p className="text-gray-600 capitalize">{userRole}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center">
              {!canJoin && countdown !== null ? (
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {formatTime(countdown)}
                  </div>
                  <p className="text-gray-600">until you can join</p>
                  <Badge variant="secondary" className="mt-2">
                    Join window opens 10 minutes before
                  </Badge>
                </div>
              ) : (
                <Badge variant="default" className="bg-green-600 text-white text-lg px-4 py-2">
                  Ready to Join!
                </Badge>
              )}
            </div>
          </div>

          <Separator className="my-6" />

          {/* Device Testing */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Video Preview */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Video className="h-5 w-5 mr-2" />
                Camera Preview
              </h3>
              
              <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video mb-4">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className={`w-full h-full object-cover ${
                    !deviceState.camera.enabled ? 'hidden' : ''
                  }`}
                />
                
                {!deviceState.camera.enabled && (
                  <div className="absolute inset-0 flex items-center justify-center text-white">
                    <div className="text-center">
                      <VideoOff className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Camera Off</p>
                    </div>
                  </div>
                )}

                {deviceState.camera.error && (
                  <div className="absolute inset-0 flex items-center justify-center bg-red-900 bg-opacity-90 text-white">
                    <div className="text-center">
                      <AlertTriangle className="h-12 w-12 mx-auto mb-2" />
                      <p className="font-semibold">Camera Error</p>
                      <p className="text-sm">{deviceState.camera.error}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-center space-x-4">
                <Button
                  variant={deviceState.camera.enabled ? "default" : "destructive"}
                  onClick={toggleCamera}
                  disabled={!deviceState.camera.available}
                  className="rounded-full w-12 h-12"
                >
                  {deviceState.camera.enabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                </Button>

                <Button
                  variant={deviceState.microphone.enabled ? "default" : "destructive"}
                  onClick={toggleMicrophone}
                  disabled={!deviceState.microphone.available}
                  className="rounded-full w-12 h-12"
                >
                  {deviceState.microphone.enabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                </Button>
              </div>
            </div>

            {/* Device Status */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Device Status
              </h3>

              <div className="space-y-4">
                {/* Camera Status */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Video className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium">Camera</p>
                      <p className="text-sm text-gray-600">
                        {deviceState.camera.device?.label || "Default Camera"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {deviceState.camera.available ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    )}
                    <Badge variant={deviceState.camera.available ? "default" : "destructive"}>
                      {deviceState.camera.available ? "Working" : "Error"}
                    </Badge>
                  </div>
                </div>

                {/* Microphone Status */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Mic className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium">Microphone</p>
                      <p className="text-sm text-gray-600">
                        {deviceState.microphone.device?.label || "Default Microphone"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {deviceState.microphone.available ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    )}
                    <Badge variant={deviceState.microphone.available ? "default" : "destructive"}>
                      {deviceState.microphone.available ? "Working" : "Error"}
                    </Badge>
                  </div>
                </div>

                {/* Test Devices Button */}
                <Button
                  variant="outline"
                  onClick={testAllDevices}
                  disabled={isTestingDevices}
                  className="w-full"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isTestingDevices ? 'animate-spin' : ''}`} />
                  {isTestingDevices ? "Testing Devices..." : "Test Devices Again"}
                </Button>

                {/* Error Messages */}
                {(deviceState.camera.error || deviceState.microphone.error) && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="font-medium text-red-800 mb-2">Device Issues</h4>
                    {deviceState.camera.error && (
                      <p className="text-sm text-red-700 mb-1">• Camera: {deviceState.camera.error}</p>
                    )}
                    {deviceState.microphone.error && (
                      <p className="text-sm text-red-700">• Microphone: {deviceState.microphone.error}</p>
                    )}
                    <div className="mt-3 text-sm text-red-700">
                      <p className="font-medium">Troubleshooting:</p>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        <li>Check if devices are connected properly</li>
                        <li>Allow camera/microphone permissions when prompted</li>
                        <li>Close other applications using your camera/microphone</li>
                        <li>Try refreshing the page</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Join Session */}
          <div className="text-center">
            <Button
              onClick={onJoinSession}
              disabled={!canJoin || !readyToJoin}
              size="lg"
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg"
            >
              {!canJoin ? (
                `Join in ${waitingMinutes || 0} minutes`
              ) : !readyToJoin ? (
                "Fix device issues to join"
              ) : (
                "Join Session"
              )}
            </Button>
            
            {canJoin && !readyToJoin && (
              <p className="mt-2 text-sm text-red-600">
                Please resolve camera and microphone issues before joining
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}