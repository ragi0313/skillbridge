# SkillBridge Session Management: Complete Guide
## From Booking to 1-on-1 Video Sessions

This comprehensive guide explains how SkillBridge handles the entire lifecycle from session booking to completion, including all edge cases and error scenarios.

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Session States & Lifecycle](#session-states--lifecycle)
3. [Booking Process](#booking-process)
4. [Session Management](#session-management)
5. [Video Call Integration](#video-call-integration)
6. [Access Control & Security](#access-control--security)
7. [Edge Cases & Error Handling](#edge-cases--error-handling)
8. [Financial Management](#financial-management)
9. [Real-time Updates](#real-time-updates)
10. [Monitoring & Automation](#monitoring--automation)

---

## 🏗️ System Overview

SkillBridge operates a sophisticated mentorship platform where learners book 1-on-1 video sessions with mentors. The system handles:

- **Credit-based payments** with escrow protection
- **Automated session lifecycle management**
- **Real-time video calls** using Agora SDK
- **Smart access control** preventing unauthorized access
- **Comprehensive edge case handling** for reliability

### Key Components

| Component | Purpose |
|-----------|---------|
| `booking_sessions` table | Core session data and state tracking |
| `SessionManagementService` | Handles join/leave events |
| `BookingLifecycleService` | Manages session completion and payments |
| `Access Control System` | Ensures only authorized participants |
| `Offline Session Updater` | Handles status updates when monitoring is down |
| `Agora Integration` | Powers real-time video communication |

---

## 🔄 Session States & Lifecycle

### Session Status Flow

```
pending → confirmed → upcoming → ongoing → completed
   ↓         ↓          ↓         ↓         ↓
rejected  cancelled  cancelled  various   financial
                                  ends     processing
```

### Detailed States

| Status | Description | Who Can Trigger | Next Possible States |
|--------|-------------|----------------|----------------------|
| `pending` | Awaiting mentor approval | System (auto) | `confirmed`, `rejected`, `cancelled` |
| `confirmed` | Mentor accepted the session | Mentor | `upcoming`, `cancelled` |
| `upcoming` | Session starting within 30 minutes | System (auto) | `ongoing`, `cancelled` |
| `ongoing` | Session in progress | System (auto) | `completed`, `technical_issues`, `learner_no_show`, `mentor_no_show` |
| `completed` | Session finished successfully | System/Users | Final state |
| `cancelled` | Session was cancelled | Learner/Mentor/System | Final state |
| `rejected` | Mentor declined the session | Mentor | Final state |
| `learner_no_show` | Learner didn't join within grace period | System (auto) | Final state |
| `mentor_no_show` | Mentor didn't join within grace period | System (auto) | Final state |
| `both_no_show` | Neither participant joined | System (auto) | Final state |
| `technical_issues` | Session ended due to technical problems | Participants | Final state |

### State Transition Rules

1. **Automatic Transitions**: System monitors sessions and updates status based on time and participant activity
2. **Manual Transitions**: Users can trigger specific state changes (accept, reject, cancel)
3. **Time-based Transitions**: Sessions automatically transition based on scheduled times and grace periods
4. **Financial Implications**: Each state change affects credit flow and payment processing

---

## 📅 Booking Process

### Step 1: Session Request
When a learner books a session:

```typescript
// Session creation with escrow
{
  learnerId: number,          // Who's booking
  mentorId: number,           // Who they're booking with
  mentorSkillId: number,      // Specific skill/rate
  scheduledDate: timestamp,   // When the session should occur
  startTime: timestamp,       // Exact start time
  endTime: timestamp,         // Exact end time
  durationMinutes: number,    // Session length
  totalCostCredits: number,   // Total cost
  escrowCredits: number,      // Credits held in escrow
  sessionNotes: string,       // Learner's notes/goals
  status: "pending",          // Initial status
  expiresAt: timestamp        // When booking expires if not confirmed
}
```

### Step 2: Credit Escrow
- **Credits are immediately deducted** from learner's balance
- **Credits are held in escrow** until session completion
- **No double-charging** - credits are reserved, not charged twice

### Step 3: Mentor Notification
- Mentor receives notification of new booking request
- Mentor has limited time to respond (typically 24-48 hours)
- Request expires automatically if no response

### Step 4: Mentor Response
**Option A: Accept**
- Session status → `confirmed`
- Learner receives confirmation notification
- Session appears in both participants' dashboards

**Option B: Reject**
- Session status → `rejected`
- Credits automatically refunded to learner
- Learner receives notification with rejection reason

---

## 🎯 Session Management

### Pre-Session Phase (Confirmed → Upcoming)

**30 Minutes Before Start Time:**
- Session status automatically changes to `upcoming`
- Both participants can now access the video call
- Join window opens with 30-minute early access

### Session Start (Upcoming → Ongoing)

**When First Participant Joins:**
```typescript
// System tracks who joins when
{
  learnerJoinedAt: timestamp | null,
  mentorJoinedAt: timestamp | null,
  agoraCallStartedAt: timestamp,
  status: "ongoing"
}
```

**15-Minute Grace Period:**
- System waits 15 minutes after scheduled start time
- If no one joins → `both_no_show`
- If only one person joins → `learner_no_show` or `mentor_no_show`

### During Session (Ongoing)

**Activity Tracking:**
- Real-time join/leave events recorded
- Connection duration calculated for both participants
- Chat messages stored with timestamps
- File sharing tracked and logged

**Technical Issues Handling:**
- Participants can report technical problems
- Option to resolve and continue session
- Option to end session with full refund

### Session End (Ongoing → Completed)

**Automatic End Conditions:**
1. **Scheduled end time reached**
2. **Both participants leave** the video call
3. **Manual end** by either participant
4. **Technical issues** reported and confirmed

**End Process:**
```typescript
async endVideoSession(sessionId, endType) {
  // 1. Update session status
  // 2. Process financial transactions
  // 3. End Agora video channel
  // 4. Send notifications
  // 5. Trigger post-session workflows
}
```

---

## 🎥 Video Call Integration

### Agora SDK Implementation

**Channel Management:**
- Each session gets a unique Agora channel name
- Channels are created on-demand when first participant joins
- Channels are automatically cleaned up after session ends

**Token-Based Security:**
```typescript
// Secure token generation
const token = agoraService.generateRTCToken({
  channelName: session.agoraChannelName,
  userId: user.id,
  role: userRole, // 'host' or 'participant'
  expirationTime: sessionEndTime
});
```

**Connection Flow:**
1. **Access Validation**: Verify user can join this specific session
2. **Token Generation**: Create secure, time-limited access token
3. **Channel Join**: Connect to unique session channel
4. **Activity Tracking**: Monitor join/leave events
5. **Cleanup**: End channel when session completes

### Real-time Features

**Video & Audio:**
- High-quality video streaming
- Crystal-clear audio communication
- Screen sharing capabilities
- Recording available (optional)

**Chat Integration:**
- In-session text chat
- File sharing and downloads
- Message history persistence
- Emoji reactions and formatting

**Session Controls:**
- Mute/unmute audio and video
- Screen sharing toggle
- End session button
- Technical issues reporting
- Session rating and feedback

---

## 🔒 Access Control & Security

### Multi-Layer Security

**1. Session Ownership Validation**
```typescript
// Only the specific booked learner and mentor can access
const validation = await validateSessionAccess(sessionId, userId);
// Checks:
// - User is the actual booked learner or mentor
// - Session exists and is in valid state
// - User hasn't been suspended or banned
```

**2. Timing-Based Access**
```typescript
// Access windows based on session state
const accessRules = {
  pending: { access: false }, // No video access yet
  confirmed: { 
    access: true,
    window: "30 minutes before start" 
  },
  upcoming: { access: true },
  ongoing: { access: true },
  completed: { access: false } // Session ended
};
```

**3. Connection Limits**
```typescript
// Strict 1-on-1 enforcement
await validateParticipantLimit(sessionId);
// Ensures max 2 active participants
// Prevents unauthorized third parties
```

**4. Token Expiration**
- Agora tokens expire at session end time
- Automatic disconnection if session overruns
- No lingering access after session completion

### Edge Case Protections

**Duplicate Connection Prevention:**
- System checks for existing active connections
- Prevents same user joining multiple times
- Handles browser refresh and network issues

**Session Hijacking Prevention:**
- Channel names are unpredictable UUIDs
- Tokens are user-specific and time-limited
- Database validation on every access attempt

---

## ⚠️ Edge Cases & Error Handling

### Common Scenarios & Solutions

**1. No-Show Situations**

| Scenario | Detection | Action | Financial Impact |
|----------|-----------|--------|------------------|
| **Both No-Show** | No joins within 15 min | Status → `both_no_show` | Full refund to learner |
| **Learner No-Show** | Only mentor joins | Status → `learner_no_show` | Mentor gets full payment |
| **Mentor No-Show** | Only learner joins | Status → `mentor_no_show` | Full refund to learner |

**2. Technical Issues**

```typescript
// Participant-initiated technical issues
handleTechnicalIssues(action: 'resolve' | 'end_session') {
  if (action === 'resolve') {
    // Continue session, no financial impact
    return continueSession();
  } else {
    // End with full refund
    return endSessionWithRefund();
  }
}
```

**3. Connection Problems**

| Problem | Detection | Resolution |
|---------|-----------|------------|
| **Network Disconnect** | Agora SDK events | Auto-reconnect attempt |
| **Browser Crash** | Connection timeout | Allow rejoin with same token |
| **Device Issues** | User reports | Switch to audio-only mode |

**4. Session Overruns**

```typescript
// Automatic handling of extended sessions
if (currentTime > scheduledEndTime) {
  if (extensionAllowed && bothParticipantsAgree) {
    // Continue with pro-rated billing
    extendSession(additionalMinutes);
  } else {
    // Force end session
    endSessionGracefully();
  }
}
```

**5. Late Joins**

```typescript
// Grace period management
const graceWindow = 15; // minutes after start time
if (joinTime > startTime + graceWindow) {
  if (otherParticipantPresent) {
    // Allow late join, adjust billing
    adjustSessionBilling(actualStartTime);
  } else {
    // Too late, mark as no-show
    markAsNoShow(lateUser);
  }
}
```

**6. Mentor Doesn't Respond to Booking**

```typescript
// Automatic expiration handling
if (currentTime > session.expiresAt && status === 'pending') {
  // Auto-reject and refund
  await updateSession(sessionId, {
    status: 'mentor_no_response',
    refundAmount: session.totalCostCredits,
    cancellationReason: 'Mentor did not respond within the required timeframe'
  });
}
```

---

## 💰 Financial Management

### Credit Flow & Escrow System

**1. Booking Phase**
```typescript
// Credits held in escrow immediately
const transaction = {
  userId: learner.id,
  type: 'session_escrow',
  direction: 'debit',
  amount: totalCostCredits,
  status: 'pending'
};
```

**2. Session Completion**
```typescript
// Financial processing based on end type
const financialRules = {
  completed: {
    mentorPayment: totalCost * 0.8, // 80% to mentor
    platformFee: totalCost * 0.2,   // 20% platform fee
    learnerRefund: 0
  },
  learner_no_show: {
    mentorPayment: totalCost,        // 100% to mentor
    platformFee: 0,
    learnerRefund: 0
  },
  mentor_no_show: {
    mentorPayment: 0,
    platformFee: 0,
    learnerRefund: totalCost         // 100% refund
  },
  technical_issues: {
    mentorPayment: 0,
    platformFee: 0,
    learnerRefund: totalCost         // 100% refund
  }
};
```

**3. Transaction Safety**
- All financial operations use database transactions
- Rollback capability on failures
- Audit trail for all credit movements
- Balance verification before and after operations

### Payment Processing Rules

**Mentor Earnings:**
- Standard sessions: 80% of session cost
- No-show by learner: 100% of session cost
- Technical issues: No payment (not their fault)
- Late cancellation by learner: Partial payment

**Learner Refunds:**
- Mentor no-show: 100% refund
- Technical issues: 100% refund
- Early cancellation (>24h): 100% refund
- Late cancellation (<24h): No refund
- Session completed: No refund

**Platform Fees:**
- Successfully completed sessions: 20%
- No-show situations: 0% (credits flow directly)
- Refund situations: 0% (full refund to learner)

---

## 🔄 Real-time Updates

### Server-Sent Events (SSE)

**Session Update Broadcasting:**
```typescript
// Real-time notifications to participants
const updateData = {
  type: 'session_update',
  sessionId: session.id,
  newStatus: 'confirmed',
  message: 'Your session has been confirmed!',
  session: updatedSessionData
};

broadcastSessionUpdate(updateData);
```

**Update Types:**
- Status changes (pending → confirmed)
- Participant join/leave events
- Technical issue reports
- Session completion notifications
- Payment processing updates

### Client-Side Handling

**Automatic UI Updates:**
- Session cards refresh with new status
- Notifications appear for important changes
- Countdown timers update in real-time
- Join buttons appear when sessions become available

**Connection Recovery:**
- Automatic reconnection on network issues
- Offline capability with queued updates
- Graceful degradation when server unavailable

---

## 📊 Monitoring & Automation

### Automated Session Monitoring

**Background Service:**
```typescript
// Runs every 2 minutes
const monitoringSevice = {
  checkPendingExpiration(),    // Auto-expire unconfirmed bookings
  checkUpcomingStart(),        // Transition to 'upcoming' status
  checkOngoingNoShows(),       // Detect no-show situations
  checkOverrunSessions(),      // Handle sessions running long
  processFinancialTransactions() // Complete payment processing
};
```

**Health Checks:**
- Session state consistency validation
- Financial transaction verification
- Agora channel cleanup
- Notification delivery confirmation

### Offline Resilience

**Queued Updates System:**
```typescript
// Handles server downtime gracefully
class OfflineSessionUpdater {
  // Queues updates when server unavailable
  queueUpdate(sessionId, newStatus, reason);
  
  // Processes queue when server returns
  processQueue();
  
  // Ensures no updates are lost
  persistToLocalStorage();
}
```

**Recovery Mechanisms:**
- Automatic retry logic with exponential backoff
- Local storage backup for critical updates
- Batch processing when connectivity restored
- Manual intervention tools for edge cases

---

## 🚀 Quick Reference

### For Developers

**Key API Endpoints:**
- `POST /api/bookings` - Create new session booking
- `GET /api/sessions/{id}` - Join video session
- `POST /api/sessions/{id}/join` - Record join event
- `POST /api/sessions/{id}/leave` - Record leave event
- `POST /api/sessions/{id}/complete` - End session

**Database Tables:**
- `booking_sessions` - Main session data
- `credit_transactions` - Financial operations
- `mentor_payouts` - Payment processing
- `notifications` - User notifications

**Service Classes:**
- `SessionManagementService` - Join/leave tracking
- `BookingLifecycleService` - Session completion
- `OfflineSessionUpdater` - Resilient updates

### For Business Operations

**Session States to Monitor:**
- High `pending` count = Mentor response needed
- High `no_show` rates = Quality/matching issue
- High `technical_issues` = Infrastructure problem
- Low `completed` rate = User experience issue

**Financial Health Indicators:**
- Escrow balance = Credits held for active sessions
- Refund rate = Quality and reliability metric
- Mentor payout timing = Cash flow management
- Platform fee collection = Revenue tracking

**Quality Metrics:**
- Session completion rate
- Average session rating
- Technical issue frequency
- User satisfaction scores

---

## 🎯 Best Practices

### For Session Management
1. **Always validate access** before allowing video join
2. **Track all user interactions** for debugging and analytics
3. **Handle edge cases gracefully** with clear user communication
4. **Maintain financial integrity** through transaction safety
5. **Provide real-time feedback** to keep users informed

### For Error Handling
1. **Assume network issues will happen** - build retry logic
2. **Provide clear error messages** that users can understand
3. **Log everything** for post-incident analysis
4. **Have manual override capabilities** for edge cases
5. **Test all failure scenarios** regularly

### For User Experience
1. **Make session status always visible** and up-to-date
2. **Provide clear next steps** for each session state
3. **Send proactive notifications** for important changes
4. **Allow easy cancellation and rescheduling** when appropriate
5. **Gather feedback** to continuously improve the system

---

This comprehensive guide covers the entire SkillBridge session management system. The platform is designed to handle the complexity of real-world mentorship sessions while providing a smooth, reliable experience for all participants.

For technical implementation details, refer to the codebase documentation. For business process questions, consult the operations team.