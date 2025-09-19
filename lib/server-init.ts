import { EnvironmentValidator } from "@/lib/config/env-validation"

let initialized = false

export async function initializeServer() {
  if (initialized) {
    return
  }

  console.log('[SERVER_INIT] Starting server initialization...')

  try {
    // Validate environment variables first
    console.log('[SERVER_INIT] Validating environment configuration...')
    EnvironmentValidator.logEnvironmentStatus()
    const config = EnvironmentValidator.ensureValidEnvironment()

    console.log('[SERVER_INIT] Environment validation completed successfully')

    // Start session monitoring service (if available)
    try {
      const { sessionMonitorService } = await import("@/lib/services/SessionMonitorService")
      sessionMonitorService.start()
      console.log('[SERVER_INIT] Session monitoring service started')
    } catch (error) {
      console.warn('[SERVER_INIT] Session monitoring service not available:', error)
    }

    initialized = true
    console.log('[SERVER_INIT] Server initialization completed successfully')
  } catch (error) {
    console.error('[SERVER_INIT] Error initializing services:', error)
    if (process.env.NODE_ENV === 'production') {
      process.exit(1)
    }
  }
}

// Cleanup function for graceful shutdown
export function shutdownServer() {
  if (!initialized) {
    return
  }

  console.log('[SERVER_INIT] Starting graceful shutdown...')

  try {
    // Stop session monitoring service (if available)
    try {
      const { sessionMonitorService } = require("@/lib/services/SessionMonitorService")
      sessionMonitorService.stop()
      console.log('[SERVER_INIT] Session monitoring service stopped')
    } catch (error) {
      console.warn('[SERVER_INIT] Session monitoring service not available for shutdown')
    }

    initialized = false
    console.log('[SERVER_INIT] Graceful shutdown completed')
  } catch (error) {
    console.error('[SERVER_INIT] Error shutting down services:', error)
  }
}

// Handle process termination
if (typeof process !== 'undefined') {
  process.on('SIGINT', shutdownServer)
  process.on('SIGTERM', shutdownServer)
}