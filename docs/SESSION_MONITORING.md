# Session Monitoring System

## Overview

The SkillBridge session monitoring system automatically handles session status updates, no-show detection, and booking lifecycle management. This ensures that sessions are properly tracked and managed even when the application is not actively being used.

## Key Features

### 🤖 Automatic Session Status Updates
- **Upcoming Status**: Marks confirmed sessions as "upcoming" when they're within 30 minutes of start time
- **No-Show Detection**: Automatically detects and processes no-shows after a 20-minute grace period
- **Auto-Completion**: Completes overdue ongoing sessions based on participation duration
- **Stuck Session Recovery**: Handles sessions stuck in various states due to technical issues

### 💰 Financial Processing
- **Automatic Refunds**: Processes refunds for no-shows, technical issues, and cancellations
- **Mentor Payouts**: Automatically pays mentors for completed sessions and learner no-shows
- **Credit Transactions**: Maintains detailed transaction logs for all financial operations

### 📊 System Health Monitoring
- **Real-time Status**: Tracks pending, confirmed, upcoming, and ongoing sessions
- **Overdue Detection**: Identifies sessions that require attention
- **Error Tracking**: Logs and reports system errors for debugging

## Architecture

### Core Components

1. **AutoSessionMonitor** (`lib/sessions/auto-session-monitor.ts`)
   - Main monitoring service that orchestrates all session checks
   - Handles comprehensive session lifecycle management
   - Provides system health monitoring

2. **SessionManagementService** (`lib/sessions/session-management.ts`)
   - Handles no-show detection and processing
   - Tracks user join/leave events
   - Manages attendance data

3. **BookingLifecycleService** (`lib/sessions/booking-lifecycle.ts`)
   - Processes expired booking requests
   - Handles cancellations and refund policies
   - Manages booking validations

### API Endpoints

- **`/api/cron/session-monitor`** - Main endpoint for automatic monitoring
- **`/api/sessions/check-no-shows`** - Legacy no-show check endpoint
- **`/api/admin/check-no-shows`** - Admin-accessible no-show check

## Deployment Options

### 1. Vercel Automatic Cron Jobs (Recommended for Production)

The system includes a `vercel.json` configuration that automatically runs the session monitor every 10 minutes:

```json
{
  "crons": [
    {
      "path": "/api/cron/session-monitor",
      "schedule": "*/10 * * * *"
    }
  ]
}
```

**Setup:**
1. Deploy to Vercel
2. Set the `CRON_SECRET` environment variable
3. The system will automatically run every 10 minutes

### 2. Manual Script Execution (Development & Testing)

Run the session monitor manually using the provided scripts:

```bash
# Single run
npm run session:monitor

# Continuous monitoring (runs every 10 minutes)
npm run session:monitor:continuous

# Health check only
npm run session:health

# Legacy no-show check
npm run session:check-no-shows
```

### 3. System Cron Jobs (Linux/Unix Servers)

Add to your system crontab for server deployments:

```bash
# Edit crontab
crontab -e

# Add entry to run every 10 minutes
*/10 * * * * cd /path/to/skillbridge && node scripts/run-session-monitor.js
```

### 4. Windows Task Scheduler (Windows Servers)

1. Open Task Scheduler
2. Create Basic Task
3. Set trigger to repeat every 10 minutes
4. Set action to run: `node C:\path\to\skillbridge\scripts\run-session-monitor.js`

## Configuration

### Environment Variables

Required:
- `DATABASE_URL` - PostgreSQL database connection
- `JWT_SECRET` - For authentication

Optional:
- `CRON_SECRET` - Authenticates cron job requests (recommended for production)
- `BASE_URL` - Override base URL for monitoring script (default: http://localhost:3000)
- `MONITOR_INTERVAL` - Minutes between checks in continuous mode (default: 10)

### Monitoring Schedule

- **Default Frequency**: Every 10 minutes
- **Grace Period**: 20 minutes after scheduled session time
- **Join Window**: 30 minutes before session start time
- **Completion Timeout**: Sessions are auto-completed 30 minutes after scheduled end time

## Session Status Flow

```
pending → confirmed → upcoming → ongoing → completed/no_show/technical_issues
   ↓          ↓          ↓          ↓              ↓
expired    cancelled   no_show   auto-complete   archived
```

### Status Definitions

- **pending**: Awaiting mentor confirmation
- **confirmed**: Mentor accepted, waiting for session time
- **upcoming**: Within 30 minutes of start time, join window open
- **ongoing**: Session actively in progress
- **completed**: Session finished successfully
- **no_show**: One or both parties didn't attend
- **technical_issues**: Session ended due to technical problems
- **cancelled**: Manually cancelled by user
- **expired**: Booking request expired without response

## Monitoring & Alerts

### Health Check Endpoint

```bash
GET /api/cron/session-monitor
```

Returns system health status including:
- Pending sessions count
- Confirmed sessions count
- Upcoming sessions count
- Ongoing sessions count
- Overdue bookings count

### Manual Trigger

```bash
POST /api/cron/session-monitor
```

Manually triggers the complete session monitoring process.

## Troubleshooting

### Common Issues

1. **Sessions stuck in 'confirmed' status**
   - **Cause**: Monitoring system not running
   - **Solution**: Enable automatic monitoring or run manual script

2. **No-shows not being processed**
   - **Cause**: Grace period not yet passed or monitoring disabled
   - **Solution**: Wait for grace period (20 minutes) or trigger manual check

3. **Ongoing sessions not completing**
   - **Cause**: Auto-completion not triggered
   - **Solution**: Run session monitor to auto-complete overdue sessions

### Debugging

Enable detailed logging by checking the console output of the monitoring scripts:

```bash
# Run with verbose output
npm run session:monitor
```

### Manual Recovery

If sessions get stuck in incorrect states, you can:

1. **Run immediate check**: `npm run session:monitor`
2. **Check system health**: Get status via API endpoint
3. **Review logs**: Check application logs for errors
4. **Database inspection**: Directly query session statuses if needed

## Best Practices

1. **Monitor Regularly**: Set up automatic monitoring in production
2. **Set Secrets**: Always use `CRON_SECRET` in production
3. **Monitor Logs**: Regularly check monitoring output for errors
4. **Test Changes**: Run manual checks after system changes
5. **Health Checks**: Regularly verify system health status

## Security Considerations

- The cron endpoint is protected by `CRON_SECRET` in production
- Development mode allows unauthenticated access for testing
- Financial transactions are logged for audit purposes
- User data is handled according to privacy requirements

## Future Enhancements

- **Email Notifications**: Alert users about status changes
- **Metrics Dashboard**: Real-time monitoring interface
- **Advanced Analytics**: Session completion rates and patterns
- **Integration Webhooks**: Notify external systems of status changes