// Initialize application startup checks and services
import { EnvironmentValidator } from '@/lib/config/env-validation'
import { sessionMonitorService } from '@/lib/services/SessionMonitorService'

export function initializeApplication() {
  console.log('[STARTUP] Initializing SkillBridge application...')
  
  // 1. Validate environment variables
  EnvironmentValidator.logEnvironmentStatus()
  EnvironmentValidator.ensureValidEnvironment()
  
  // 2. Start session monitoring service
  if (process.env.NODE_ENV === 'production' || process.env.START_SESSION_MONITOR === 'true') {
    console.log('[STARTUP] Starting session monitor service...')
    sessionMonitorService.start()
  } else {
    console.log('[STARTUP] Session monitor not started (development mode)')
  }
  
  console.log('[STARTUP] Application initialization complete')
}

// Auto-initialize when imported
initializeApplication()