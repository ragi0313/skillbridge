// Comprehensive Auto-Monitoring Service
// This service ensures monitoring runs continuously and handles all sessions

import { db } from "@/db"
import { bookingSessions } from "@/db/schema"
import { runAutoSessionMonitor } from "./auto-session-monitor"
import { runEnhancedSessionMonitoring } from "./session-management"

class AutoMonitorService {
  private static instance: AutoMonitorService
  private intervalId: NodeJS.Timeout | null = null
  private isRunning = false
  private checkInterval = 60000 // 1 minute for development, can be adjusted
  private lastRun: Date | null = null
  private totalRuns = 0
  private errors: string[] = []

  static getInstance(): AutoMonitorService {
    if (!AutoMonitorService.instance) {
      AutoMonitorService.instance = new AutoMonitorService()
    }
    return AutoMonitorService.instance
  }

  private constructor() {
    // Auto-start in non-test environments
    if (typeof window === 'undefined' && process.env.NODE_ENV !== 'test') {
      this.autoStart()
    }
  }

  private autoStart() {
    // Start after a short delay to allow app to initialize
    setTimeout(() => {
      this.start()
    }, 5000)
  }

  public start(intervalMinutes: number = 1): void {
    if (this.isRunning) {
      console.log('🤖 Auto-monitoring service is already running')
      return
    }

    this.checkInterval = intervalMinutes * 60 * 1000
    this.isRunning = true

    console.log('🚀 Starting auto-monitoring service')
    console.log(`   Check interval: ${intervalMinutes} minute(s)`)
    console.log(`   Process ID: ${process.pid}`)

    // Run immediately first
    this.runMonitoringCycle().catch(error => {
      console.error('❌ Initial monitoring cycle failed:', error)
    })

    // Then run on interval
    this.intervalId = setInterval(() => {
      this.runMonitoringCycle().catch(error => {
        console.error('❌ Scheduled monitoring cycle failed:', error)
      })
    }, this.checkInterval)

    // Handle process signals
    process.on('SIGTERM', () => this.stop())
    process.on('SIGINT', () => this.stop())
    process.on('beforeExit', () => this.stop())

    console.log('✅ Auto-monitoring service started successfully')
  }

  public stop(): void {
    if (!this.isRunning) {
      return
    }

    console.log('🛑 Stopping auto-monitoring service...')
    this.isRunning = false

    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }

    console.log('✅ Auto-monitoring service stopped')
  }

  public getStatus(): {
    isRunning: boolean
    lastRun: Date | null
    totalRuns: number
    recentErrors: string[]
    nextRunIn?: number
  } {
    const nextRunIn = this.isRunning && this.lastRun 
      ? Math.max(0, this.checkInterval - (Date.now() - this.lastRun.getTime()))
      : undefined

    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      totalRuns: this.totalRuns,
      recentErrors: this.errors.slice(-5), // Last 5 errors
      nextRunIn
    }
  }

  private async runMonitoringCycle(): Promise<void> {
    if (!this.isRunning) return

    const startTime = Date.now()
    this.lastRun = new Date()
    this.totalRuns++

    try {
      console.log(`[${this.lastRun.toISOString()}] 🔍 Running comprehensive monitoring cycle #${this.totalRuns}`)

      // First check how many sessions we have to monitor
      const sessionCounts = await this.getSessionCounts()
      console.log('📊 Session counts:', sessionCounts)

      if (sessionCounts.total === 0) {
        console.log('ℹ️  No sessions to monitor')
        return
      }

      // Run the comprehensive monitoring
      const [autoResult, enhancedResult] = await Promise.all([
        runAutoSessionMonitor().catch(error => {
          console.error('Auto monitor failed:', error)
          this.errors.push(`Auto monitor: ${error.message}`)
          return null
        }),
        runEnhancedSessionMonitoring().catch(error => {
          console.error('Enhanced monitoring failed:', error)
          this.errors.push(`Enhanced monitor: ${error.message}`)
          return null
        })
      ])

      const duration = Date.now() - startTime

      // Log results
      if (autoResult) {
        const hasActivity = autoResult.noShowsProcessed > 0 || 
                           autoResult.expiredBookingsProcessed > 0 || 
                           autoResult.statusUpdates > 0

        if (hasActivity) {
          console.log('✅ Auto monitoring completed with activity:')
          console.log(`   No-shows: ${autoResult.noShowsProcessed}`)
          console.log(`   Expired bookings: ${autoResult.expiredBookingsProcessed}`)
          console.log(`   Status updates: ${autoResult.statusUpdates}`)
        } else {
          console.log('✅ Auto monitoring completed (no changes needed)')
        }

        if (autoResult.errors.length > 0) {
          console.log('⚠️  Auto monitoring errors:', autoResult.errors)
          this.errors.push(...autoResult.errors.map(e => `Auto: ${e}`))
        }
      }

      if (enhancedResult && enhancedResult.totalProcessed > 0) {
        console.log('✅ Enhanced monitoring processed:', enhancedResult.totalProcessed, 'items')
        if (enhancedResult.totalErrors.length > 0) {
          console.log('⚠️  Enhanced monitoring errors:', enhancedResult.totalErrors)
          this.errors.push(...enhancedResult.totalErrors.map(e => `Enhanced: ${e}`))
        }
      }

      console.log(`⏱️  Monitoring cycle completed in ${duration}ms`)

      // Limit error history
      if (this.errors.length > 20) {
        this.errors = this.errors.slice(-10)
      }

    } catch (error) {
      const errorMsg = `Monitoring cycle failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      console.error('❌', errorMsg)
      this.errors.push(errorMsg)
    }
  }

  private async getSessionCounts(): Promise<{
    total: number
    pending: number
    confirmed: number
    upcoming: number
    ongoing: number
  }> {
    try {
      const results = await db
        .select({
          status: bookingSessions.status,
        })
        .from(bookingSessions)

      const counts = {
        total: results.length,
        pending: 0,
        confirmed: 0,
        upcoming: 0,
        ongoing: 0
      }

      results.forEach(session => {
        switch (session.status) {
          case 'pending': counts.pending++; break
          case 'confirmed': counts.confirmed++; break
          case 'upcoming': counts.upcoming++; break
          case 'ongoing': counts.ongoing++; break
        }
      })

      return counts
    } catch (error) {
      console.error('Error getting session counts:', error)
      return { total: 0, pending: 0, confirmed: 0, upcoming: 0, ongoing: 0 }
    }
  }
}

// Export singleton instance
export const autoMonitorService = AutoMonitorService.getInstance()

// Export convenience functions
export function startAutoMonitoring(intervalMinutes: number = 1): void {
  autoMonitorService.start(intervalMinutes)
}

export function stopAutoMonitoring(): void {
  autoMonitorService.stop()
}

export function getMonitoringStatus() {
  return autoMonitorService.getStatus()
}