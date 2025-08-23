# Enhanced Session Monitoring System

This document describes the enhanced session monitoring system that provides continuous background monitoring, automatic status transitions, and real-time no-show detection.

## Overview

The enhanced monitoring system consists of multiple components working together to ensure session statuses are always accurate and transitions happen smoothly:

- **Continuous Background Monitoring**: Runs every 2 minutes to check session statuses
- **Automatic Status Transitions**: Smooth progression from confirmed → upcoming → ongoing → completed/no-show
- **Real-time No-show Detection**: Instant processing when grace period expires
- **Health Monitoring**: System health checks and error recovery

## Components

### 1. Auto Session Monitor (`lib/sessions/auto-session-monitor.ts`)

Main monitoring service that handles:
- Expired booking processing
- Status transitions to 'upcoming' (30 minutes before session)
- No-show detection and processing
- Auto-completion of overdue sessions
- Handling stuck sessions

**Key Features:**
- Runs comprehensive checks every 2 minutes
- Processes sessions in batches for efficiency
- Real-time broadcasting of status changes
- Robust error handling and recovery

### 2. Enhanced Session Management (`lib/sessions/session-management.ts`)

Improved session management with:
- Smooth status transitions
- Enhanced no-show detection logic
- Automatic session progression
- Real-time broadcasting integration

**Status Transition Flow:**
```
pending → confirmed → upcoming → ongoing → completed/no-show
```

### 3. Continuous Background Monitor (`scripts/background-session-monitor.js`)

Standalone background service for local development and production:
- Runs independently of the main application
- Configurable check intervals (default: 2 minutes)
- Health monitoring and statistics
- Graceful shutdown handling

### 4. Real-time Broadcasting (`app/api/sse/session-updates/route.ts`)

Server-Sent Events (SSE) system for real-time updates:
- Live status change notifications
- User-specific event delivery
- Connection management and cleanup
- Heartbeat monitoring

## Usage

### Development

#### Start Background Monitoring
```bash
npm run session:background-monitor
```

#### Single Monitoring Run
```bash
npm run session:monitor
```

#### Continuous Monitoring (Alternative)
```bash
npm run session:monitor:continuous
```

### Production

The system automatically runs via:
- **Vercel Cron**: Every 2 minutes (`*/2 * * * *`)
- **GitHub Actions**: Every 5 minutes for backup monitoring
- **Background Service**: Can be deployed as a separate process

## Configuration

### Environment Variables

```bash
# Monitoring intervals
MONITOR_INTERVAL_MINUTES=2        # Background service check interval
BASE_URL=http://localhost:3000    # API base URL
CRON_SECRET=your_secret_here      # Authentication for cron endpoints

# Session timing
NO_SHOW_GRACE_MINUTES=15          # Grace period for no-shows
UPCOMING_WINDOW_MINUTES=30        # When to mark sessions as upcoming
AUTO_COMPLETE_BUFFER_MINUTES=30   # Buffer for auto-completion
```

### Vercel Configuration

```json
{
  "crons": [
    {
      "path": "/api/cron/session-monitor",
      "schedule": "*/2 * * * *"
    }
  ]
}
```

## Status Transitions

### Automatic Transitions

1. **Confirmed → Upcoming**
   - Triggered: 30 minutes before session start
   - Action: Updates status, sends notifications
   - Broadcast: Real-time status update to users

2. **Upcoming → Ongoing**
   - Triggered: When both users join the session
   - Action: Marks session as active, records start time
   - Broadcast: Live transition notification

3. **Confirmed/Upcoming → No-Show**
   - Triggered: 15 minutes after scheduled start time
   - Types:
     - `both_no_show`: Neither party joined → Full refund
     - `learner_no_show`: Only mentor joined → Mentor gets paid
     - `mentor_no_show`: Only learner joined → Refund + bonus
   - Broadcast: No-show notification with outcome

4. **Ongoing → Completed**
   - Triggered: Session ends normally or auto-completion
   - Action: Process payments, finalize session
   - Broadcast: Completion notification

### Manual Transitions

Users can still manually trigger transitions through the UI, which are immediately processed and broadcasted.

## Monitoring and Health

### Health Checks

The system provides health endpoints:

```bash
GET /api/cron/session-monitor
```

Returns:
```json
{
  "health": {
    "pendingSessions": 5,
    "confirmedSessions": 12,
    "upcomingSessions": 3,
    "ongoingSessions": 2,
    "overdueBookings": 0
  }
}
```

### Service Statistics

Background monitor provides runtime statistics:
- Total monitoring cycles completed
- Last successful run timestamp
- Consecutive error count
- Connection status

### Logging

Comprehensive logging at all levels:
- **Info**: Normal operations and transitions
- **Success**: Completed actions with results
- **Warning**: Recoverable issues
- **Error**: Failed operations with details

## Error Handling

### Retry Logic
- Failed API calls retry up to 3 times
- Exponential backoff with 5-second delays
- Graceful degradation on persistent failures

### Recovery Mechanisms
- Stuck sessions automatically reset for re-processing
- Failed broadcasts don't block other operations
- Connection cleanup for orphaned SSE streams

### Monitoring Alerts
- High consecutive error rates logged
- Service health warnings for attention
- Failed monitoring cycles recorded

## Performance Optimizations

### Batch Processing
- Sessions processed in configurable batches (default: 50)
- Efficient database queries with proper indexing
- Minimal memory footprint

### Real-time Efficiency
- SSE connections only to relevant users
- Periodic cleanup of stale connections
- Heartbeat monitoring for active connections

### Database Optimization
- Single transaction for related operations
- Conditional updates to minimize writes
- Indexed queries for fast session lookup

## Security Considerations

### Authentication
- CRON_SECRET required for production endpoints
- User-specific SSE connections with session validation
- Role-based access to monitoring functions

### Rate Limiting
- Built-in intervals prevent excessive API calls
- Connection limits for SSE streams
- Timeout handling for long-running operations

## Troubleshooting

### Common Issues

1. **Background Monitor Not Starting**
   ```bash
   # Check if Next.js server is running
   npm run dev
   
   # Verify connectivity
   curl http://localhost:3000/api/cron/session-monitor
   ```

2. **No Status Updates Received**
   - Check SSE connection in browser dev tools
   - Verify user authentication
   - Confirm session IDs are correct

3. **High Error Rates**
   - Check database connectivity
   - Verify environment variables
   - Review application logs

### Debug Commands

```bash
# Test single monitoring cycle
node scripts/run-session-monitor.js

# Check system health
curl -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/session-monitor

# Monitor SSE connection
curl -N -H "Accept: text/event-stream" \
  http://localhost:3000/api/sse/session-updates
```

## Migration from Old System

The enhanced system is backward compatible and runs alongside existing components:

1. **Test Files Removed**: Manual test scripts are no longer needed
2. **API Compatibility**: Existing endpoints continue to work
3. **Database Schema**: No schema changes required
4. **Gradual Rollout**: New features can be enabled incrementally

## Future Enhancements

- Machine learning for no-show prediction
- Advanced analytics dashboard
- Custom notification preferences
- Webhook support for external integrations
- Multi-tenant monitoring capabilities

---

For support or questions, please check the troubleshooting section or review the application logs.