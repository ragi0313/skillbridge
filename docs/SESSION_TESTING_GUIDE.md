# Session Testing Guide - Two Accounts on Same PC

This guide explains how to test video sessions with two accounts on the same PC using the same camera and microphone.

## Method 1: Different Browsers (Easiest)

### Step 1: Create Two Test Accounts
1. **Mentor Account**: Register as mentor with email like `testmentor@example.com`
2. **Learner Account**: Register as learner with email like `testlearner@example.com`

### Step 2: Open Different Browsers
- **Chrome**: Login with mentor account
- **Firefox/Edge**: Login with learner account

### Step 3: Camera/Mic Sharing Workaround
Since browsers can't share camera/mic directly, use this approach:

#### Option A: Virtual Camera Software
```bash
# Install OBS Studio (free)
# 1. Download from https://obsproject.com/
# 2. Set up a virtual camera
# 3. Use OBS Virtual Camera as camera source in both browsers
```

#### Option B: Browser Tab Switching
1. Start session in Chrome (mentor)
2. When prompted for camera/mic, allow access
3. Switch to Firefox (learner) 
4. Firefox will get camera access when Chrome tab is inactive

## Method 2: Incognito/Private Windows

### Same Browser, Different Sessions
```bash
# Chrome Example:
# Window 1: Regular Chrome - Mentor account
# Window 2: Incognito Chrome - Learner account
```

**Steps:**
1. Open regular Chrome → Login as mentor
2. Open Chrome Incognito → Login as learner  
3. Use virtual camera software (OBS) for both windows

## Method 3: Browser Profiles

### Chrome Profiles Setup
```bash
# Create separate Chrome profiles
chrome.exe --profile-directory="Mentor Profile"
chrome.exe --profile-directory="Learner Profile"
```

**Steps:**
1. Create "Mentor" profile in Chrome
2. Create "Learner" profile in Chrome
3. Login to respective accounts
4. Use OBS Virtual Camera for both

## Method 4: Development Testing Setup

### Mock Video/Audio for Testing

Add this to your session join component for testing:

```typescript
// In SessionJoinPage or VideoCall component
const isDevelopment = process.env.NODE_ENV === 'development'
const isTestMode = process.env.NEXT_PUBLIC_TEST_MODE === 'true'

const getTestMediaConstraints = (userRole: string) => {
  if (isDevelopment && isTestMode) {
    return {
      video: {
        width: 640,
        height: 480,
        facingMode: 'user'
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: true
      }
    }
  }
  return {
    video: true,
    audio: true
  }
}
```

## Testing Workflow

### 1. Session Creation Flow
```
Learner (Browser 1):
1. Book a session with mentor
2. Set time 5 minutes from now
3. Wait for mentor acceptance

Mentor (Browser 2):  
1. Check dashboard for new booking
2. Accept the session
3. Wait for session time
```

### 2. Session Join Flow
```
Both browsers (when session time arrives):
1. Navigate to session join page
2. Allow camera/mic access
3. Join session
4. Test video/audio functionality
```

### 3. What to Test

#### Basic Functionality
- [ ] Session creation and acceptance
- [ ] Join session at scheduled time
- [ ] Video feed display
- [ ] Audio transmission
- [ ] Session completion
- [ ] Credit transactions

#### Edge Cases
- [ ] Early join (before 30 min window)
- [ ] Late join (after grace period)
- [ ] One user doesn't show up (no-show detection)
- [ ] Session interruption/reconnection
- [ ] Browser refresh during session
- [ ] Network connectivity issues

## OBS Studio Setup for Virtual Camera

### Installation and Setup
```bash
1. Download OBS Studio from https://obsproject.com/
2. Install and open OBS
3. Add Source → Video Capture Device → Select your webcam
4. Start Virtual Camera (Tools → Virtual Camera)
5. In browsers, select "OBS Virtual Camera" as camera source
```

### OBS Settings for Testing
```
Video Settings:
- Base Resolution: 1920x1080
- Output Resolution: 1280x720
- FPS: 30

Virtual Camera:
- Output Type: Internal Camera
- Target Camera: OBS Virtual Camera
```

## Environment Variables for Testing

Add to your `.env.local`:
```env
NEXT_PUBLIC_TEST_MODE=true
NEXT_PUBLIC_AGORA_APP_ID=your_test_app_id
```

## Troubleshooting

### Camera/Mic Access Issues
```bash
# Chrome: Go to chrome://settings/content/camera
# Firefox: Go to about:preferences#privacy → Permissions
# Clear all camera/mic permissions and re-allow
```

### Session Join Issues
```bash
# Check browser console for errors
# Verify Agora tokens are valid
# Check network connectivity
# Ensure session status is correct in database
```

### Database Session States
```sql
-- Check session status
SELECT id, status, scheduledDate, learnerJoinedAt, mentorJoinedAt 
FROM booking_sessions 
WHERE id = YOUR_SESSION_ID;

-- Manually update session status if needed (for testing)
UPDATE booking_sessions 
SET status = 'upcoming' 
WHERE id = YOUR_SESSION_ID;
```

## Testing Checklist

### Pre-Session
- [ ] Two different browser instances running
- [ ] Virtual camera software installed and configured
- [ ] Both accounts logged in
- [ ] Session booked and accepted
- [ ] Correct session time set

### During Session  
- [ ] Both users can join session
- [ ] Video feeds visible on both sides
- [ ] Audio transmission working
- [ ] UI controls functional (mute, camera toggle)
- [ ] Session timer working
- [ ] Real-time updates working

### Post-Session
- [ ] Session marked as completed
- [ ] Credits transferred correctly
- [ ] Notifications sent
- [ ] Session data saved
- [ ] No duplicate notifications

## Advanced Testing

### Automated Testing Script
```bash
# Create test sessions programmatically
npm run test:create-session
npm run test:simulate-join
npm run test:simulate-completion
```

### Mock Agora Service (for CI/CD)
```typescript
// In test environment, mock Agora service
if (process.env.NODE_ENV === 'test') {
  jest.mock('@/lib/agora/AgoraService', () => ({
    generateToken: jest.fn().mockResolvedValue('mock-token'),
    // ... other mocks
  }))
}
```

This setup allows you to thoroughly test the session functionality with realistic user interactions while working around the single-PC hardware limitations.