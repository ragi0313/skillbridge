// Automatic Session Monitoring Startup
// This module automatically starts background monitoring when the app initializes

import { startContinuousSessionMonitoring } from './auto-session-monitor'

let monitoringStarted = false
let startupTimeout: NodeJS.Timeout | null = null

/**
 * Initialize automatic session monitoring
 * This should be called when the app starts
 */
export function initializeSessionMonitoring(): void {
  // Prevent multiple initializations
  if (monitoringStarted) {
    console.log('🤖 Session monitoring already initialized')
    return
  }

  console.log('🚀 Initializing automatic session monitoring...')
  
  // Start monitoring after a short delay to ensure the app is fully loaded
  startupTimeout = setTimeout(() => {
    try {
      const monitor = startContinuousSessionMonitoring(1) // Check every 1 minute for responsiveness
      console.log('✅ Background session monitoring started automatically')
      monitoringStarted = true
      
      // Log status every 5 minutes
      const statusInterval = setInterval(() => {
        const info = monitor.getLastRunInfo()
        console.log(`📊 Session Monitor Status: Running=${info.isRunning}, LastRun=${info.lastRun?.toISOString() || 'Never'}`)
      }, 5 * 60 * 1000)
      
      // Cleanup on process exit
      process.on('exit', () => {
        clearInterval(statusInterval)
        monitor.stop()
      })
      
    } catch (error) {
      console.error('❌ Failed to start background session monitoring:', error)
      monitoringStarted = false
      
      // Retry after 30 seconds
      setTimeout(() => {
        monitoringStarted = false
        initializeSessionMonitoring()
      }, 30000)
    }
  }, 5000) // 5 second delay to ensure app is ready
}

/**
 * Check if monitoring has been initialized
 */
export function isMonitoringInitialized(): boolean {
  return monitoringStarted
}

/**
 * Force restart monitoring (for debugging)
 */
export function restartSessionMonitoring(): void {
  console.log('🔄 Restarting session monitoring...')
  monitoringStarted = false
  
  if (startupTimeout) {
    clearTimeout(startupTimeout)
  }
  
  initializeSessionMonitoring()
}

// Auto-initialize if we're in a server environment (not during build)
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'test') {
  // Delay initialization to avoid issues during Next.js build/startup
  setTimeout(() => {
    if (process.env.SKIP_AUTO_MONITORING !== 'true') {
      initializeSessionMonitoring()
    }
  }, 10000) // 10 second delay for app to fully initialize
}