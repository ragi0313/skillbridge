// Initialize application startup checks and services
import { EnvironmentValidator } from '@/lib/config/env-validation'
import { sessionMonitorService } from '@/lib/services/SessionMonitorService'

export function initializeApplication() {
  // 1. Validate environment variables
  EnvironmentValidator.logEnvironmentStatus()
  EnvironmentValidator.ensureValidEnvironment()
  
  // 2. Start session monitoring service
  if (process.env.NODE_ENV === 'production' || process.env.START_SESSION_MONITOR === 'true') {
    sessionMonitorService.start()
  } else {
    ')
  }
  
  }

// Auto-initialize when imported
initializeApplication()