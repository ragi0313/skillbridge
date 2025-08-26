# 1-on-1 Video Call System - Complete Guide

## Overview

SkillBridge provides a comprehensive 1-on-1 video calling system for mentoring sessions. The system is built on **Agora.io** and handles everything from session scheduling to automatic completion, ensuring a smooth mentoring experience for both learners and mentors.

## How It Works

### 1. Session Lifecycle

**Step 1: Booking Creation**
- Learner requests a session with a mentor
- Credits are escrowed (held) until session completion
- Mentor has 24 hours to confirm or reject

**Step 2: Session Confirmation**
- Once mentor confirms, session status becomes "confirmed"
- 30 minutes before start time, status changes to "upcoming"
- Both parties can join the waiting room

**Step 3: Waiting Room Experience**
- Available 30 minutes before session start time
- Camera/microphone testing and setup
- Real-time participant status updates
- Auto-transition to video call at session start time

**Step 4: Live Video Session**
- Full HD video and audio communication
- Screen sharing capabilities (if enabled)
- Session timer and controls
- Auto-completion when time expires

**Step 5: Session Completion**
- Automatic completion when session time ends
- Payment processing (mentor gets 80%, platform keeps 20%)
- Notifications sent to both parties
- Option for learners to rate the mentor

### 2. Key Features

#### Real-Time Communication
- **High-quality video and audio** using Agora.io infrastructure
- **Global connectivity** with optimized routing
- **Automatic quality adjustment** based on network conditions
- **Echo cancellation and noise reduction**

#### Smart Session Management
- **Automatic status updates** based on time and participant actions
- **No-show detection** with appropriate refund/payment handling
- **Grace periods** for late joiners (15 minutes)
- **Force disconnect** for security and session integrity

#### Robust Waiting Room
- **Device testing** before joining the actual call
- **Preview your camera and audio** settings
- **Real-time status** of other participants
- **Countdown timer** showing exact time until session starts

#### Financial Protection
- **Escrow system** holds learner credits until completion
- **Automatic refunds** for mentor no-shows or cancellations
- **Fair compensation** for mentor no-shows (mentor gets full payment)
- **Transparent fee structure** (20% platform fee)

## User Experience Flow

### For Learners

1. **Book a Session**
   - Browse mentor profiles and availability
   - Select time slot and pay with credits
   - Wait for mentor confirmation (up to 24 hours)

2. **Join Session**
   - Receive notification when session is ready (30 min before)
   - Click join link to enter waiting room
   - Test camera/microphone and wait for mentor
   - Auto-transition to video call at start time

3. **During Session**
   - Full video/audio communication with mentor
   - View session timer and remaining time
   - End session early if needed
   - Session auto-completes when time expires

4. **After Session**
   - Receive completion notification
   - Rate and review the mentor
   - Credits are transferred to mentor

### For Mentors

1. **Receive Booking**
   - Get notification of new booking request
   - Review learner profile and session details
   - Confirm or reject within 24 hours

2. **Join Session**
   - Receive notification when session is ready (30 min before)
   - Enter waiting room for device testing
   - See when learner joins the waiting room
   - Auto-transition to video call at start time

3. **During Session**
   - Conduct mentoring session with full communication tools

4. **After Session**
   - Receive payment notification
   - Credits added to account (80% of session fee)
   - View session completion in dashboard

## Technical Architecture



### Session States

- **pending**: Awaiting mentor response (24 hour limit)
- **confirmed**: Mentor confirmed, session scheduled
- **upcoming**: Within 30 minutes of start time
- **ongoing**: Video call in progress
- **completed**: Session finished successfully
- **cancelled**: Manually cancelled by either party
- **rejected**: Mentor declined the booking
- **both_no_show**: Neither party joined within grace period
- **learner_no_show**: Only mentor showed up
- **mentor_no_show**: Only learner showed up
- **mentor_no_response**: Mentor didn't respond within 24 hours
- **technical_issues**: Session ended due to technical problems

## Security & Privacy

### Token-Based Security
- **Secure Agora tokens** generated for each session
- **Time-limited access** (4-hour token expiration)
- **Channel isolation** - each session has unique channel ID
- **Role-based permissions** for participants

### Privacy Protection
- **No recording by default** (can be enabled if needed)
- **Secure connection** with end-to-end encryption
- **Automatic cleanup** of session resources
- **User data protection** following privacy guidelines

### Fraud Prevention
- **Unique user IDs** prevent impersonation
- **Session validation** ensures authorized access only
- **Automatic termination** of sessions past their time limit
- **Force disconnect** capability for security incidents

## Troubleshooting Common Issues

### Connection Problems
- **Check camera/microphone permissions** in browser
- **Test devices** in waiting room before session starts
- **Ensure stable internet connection** (minimum 1 Mbps recommended)
- **Disable VPN** if causing connection issues
- **Use Chrome or Firefox** for best compatibility

### Session Access Issues
- **Join within the allowed time window** (30 minutes before to session end)
- **Ensure session is confirmed** by mentor
- **Check notification settings** for session updates
- **Clear browser cache** if experiencing loading issues

### Payment/Refund Issues
- **Full refunds** automatically processed for mentor no-shows
- **No refunds** for learner no-shows (mentor receives compensation)
- **Partial refunds** may be available for technical issues
- **Contact support** for unusual payment scenarios

### Audio/Video Quality Issues
- **Close other applications** using camera/microphone
- **Check bandwidth** requirements (1-3 Mbps per participant)
- **Use wired internet connection** when possible
- **Update browser** to latest version
- **Restart browser** if issues persist

## Integration Points

### Database Tables
- `booking_sessions` - Main session records and status
- `learners` - Learner profiles and credit balances
- `mentors` - Mentor profiles and earnings
- `credit_transactions` - Financial transaction history
- `mentor_payouts` - Payment records for mentors
- `notifications` - System notifications for users



### Real-Time Updates
- **Server-Sent Events (SSE)** for live session status updates
- **Automatic page refresh** for critical session transitions
- **Push notifications** for important session events

## Best Practices

### For Platform Administrators
- **Monitor session completion rates** and identify issues early
- **Review no-show patterns** and implement improvements
- **Ensure Agora credentials** are properly configured
- **Set up monitoring alerts** for system failures
- **Regular backup** of session and financial data

### For Development Team
- **Test video calls thoroughly** across different devices/browsers
- **Handle network failures gracefully** with proper error messages
- **Implement proper logging** for troubleshooting issues
- **Follow security guidelines** for token generation and storage
- **Monitor performance metrics** and optimize as needed

### For User Success Team
- **Guide users through first-time setup** of camera/microphone
- **Provide clear instructions** for joining sessions
- **Help troubleshoot technical issues** quickly
- **Document common problems** and solutions
- **Collect feedback** for continuous improvement

## Future Enhancements

### Planned Features
- **Mobile app support** with responsive view
- **Recording capabilities** with user consent
- **Screen sharing tools** for technical mentoring
- **Whiteboard integration** for collaborative sessions
- **Breakout rooms** for group mentoring sessions

### Technical Improvements
- **Better network resilience** with automatic reconnection
- **Advanced video controls** (virtual backgrounds, filters)
- **Improved audio processing** with AI noise cancellation
- **Analytics dashboard** for session insights
- **Integration with calendar systems** for scheduling

- Implement video room components dark mode waiting room, video session room with chat and file attachments and review and feedback at the end of the session
- If the endTime of the video session is met, automatically remove both users from the video session room or if a no show detection occurs on either learner and mentor throw them out of the session room
- the url params is /session?=agorachannel
- also create api routes on sessions/[id] folder if needed