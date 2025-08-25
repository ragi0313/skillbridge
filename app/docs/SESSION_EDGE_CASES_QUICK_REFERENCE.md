# Session Management Edge Cases - Quick Reference

## 🚨 Critical Edge Cases & Solutions

### Connection & Network Issues

| **Scenario** | **Detection** | **Auto-Action** | **Manual Override** |
|--------------|---------------|------------------|---------------------|
| User loses internet mid-session | Client disconnection event | 3 auto-reconnect attempts → technical issues completion | Admin can force-complete as successful |
| Server crash during session | SSE connection lost | Clients continue P2P, server catches up on restart | Manual session completion review |
| Agora service down | Token generation fails | Auto-reschedule + full refund | Switch to backup video provider |
| Both users have poor connection | Network quality < "poor" for >5min | Offer technical issues completion | Manual completion with partial refund |

### Timing & Scheduling Edge Cases

| **Scenario** | **Detection** | **Auto-Action** | **Manual Override** |
|--------------|---------------|------------------|---------------------|
| User joins at exactly 15:00 grace cutoff | Timestamp within 10 seconds of cutoff | Allow join, cancel no-show | Admin can still mark no-show if abuse |
| Clock skew between client/server | Time difference > 2 minutes | Use server time as authoritative | Sync with NTP service |
| Session runs over scheduled time | Current time > endTime | 5min grace → force completion | Admin can extend session time |
| User joins before 30min window | startTime - now > 30min | Show waiting room | Admin can enable early access |

### Participant Management Edge Cases

| **Scenario** | **Detection** | **Auto-Action** | **Manual Override** |
|--------------|---------------|------------------|---------------------|
| Same user, multiple browsers | Duplicate active connection | Block new connection with error | Admin force-disconnect old session |
| User never properly leaves | joinedAt exists, no leftAt after 2hrs | Mark as left, cleanup resources | Manual connection cleanup |
| Wrong user joins session | User ID not in session participants | Block at API level | No override (security violation) |
| 3rd person tries to join | Participant count > 2 | Block with "session full" error | No override (1-on-1 rule) |

### Payment & Financial Edge Cases

| **Scenario** | **Detection** | **Auto-Action** | **Manual Override** |
|--------------|---------------|------------------|---------------------|
| Payment fails during completion | Payment API error | Queue for retry, mark session completed | Manual payment processing |
| Double refund request | Multiple refund attempts | Block after first successful refund | Admin can issue additional credit |
| Mentor payment fails | Payout API error | Retry 3x, escalate to manual | Manual payout + notification |
| User disputes no-show | Support ticket | No automatic action | Admin review with session logs |

### Video Call Edge Cases

| **Scenario** | **Detection** | **Auto-Action** | **Manual Override** |
|--------------|---------------|------------------|---------------------|
| Agora channel creation fails | API error on channel setup | Retry 3x → reschedule session | Create channel manually |
| Participant count shows wrong | Agora API inconsistency | Trust database over Agora count | Manual participant audit |
| Recording fails (if enabled) | Recording API error | Continue session, log failure | Manual recording retrieval |
| Token expires during session | Token expiration error | Auto-refresh token | Generate new token manually |

## 🔧 System Recovery Procedures

### Server Restart Recovery
```bash
# 1. Check for orphaned sessions
SELECT * FROM booking_sessions WHERE status = 'ongoing' AND agora_call_ended_at IS NULL;

# 2. Run manual monitoring cycle
curl -X GET /api/admin/session-monitor

# 3. Check for missed no-shows
# Sessions past 15min grace period that should be marked no-show
SELECT * FROM booking_sessions 
WHERE status IN ('confirmed', 'upcoming') 
AND start_time + INTERVAL '15 minutes' < NOW();
```

### Database Inconsistency Recovery
```sql
-- Fix stuck upcoming sessions
UPDATE booking_sessions 
SET status = 'confirmed' 
WHERE status = 'upcoming' AND start_time > NOW() + INTERVAL '10 minutes';

-- Mark abandoned ongoing sessions as completed
UPDATE booking_sessions 
SET status = 'completed', agora_call_ended_at = end_time 
WHERE status = 'ongoing' AND end_time < NOW() - INTERVAL '1 hour';

-- Clean up orphaned Agora channels
UPDATE booking_sessions 
SET agora_call_ended_at = NOW() 
WHERE agora_channel_name IS NOT NULL AND agora_call_ended_at IS NULL AND status IN ('completed', 'cancelled');
```

## ⚠️ Warning Conditions

