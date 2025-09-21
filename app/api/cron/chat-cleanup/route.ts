import { NextRequest, NextResponse } from 'next/server'
import { conversationCleanupService } from '@/lib/services/ConversationCleanupService'
import { getEnvConfig } from '@/lib/config/env-validation'

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const config = getEnvConfig()
    const authHeader = request.headers.get('authorization')
    const providedSecret = authHeader?.replace('Bearer ', '')

    if (!providedSecret || providedSecret !== config.CRON_SECRET) {
      console.warn('[CHAT_CLEANUP_CRON] Unauthorized access attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[CHAT_CLEANUP_CRON] Starting scheduled chat cleanup...')

    // Get current stats before cleanup
    const statsBefore = await conversationCleanupService.getCleanupStats()
    console.log('[CHAT_CLEANUP_CRON] Stats before cleanup:', statsBefore)

    // Run cleanup
    const results = await conversationCleanupService.runCleanup()

    // Get stats after cleanup
    const statsAfter = await conversationCleanupService.getCleanupStats()
    console.log('[CHAT_CLEANUP_CRON] Stats after cleanup:', statsAfter)

    // Return results
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
      statsBefore,
      statsAfter,
    })

  } catch (error) {
    console.error('[CHAT_CLEANUP_CRON] Cleanup failed:', error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}

// Optional: Allow GET to check cleanup stats without running cleanup
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for stats endpoint too
    const config = getEnvConfig()
    const authHeader = request.headers.get('authorization')
    const providedSecret = authHeader?.replace('Bearer ', '')

    if (!providedSecret || providedSecret !== config.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const stats = await conversationCleanupService.getCleanupStats()

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      stats,
    })

  } catch (error) {
    console.error('[CHAT_CLEANUP_CRON] Failed to get stats:', error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}