# ⚠️ DEPRECATED MONITORING FILES

## 🚨 These files have been consolidated into `session-monitor-service.ts`

### **DO NOT USE - DEPRECATED:**

1. **`auto-session-monitor.ts`** ❌
   - **Status**: DEPRECATED
   - **Reason**: Had notification service errors and conflicts
   - **Replaced by**: `session-monitor-service.ts`

2. **`auto-monitor-service.ts`** ❌ 
   - **Status**: DEPRECATED
   - **Reason**: Caused duplicate processing conflicts
   - **Replaced by**: `session-monitor-service.ts`

3. **`unified-monitor.ts`** ❌
   - **Status**: DEPRECATED  
   - **Reason**: Renamed for clarity
   - **Replaced by**: `session-monitor-service.ts`

4. **`session-monitor.ts` (in cron/)** ❌
   - **Status**: DEPRECATED
   - **Reason**: Duplicate functionality
   - **Replaced by**: `session-monitor-service.ts`

### **✅ USE THIS INSTEAD:**

**File**: `session-monitor-service.ts`
- **API**: `/api/admin/session-monitor`
- **Features**: 
  - Complete session lifecycle management
  - No-show detection with database filtering
  - Status transitions (confirmed → upcoming → ongoing → completed)
  - Auto-completion of stuck sessions
  - Session reminders (when notification service is fixed)
  - Zero conflicts, zero errors
  - Comprehensive error handling

### **Migration Commands:**

```typescript
// OLD (don't use):
import { startUnifiedMonitoring } from '@/lib/sessions/unified-monitor'
import { runAutoSessionMonitor } from '@/lib/sessions/auto-session-monitor'
import { autoMonitorService } from '@/lib/sessions/auto-monitor-service'

// NEW (use this):
import { startSessionMonitoring, runSessionMonitorOnce } from '@/lib/sessions/session-monitor-service'

// Start monitoring
startSessionMonitoring(2) // 2-minute intervals

// Manual run
runSessionMonitorOnce()
```

### **API Usage:**

```bash
# Start monitoring  
curl -X POST /api/admin/session-monitor -d '{"action": "start", "intervalMinutes": 2}'

# Run manual cycle
curl -X POST /api/admin/session-monitor -d '{"action": "run"}'

# Check status
curl -X GET /api/admin/session-monitor

# Stop monitoring
curl -X POST /api/admin/session-monitor -d '{"action": "stop"}'
```

## 🗑️ Safe to Delete

These files can be safely deleted after confirming the new system is working:

- `lib/sessions/auto-session-monitor.ts`
- `lib/sessions/auto-monitor-service.ts` 
- `lib/sessions/unified-monitor.ts`
- `lib/cron/session-monitor.ts`
- `app/api/admin/unified-monitor/route.ts`

**Keep these:**
- `lib/sessions/session-monitor-service.ts` ✅
- `lib/sessions/session-management.ts` ✅ (used by monitor service)
- `lib/sessions/booking-lifecycle.ts` ✅ (used by monitor service)  
- `app/api/admin/session-monitor/route.ts` ✅