### Immediate Action Required
- **Session Monitor offline > 5 minutes**: Manual monitoring needed
- **No-show rate > 50% in 1 hour**: Likely technical issue
- **Payment failure rate > 10%**: Payment provider issue
- **SSE connection failure > 80%**: Real-time updates broken

### Investigation Needed
- **Participant count mismatch**: Agora/DB sync issue
- **Sessions stuck in 'upcoming' > 1 hour**: Status update failure
- **High technical issues completion rate**: Video quality problems
- **Users reporting "already connected" errors**: Connection cleanup issue

## 🎯 Testing Edge Cases

### Manual Test Scenarios
1. **Network Interruption Test**
   - Join session → disconnect internet → reconnect after 2 minutes
   - Expected: Auto-reconnection or technical issues completion

2. **Grace Period Boundary Test**
   - Schedule session → join at exactly 14:59, 15:00, 15:01 after start
   - Expected: Join allowed at 14:59 and 15:00, no-show at 15:01

3. **Duplicate Connection Test**
   - Join from browser A → try joining from browser B
   - Expected: Second connection blocked with error message

4. **Session Overrun Test**
   - Stay in call past scheduled end time
   - Expected: Completion warning → automatic completion after grace

### Automated Test Cases
```javascript
// No-show detection timing
test('no-show detection at exact 15 minute mark', async () => {
  const session = await createTestSession()
  await advanceTimeTo(session.startTime + '15:00:00')
  await runMonitoringCycle()
  expect(session.status).toBe('both_no_show')
})

// Participant limit enforcement
test('third participant blocked', async () => {
  const session = await createTestSession()
  await joinAsLearner()
  await joinAsMentor()
  const result = await joinAsUnauthorizedUser()
  expect(result.error).toBe('Session is full')
})

// Connection state consistency
test('left timestamp updated on disconnect', async () => {
  const session = await createTestSession()
  await joinAsLearner()
  await leaveAsLearner()
  expect(session.learnerLeftAt).toBeTruthy()
})
```

## 📊 Monitoring Queries

### Session Health Check
```sql
-- Sessions that might need attention
SELECT 
  id,
  status,
  start_time,
  end_time,
  learner_joined_at,
  mentor_joined_at,
  agora_call_ended_at,
  CASE 
    WHEN status = 'upcoming' AND start_time < NOW() - INTERVAL '1 hour' THEN 'STUCK_UPCOMING'
    WHEN status = 'ongoing' AND end_time < NOW() - INTERVAL '30 minutes' THEN 'OVERDUE_ONGOING'
    WHEN agora_channel_name IS NOT NULL AND agora_call_ended_at IS NULL AND status IN ('completed', 'cancelled') THEN 'ORPHANED_CHANNEL'
    WHEN status IN ('confirmed', 'upcoming') AND start_time + INTERVAL '15 minutes' < NOW() AND learner_joined_at IS NULL AND mentor_joined_at IS NULL THEN 'MISSED_NO_SHOW'
    ELSE 'OK'
  END as issue_type
FROM booking_sessions 
WHERE created_at > NOW() - INTERVAL '24 hours'
HAVING issue_type != 'OK';
```

### Performance Metrics
```sql
-- Session completion rates
SELECT 
  DATE(start_time) as date,
  COUNT(*) as total_sessions,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
  SUM(CASE WHEN status LIKE '%no_show' THEN 1 ELSE 0 END) as no_shows,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as completion_rate
FROM booking_sessions 
WHERE start_time > NOW() - INTERVAL '7 days'
GROUP BY DATE(start_time)
ORDER BY date DESC;
```

## 🚀 Quick Fixes

### User Can't Join Session
1. Check session status: `SELECT status FROM booking_sessions WHERE id = ?`
2. Verify user authorization: Match learner/mentor ID
3. Check timing: Must be within 30min of start time
4. Clear existing connection: Set `*_left_at = NOW()` if needed

### Session Stuck in Wrong Status  
1. **Stuck in 'upcoming'**: Check if past start time → update to 'confirmed'
2. **Stuck in 'ongoing'**: Check if past end time → update to 'completed'
3. **Never marked no-show**: Check if past grace period → run no-show detection

### Payment Issues
1. **Refund failed**: Check credit_transactions table for retry
2. **Mentor not paid**: Check mentor_payouts table, retry if needed
3. **Double charge**: Look for duplicate transactions, reverse if confirmed

### Video Call Problems
1. **No video**: Check camera permissions, regenerate Agora token
2. **Can't hear audio**: Check microphone permissions, audio device settings
3. **Connection failed**: Try different browser, check firewall/VPN

This quick reference should help you handle most edge cases that arise in the session management system!