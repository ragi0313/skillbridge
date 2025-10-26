import { EnvironmentValidator } from "@/lib/config/env-validation"

let initialized = false

export async function initializeServer() {
  if (initialized) {
    return
  }

  try {
    // Validate environment variables first
    EnvironmentValidator.logEnvironmentStatus()
    const config = EnvironmentValidator.ensureValidEnvironment()

    // Start session monitoring service (if available)
    try {
      const { sessionMonitorService } = await import("@/lib/services/SessionMonitorService")
      sessionMonitorService.start()
      } catch (error) {
      }

    // Initialize email worker (if Redis is available)
    try {
      const { initEmailWorker } = await import("@/lib/queues/email-queue")
      const worker = initEmailWorker()
      if (worker) {
        console.log('[SERVER_INIT] Email worker initialized successfully')
      } else {
        console.log('[SERVER_INIT] Email worker not initialized (Redis not available - emails will be sent synchronously)')
      }
    } catch (error) {
      console.error('[SERVER_INIT] Failed to initialize email worker:', error)
    }

    initialized = true
    } catch (error) {
    console.error('[SERVER_INIT] Error initializing services:', error)
    if (process.env.NODE_ENV === 'production') {
      process.exit(1)
    }
  }
}

// Cleanup function for graceful shutdown
export async function shutdownServer() {
  if (!initialized) {
    return
  }

  try {
    // Stop session monitoring service (if available)
    try {
      const { sessionMonitorService } = require("@/lib/services/SessionMonitorService")
      sessionMonitorService.stop()
      } catch (error) {
      }

    // Close email queue and worker
    try {
      const { closeEmailQueue } = require("@/lib/queues/email-queue")
      await closeEmailQueue()
      console.log('[SERVER_INIT] Email queue closed successfully')
    } catch (error) {
      console.error('[SERVER_INIT] Error closing email queue:', error)
    }

    initialized = false
    } catch (error) {
    console.error('[SERVER_INIT] Error shutting down services:', error)
  }
}

// Handle process termination - only in runtime, not during build
if (typeof process !== 'undefined' && process.env.NODE_ENV && typeof window === 'undefined') {
  process.on('SIGINT', shutdownServer)
  process.on('SIGTERM', shutdownServer)
}