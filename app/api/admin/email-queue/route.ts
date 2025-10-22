import { NextRequest, NextResponse } from 'next/server'
import { getQueueMetrics } from '@/lib/queues/email-queue'
import { getSession } from '@/lib/auth/getSession'
import { logger } from '@/lib/monitoring/logger'

/**
 * GET /api/admin/email-queue
 * Get email queue metrics and status
 */
export async function GET(request: NextRequest) {
  try {
    // Validate admin session
    const session = await getSession()
    if (!session || session.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      )
    }

    // Get queue metrics
    const metrics = await getQueueMetrics()

    if (!metrics) {
      return NextResponse.json({
        queueEnabled: false,
        message: 'Email queue is not enabled. Emails are being sent synchronously.',
      })
    }

    logger.info('[EMAIL QUEUE API] Queue metrics requested', {
      adminId: session.id,
      metrics,
    })

    return NextResponse.json({
      queueEnabled: true,
      metrics,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    logger.error('[EMAIL QUEUE API] Error fetching queue metrics', {
      error: error.message,
    })

    return NextResponse.json(
      { error: 'Failed to fetch email queue metrics' },
      { status: 500 }
    )
  }
}
