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

    // Email worker will be initialized lazily on first use
    // to avoid instrumentation hook limitations with BullMQ
    console.log('[SERVER_INIT] Email worker will initialize on first use')

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
      const { closeEmailQueue } = require("@/lib/email/emailQueue")
      const { closeEmailTransporter } = require("@/lib/email/transporter")
      await closeEmailQueue()
      await closeEmailTransporter()
      console.log('[SERVER_INIT] Email services closed')
    } catch (error) {
      console.warn('[SERVER_INIT] Error closing email services:', error)
    }

    initialized = false
    } catch (error) {
    console.error('[SERVER_INIT] Error shutting down services:', error)
  }
}

// Handle process termination
if (typeof process !== 'undefined') {
  process.on('SIGINT', shutdownServer)
  process.on('SIGTERM', shutdownServer)
}