# Session Feedback Integration Guide

This guide explains how to integrate the session feedback modal system that appears automatically when sessions are completed.

## Architecture Overview

The session feedback system is triggered by the **session completion service** rather than being manually triggered from UI components. This ensures that feedback collection happens at the right time in the session lifecycle.

### Key Components

1. **SessionFeedbackModal** - The feedback collection modal
2. **useSessionCompletion** - Hook for handling session completion and feedback triggering
3. **GlobalSessionFeedbackProvider** - Global provider for feedback modal
4. **Session Completion API** - Enhanced to include feedback tracking

## Integration Steps

### 1. Add the Global Provider

Wrap your app or session pages with the `GlobalSessionFeedbackProvider`:

```tsx
// In your layout.tsx or session page
import { GlobalSessionFeedbackProvider } from '@/components/session/GlobalSessionFeedbackProvider'

export default function SessionLayout({ children }: { children: React.ReactNode }) {
  return (
    <GlobalSessionFeedbackProvider>
      {children}
    </GlobalSessionFeedbackProvider>
  )
}
```

### 2. Use the Session Completion Hook

In components that handle session completion (like video call rooms):

```tsx
import { useSessionCompletion } from '@/lib/hooks/useSessionCompletion'

export function VideoCallRoom({ sessionId, userRole, otherParticipant, sessionData }: Props) {
  const { checkAndShowFeedbackAfterCompletion } = useSessionCompletion()

  const handleEndSession = async () => {
    try {
      // This will automatically show feedback modal if session completed successfully
      const result = await checkAndShowFeedbackAfterCompletion(
        parseInt(sessionId),
        userRole,
        {
          firstName: otherParticipant.firstName,
          lastName: otherParticipant.lastName,
          profilePictureUrl: otherParticipant.profilePictureUrl,
          title: otherParticipant.title
        },
        {
          durationMinutes: sessionData.durationMinutes,
          skillName: sessionData.skillName, // Optional
          totalCostCredits: sessionData.totalCostCredits // Optional
        },
        'completed' // Reason for completion
      )

      if (result.success) {
        // Handle successful session completion
        console.log('Session completed successfully')
        // The feedback modal will automatically appear if needed
      }
    } catch (error) {
      console.error('Failed to complete session:', error)
    }
  }

  return (
    <div>
      {/* Your video call UI */}
      <button onClick={handleEndSession}>End Session</button>
    </div>
  )
}
```

### 3. Manual Feedback Triggering (Optional)

If you need to manually trigger feedback collection:

```tsx
const { showFeedbackModalForSession } = useSessionCompletion()

const showFeedback = () => {
  showFeedbackModalForSession({
    sessionId: 123,
    userRole: 'learner',
    otherParticipant: {
      firstName: 'John',
      lastName: 'Doe',
      profilePictureUrl: null,
      title: 'Mentor'
    },
    sessionData: {
      durationMinutes: 60,
      skillName: 'JavaScript',
      totalCostCredits: 100
    },
    completionResult: {
      success: true,
      status: 'completed',
      message: 'Session completed',
      paymentProcessed: true,
      refundProcessed: false,
      mentorEarnings: 80
    }
  })
}
```

## How It Works

1. **Session Completion**: When a session ends, the completion API is called
2. **Feedback Check**: The API checks if feedback should be collected based on:
   - Session completed successfully
   - Payment was processed
   - User hasn't already submitted feedback
3. **Modal Display**: If criteria are met, the feedback modal appears automatically
4. **Feedback Submission**: User can submit feedback or skip
5. **Database Update**: Feedback is stored and tracking flags are updated

## API Endpoints

### Session Completion
- **POST** `/api/sessions/[id]/end`
- Handles session completion and returns feedback information

### Feedback Submission
- **POST** `/api/sessions/[id]/feedback`
- Stores user feedback and ratings
- **GET** `/api/sessions/[id]/feedback`
- Retrieves feedback status and existing feedback

## Database Schema

### Session Feedback Table
```sql
CREATE TABLE session_feedback (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES booking_sessions(id),
  reviewer_user_id INTEGER REFERENCES users(id),
  reviewer_role VARCHAR(20) NOT NULL,
  overall_rating INTEGER NOT NULL,
  communication_rating INTEGER,
  knowledge_rating INTEGER,
  helpfulness_rating INTEGER,
  punctuality_rating INTEGER,
  feedback_text TEXT NOT NULL,
  improvement_suggestions TEXT,
  most_valuable_aspect TEXT,
  session_highlights TEXT, -- JSON array
  session_pace VARCHAR(20),
  would_recommend BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Session Tracking Fields
Added to `booking_sessions` table:
- `learner_feedback_submitted BOOLEAN DEFAULT FALSE`
- `mentor_feedback_submitted BOOLEAN DEFAULT FALSE`

## Key Features

- **Smart Triggering**: Only shows for successfully completed sessions
- **Duplicate Prevention**: Won't show if user already submitted feedback
- **Mobile Responsive**: Optimized for all screen sizes
- **Step-by-Step Process**: 3-step feedback collection process
- **Comprehensive Ratings**: Multiple rating categories
- **Optional Fields**: Flexible feedback structure
- **Global State Management**: Works across different pages/components

## Benefits

1. **Automatic Collection**: No manual trigger needed
2. **Right Timing**: Appears when session truly completes
3. **Better Data Quality**: Feedback collected when experience is fresh
4. **User-Friendly**: Optional submission with skip option
5. **Comprehensive**: Collects both ratings and written feedback
6. **Platform Improvement**: Data used to enhance matching and quality