import { sessionMonitorService } from "@/lib/services/SessionMonitorService"

let initialized = false

export function initializeServer() {
  if (initialized) {
    return
  }

  console.log('[SERVER_INIT] Initializing server services...')
  
  try {
    // Start session monitoring service
    sessionMonitorService.start()
    
    initialized = true
    console.log('[SERVER_INIT] All services initialized successfully')
  } catch (error) {
    console.error('[SERVER_INIT] Error initializing services:', error)
  }
}

// Cleanup function for graceful shutdown
export function shutdownServer() {
  if (!initialized) {
    return
  }

  console.log('[SERVER_INIT] Shutting down server services...')
  
  try {
    sessionMonitorService.stop()
    initialized = false
    console.log('[SERVER_INIT] All services shut down successfully')
  } catch (error) {
    console.error('[SERVER_INIT] Error shutting down services:', error)
  }
}

// Handle process termination
if (typeof process !== 'undefined') {
  process.on('SIGINT', shutdownServer)
  process.on('SIGTERM', shutdownServer)
}