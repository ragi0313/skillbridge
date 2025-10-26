/**
 * Cron job to cleanup old session chat messages
 * Schedule: Daily at 2 AM
 * Deletes messages older than 30 days from database
 */

import { NextRequest, NextResponse } from 'next/server'
import { sessionChatService } from '@/lib/services/SessionChatService'

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')

  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    console.log('[CRON] Starting session chat cleanup...')

    // Delete messages older than 30 days
    const deletedCount = await sessionChatService.cleanupOldMessages(30)

    console.log(`[CRON] Cleanup complete. Deleted ${deletedCount} messages.`)

    return NextResponse.json({
      success: true,
      deletedCount,
      message: `Cleaned up ${deletedCount} messages older than 30 days`,
    })
  } catch (error) {
    console.error('[CRON] Error during chat cleanup:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
