// Device management utilities for video sessions
// Helps handle camera/microphone conflicts during testing

export interface MediaDeviceConfig {
  video: boolean | MediaTrackConstraints
  audio: boolean | MediaTrackConstraints
}

export interface DeviceTestResult {
  success: boolean
  hasVideo: boolean
  hasAudio: boolean
  error?: string
  deviceCount?: number
}

/**
 * Test media device availability and conflicts
 */
export async function testMediaDevices(): Promise<DeviceTestResult> {
  try {
    // Check device availability
    const devices = await navigator.mediaDevices.enumerateDevices()
    const videoDevices = devices.filter(device => device.kind === 'videoinput')
    const audioDevices = devices.filter(device => device.kind === 'audioinput')
    
    console.log(`Found ${videoDevices.length} video devices and ${audioDevices.length} audio devices`)
    
    // Test actual access
    let stream: MediaStream | null = null
    let hasVideo = false
    let hasAudio = false
    
    try {
      // Try to get both video and audio
      stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      })
      
      hasVideo = stream.getVideoTracks().length > 0
      hasAudio = stream.getAudioTracks().length > 0
      
    } catch (error: any) {
      console.log("Full media access failed, trying audio only:", error.message)
      
      // Try audio only if full access fails
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        hasAudio = stream.getAudioTracks().length > 0
      } catch (audioError: any) {
        console.log("Audio access also failed:", audioError.message)
        return {
          success: false,
          hasVideo: false,
          hasAudio: false,
          error: audioError.message,
          deviceCount: videoDevices.length + audioDevices.length
        }
      }
    }
    
    // Clean up stream
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
    }
    
    return {
      success: hasVideo || hasAudio,
      hasVideo,
      hasAudio,
      deviceCount: videoDevices.length + audioDevices.length
    }
    
  } catch (error: any) {
    return {
      success: false,
      hasVideo: false,
      hasAudio: false,
      error: error.message
    }
  }
}

/**
 * Get optimized media constraints for testing scenarios
 */
export function getTestingMediaConstraints(forceAudioOnly = false): MediaDeviceConfig {
  const isDevelopment = process.env.NODE_ENV === 'development'
  const isTestMode = process.env.NEXT_PUBLIC_TEST_MODE === 'true'
  
  if (forceAudioOnly || (isDevelopment && isTestMode)) {
    return {
      video: false,
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        // Lower quality for testing
        channelCount: 1,
        sampleRate: 16000
      }
    }
  }
  
  return {
    video: {
      width: { ideal: 1280, max: 1920 },
      height: { ideal: 720, max: 1080 },
      frameRate: { ideal: 30, max: 60 },
      facingMode: 'user'
    },
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    }
  }
}

/**
 * Handle device conflicts gracefully
 */
export async function handleDeviceConflict(error: DOMException): Promise<{
  strategy: string
  message: string
  fallbackConfig?: MediaDeviceConfig
}> {
  const errorName = error.name
  const errorMessage = error.message.toLowerCase()
  
  if (errorName === 'NotReadableError' || errorMessage.includes('device in use')) {
    return {
      strategy: 'device_in_use',
      message: 'Camera or microphone is being used by another application. Try closing other browser tabs or use OBS Virtual Camera for testing.',
      fallbackConfig: getTestingMediaConstraints(true) // Audio only
    }
  }
  
  if (errorName === 'NotAllowedError') {
    return {
      strategy: 'permission_denied',
      message: 'Camera and microphone access denied. Please allow permissions and refresh the page.'
    }
  }
  
  if (errorName === 'NotFoundError') {
    return {
      strategy: 'device_not_found',
      message: 'Camera or microphone not found. Please check your devices are connected and try again.'
    }
  }
  
  if (errorName === 'OverconstrainedError') {
    return {
      strategy: 'constraints_failed',
      message: 'Camera or microphone constraints not supported. Trying with basic settings.',
      fallbackConfig: {
        video: { width: 640, height: 480 },
        audio: true
      }
    }
  }
  
  return {
    strategy: 'unknown_error',
    message: `Media device error: ${error.message}. Please check your devices and try again.`
  }
}

/**
 * Create helpful error messages for different testing scenarios
 */
export function getTestingHelp(): {
  title: string
  solutions: string[]
} {
  return {
    title: "Testing with Multiple Browsers?",
    solutions: [
      "Use OBS Studio Virtual Camera (recommended)",
      "Close other browser tabs using camera/microphone", 
      "Try different browsers (Chrome + Firefox)",
      "Use browser incognito/private windows",
      "Enable audio-only mode for one participant"
    ]
  }
}

/**
 * Debug information for troubleshooting
 */
export async function getDeviceDebugInfo(): Promise<{
  userAgent: string
  devices: MediaDeviceInfo[]
  permissions: any
  constraints: MediaDeviceConfig
}> {
  const devices = await navigator.mediaDevices.enumerateDevices()
  
  let permissions = {}
  try {
    // @ts-ignore - Check permissions if available
    if (navigator.permissions) {
      const cameraPermission = await navigator.permissions.query({ name: 'camera' as any })
      const microphonePermission = await navigator.permissions.query({ name: 'microphone' as any })
      permissions = {
        camera: cameraPermission.state,
        microphone: microphonePermission.state
      }
    }
  } catch (e) {
    permissions = { error: 'Permissions API not available' }
  }
  
  return {
    userAgent: navigator.userAgent,
    devices: devices.map(device => ({
      deviceId: device.deviceId,
      groupId: device.groupId,
      kind: device.kind,
      label: device.label
    })) as MediaDeviceInfo[],
    permissions,
    constraints: getTestingMediaConstraints()
  }
}