# Device Conflict Solutions - "Device is in use" Error

This document provides solutions for the "Device is in use" error when testing video sessions with multiple browsers.

## 🔧 Quick Solutions

### 1. OBS Virtual Camera (Recommended) ⭐
**Best solution for testing and development**

```bash
# Install OBS Studio
1. Download from https://obsproject.com/
2. Install and open OBS Studio
3. Add Source → Video Capture Device → Select your webcam
4. Tools → Virtual Camera → Start Virtual Camera
5. In both browsers, select "OBS Virtual Camera" as camera source
```

**Benefits:**
- ✅ Allows multiple browsers to use the same "virtual" camera
- ✅ High quality video stream
- ✅ Professional streaming features
- ✅ Works with any number of browser tabs/windows

### 2. Browser Tab Management
**Simple workaround for quick testing**

```bash
# Method A: Different Browsers
- Chrome: Login with first account
- Firefox/Edge: Login with second account
- Only one browser accesses camera at a time

# Method B: Tab Switching
1. Start session in Browser 1
2. Allow camera/mic access
3. Switch to Browser 2 (Browser 1 tab becomes inactive)
4. Browser 2 can now access camera/mic
```

### 3. Browser Profiles
**Separate browser instances**

```bash
# Chrome Profiles
chrome.exe --profile-directory="Profile 1"
chrome.exe --profile-directory="Profile 2"

# Firefox Profiles  
firefox.exe -P "Profile1"
firefox.exe -P "Profile2"
```

## 💻 Code Improvements

The VideoCall component now includes enhanced device handling:

### Enhanced Error Messages
- Specific messages for device conflicts
- Helpful suggestions for testing scenarios
- Links to solutions and workarounds

### Fallback Strategies
1. **Audio-Only Mode**: If camera fails, try audio-only
2. **Delayed Retry**: Attempt to add video after initial audio connection
3. **Minimal Constraints**: Try with basic audio settings if enhanced audio fails
4. **Viewer Mode**: Allow joining without media for troubleshooting

### Device Testing Tools
- New `DeviceTester` component in waiting room
- Real-time device availability checking
- Debug information for troubleshooting
- Automatic fallback suggestions

## 🛠️ New Components

### Device Manager (`lib/video/device-manager.ts`)
- `testMediaDevices()`: Test camera/microphone availability
- `getTestingMediaConstraints()`: Optimized settings for testing
- `handleDeviceConflict()`: Smart error handling and fallbacks
- `getTestingHelp()`: User-friendly troubleshooting tips

### Device Tester (`components/video/DeviceTester.tsx`)
- Interactive device testing interface
- Real-time availability checking
- Debug information display
- Integration with waiting room

## 🧪 Testing Workflow

### For Developers
```bash
1. Set up OBS Virtual Camera
2. Open Chrome and Edge browsers
3. Login with different accounts
4. Book a session between accounts
5. Both browsers can join using OBS Virtual Camera
```

### For Users
1. Use the Device Tester in the waiting room
2. Follow the suggested solutions if devices are in use
3. Enable audio-only mode if needed
4. Report any persistent issues

## 🔍 Troubleshooting

### Common Issues and Solutions

**"Device is in use"**
- ✅ Use OBS Virtual Camera
- ✅ Close other browser tabs using camera
- ✅ Try different browsers
- ✅ Enable audio-only mode

**"Permission denied"**
- ✅ Check browser permissions (chrome://settings/content/camera)
- ✅ Allow camera/microphone access when prompted
- ✅ Restart browser after permission changes

**"Device not found"**
- ✅ Check device connections
- ✅ Restart browser
- ✅ Check Windows device manager
- ✅ Try different USB ports (for external cameras)

**Poor video quality**
- ✅ Use OBS for better quality control
- ✅ Check network connection
- ✅ Close unnecessary browser tabs
- ✅ Lower video resolution in browser settings

## 📋 Environment Setup

### Development Environment
Add to `.env.local`:
```env
NEXT_PUBLIC_TEST_MODE=true
NEXT_PUBLIC_ENABLE_DEVICE_TESTER=true
```

### Testing Checklist
- [ ] OBS Virtual Camera installed and configured
- [ ] Two different browser accounts ready
- [ ] Device Tester shows green status
- [ ] Audio/video preview working in waiting room
- [ ] Session booking and acceptance working
- [ ] Both participants can join simultaneously

## 🚀 Advanced Solutions

### Mock Devices for CI/CD
```typescript
// For automated testing
if (process.env.NODE_ENV === 'test') {
  // Mock getUserMedia for automated tests
  Object.defineProperty(navigator, 'mediaDevices', {
    value: {
      getUserMedia: jest.fn().mockResolvedValue(mockStream)
    }
  })
}
```

### Virtual Audio Cables
For advanced testing scenarios:
- **VB-Audio Virtual Cable**: Virtual audio devices
- **Voicemeeter**: Audio mixing and routing
- **Loopback**: Audio routing (macOS)

## 📞 Support

If you continue experiencing device conflicts:

1. Use the Device Tester component for diagnostics
2. Check the browser console for detailed error messages
3. Try the OBS Virtual Camera solution
4. Contact support with device debug information

## 📝 Notes

- Device conflicts are a browser limitation, not an application bug
- OBS Virtual Camera is the most reliable solution for development
- Production users typically don't have multiple tabs accessing the same devices
- These solutions are primarily for testing and development scenarios

The enhanced error handling ensures users get helpful guidance when device conflicts occur, making the development and testing process much smoother.