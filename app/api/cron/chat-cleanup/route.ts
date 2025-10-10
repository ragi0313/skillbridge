import { NextRequest, NextResponse } from 'next/server'
import { getEnvConfig } from '@/lib/config/env-validation'

// NOTE: ConversationCleanupService is temporarily disabled due to errors
// TODO: Fix ConversationCleanupService.ts and re-enable this endpoint

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const config = getEnvConfig()
    const authHeader = request.headers.get('authorization')
    const providedSecret = authHeader?.replace('Bearer ', '')

    if (!providedSecret || providedSecret !== config.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Temporarily disabled - ConversationCleanupService needs fixing
    return NextResponse.json({
      success: false,
      error: 'Chat cleanup service temporarily disabled',
      timestamp: new Date().toISOString(),
    }, { status: 503 })

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

    // Temporarily disabled - ConversationCleanupService needs fixing
    return NextResponse.json({
      success: false,
      error: 'Chat cleanup service temporarily disabled',
      timestamp: new Date().toISOString(),
    }, { status: 503 })

  } catch (error) {
    console.error('[CHAT_CLEANUP_CRON] Failed to get stats:', error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}