import { NextRequest, NextResponse } from "next/server"
import { metrics } from "@/lib/monitoring/metrics"
import { getSession } from "@/lib/auth/getSession"

export async function GET(request: NextRequest) {
  // Simple admin check - in production you'd want proper admin authentication
  const session = await getSession()

  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const url = new URL(request.url)
    const date = url.searchParams.get('date') // YYYY-MM-DD format
    const metric = url.searchParams.get('metric') // specific metric name

    if (metric) {
      // Get specific metric
      const metricData = await metrics.getMetric(metric, date || undefined)
      return NextResponse.json({
        metric,
        date: date || new Date().toISOString().split('T')[0],
        data: metricData
      })
    } else {
      // Get summary of common metrics
      const targetDate = date || new Date().toISOString().split('T')[0]

      const commonMetrics = [
        'api.request.count',
        'api.request.duration',
        'chat.messages.sent',
        'chat.messages.received',
        'files.upload.count',
        'auth.login',
        'errors.count',
        'pusher.connection',
        'rate_limit.hits'
      ]

      const metricsData: Record<string, any> = {}

      await Promise.all(
        commonMetrics.map(async (metricName) => {
          try {
            const data = await metrics.getMetric(metricName, targetDate)
            if (data) {
              metricsData[metricName] = data
            }
          } catch (error) {
            console.error(`Failed to get metric ${metricName}:`, error)
          }
        })
      )

      return NextResponse.json({
        date: targetDate,
        metrics: metricsData,
        summary: {
          totalApiRequests: metricsData['api.request.count']?.count || 0,
          averageResponseTime: metricsData['api.request.duration']?.avg || 0,
          totalMessages: metricsData['chat.messages.sent']?.count || 0,
          totalErrors: metricsData['errors.count']?.count || 0,
          rateLimitHits: metricsData['rate_limit.hits']?.count || 0
        }
      })
    }
  } catch (error) {
    console.error('Error fetching metrics:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}