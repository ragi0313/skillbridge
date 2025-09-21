import { getCache } from "@/lib/cache/redis"

// Metrics collection and aggregation system
interface MetricEvent {
  name: string
  value: number
  timestamp: Date
  tags?: Record<string, string | number>
}

interface AggregatedMetric {
  count: number
  sum: number
  avg: number
  min: number
  max: number
  lastUpdate: Date
}

class MetricsCollector {
  private cache = getCache()
  private metricsBuffer: MetricEvent[] = []
  private flushInterval: NodeJS.Timeout | null = null
  private readonly bufferSize = 100
  private readonly flushIntervalMs = 30000 // 30 seconds

  constructor() {
    this.startFlushTimer()
  }

  private startFlushTimer() {
    this.flushInterval = setInterval(() => {
      this.flush()
    }, this.flushIntervalMs)
  }

  private async flush() {
    if (this.metricsBuffer.length === 0) return

    const metrics = [...this.metricsBuffer]
    this.metricsBuffer = []

    try {
      await this.persistMetrics(metrics)
    } catch (error) {
      console.error('Failed to persist metrics:', error)
      // Re-add metrics to buffer for retry (with size limit)
      this.metricsBuffer = [...metrics.slice(-50), ...this.metricsBuffer]
    }
  }

  private async persistMetrics(metrics: MetricEvent[]) {
    const promises = metrics.map(metric => this.updateAggregatedMetric(metric))
    await Promise.all(promises)
  }

  private async updateAggregatedMetric(metric: MetricEvent) {
    const key = this.getMetricKey(metric.name, metric.tags)

    try {
      const existingData = await this.cache.get(key)
      let aggregated: AggregatedMetric

      if (existingData) {
        const existing = JSON.parse(existingData) as AggregatedMetric
        aggregated = {
          count: existing.count + 1,
          sum: existing.sum + metric.value,
          avg: (existing.sum + metric.value) / (existing.count + 1),
          min: Math.min(existing.min, metric.value),
          max: Math.max(existing.max, metric.value),
          lastUpdate: metric.timestamp
        }
      } else {
        aggregated = {
          count: 1,
          sum: metric.value,
          avg: metric.value,
          min: metric.value,
          max: metric.value,
          lastUpdate: metric.timestamp
        }
      }

      // Store with 24 hour expiry
      await this.cache.set(key, JSON.stringify(aggregated), 24 * 60 * 60 * 1000)
    } catch (error) {
      console.error(`Failed to update metric ${key}:`, error)
    }
  }

  private getMetricKey(name: string, tags?: Record<string, string | number>): string {
    const date = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    const tagString = tags ? Object.entries(tags).map(([k, v]) => `${k}:${v}`).join(',') : ''
    return `metrics:${date}:${name}${tagString ? `:${tagString}` : ''}`
  }

  // Public methods
  increment(name: string, value: number = 1, tags?: Record<string, string | number>) {
    this.record(name, value, tags)
  }

  record(name: string, value: number, tags?: Record<string, string | number>) {
    const metric: MetricEvent = {
      name,
      value,
      timestamp: new Date(),
      tags
    }

    this.metricsBuffer.push(metric)

    // Flush if buffer is full
    if (this.metricsBuffer.length >= this.bufferSize) {
      setImmediate(() => this.flush())
    }
  }

  async getMetric(name: string, date?: string, tags?: Record<string, string | number>): Promise<AggregatedMetric | null> {
    const targetDate = date || new Date().toISOString().split('T')[0]
    const key = `metrics:${targetDate}:${name}${tags ? ':' + Object.entries(tags).map(([k, v]) => `${k}:${v}`).join(',') : ''}`

    try {
      const data = await this.cache.get(key)
      return data ? JSON.parse(data) : null
    } catch (error) {
      console.error(`Failed to get metric ${key}:`, error)
      return null
    }
  }

  async getAllMetrics(date?: string): Promise<Record<string, AggregatedMetric>> {
    const targetDate = date || new Date().toISOString().split('T')[0]
    const pattern = `metrics:${targetDate}:*`

    // Note: This is a simplified implementation
    // In production, you'd use Redis SCAN for better performance
    const metrics: Record<string, AggregatedMetric> = {}

    try {
      // This is a placeholder - real implementation would need Redis SCAN
      // For now, we'll return empty object and rely on individual metric queries
      return metrics
    } catch (error) {
      console.error('Failed to get all metrics:', error)
      return {}
    }
  }

  // Cleanup method
  stop() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
      this.flushInterval = null
    }
    // Final flush
    this.flush()
  }
}

// Singleton instance
export const metrics = new MetricsCollector()

// Convenience functions for common metrics
export const Metrics = {
  // Direct access to core metrics methods
  increment: (name: string, value: number = 1, tags?: Record<string, string | number>) => {
    metrics.increment(name, value, tags)
  },

  record: (name: string, value: number, tags?: Record<string, string | number>) => {
    metrics.record(name, value, tags)
  },
  // API metrics
  apiRequest: (method: string, path: string, statusCode: number, duration: number) => {
    metrics.record('api.request.duration', duration, { method, path, status: statusCode })
    metrics.increment('api.request.count', 1, { method, path, status: statusCode })
  },

  // Chat metrics
  messagesSent: (conversationId: number, messageType: string = 'text') => {
    metrics.increment('chat.messages.sent', 1, { type: messageType })
    metrics.increment('chat.conversation.activity', 1, { conversationId: conversationId.toString() })
  },

  messagesReceived: (conversationId: number, messageType: string = 'text') => {
    metrics.increment('chat.messages.received', 1, { type: messageType })
  },

  // File upload metrics
  fileUploaded: (fileSize: number, mimeType: string, success: boolean) => {
    metrics.record('files.upload.size', fileSize, { type: mimeType, success: success.toString() })
    metrics.increment('files.upload.count', 1, { type: mimeType, success: success.toString() })
  },

  // Authentication metrics
  userLogin: (success: boolean, provider: string = 'email') => {
    metrics.increment('auth.login', 1, { success: success.toString(), provider })
  },

  userRegistration: (success: boolean, role: string) => {
    metrics.increment('auth.registration', 1, { success: success.toString(), role })
  },

  // Database metrics
  dbQuery: (table: string, operation: string, duration: number, success: boolean) => {
    metrics.record('db.query.duration', duration, { table, operation, success: success.toString() })
    metrics.increment('db.query.count', 1, { table, operation, success: success.toString() })
  },

  // Rate limiting metrics
  rateLimitHit: (endpoint: string, userId?: string) => {
    metrics.increment('rate_limit.hits', 1, { endpoint, ...(userId && { userId }) })
  },

  // Pusher/WebSocket metrics
  pusherConnection: (event: 'connected' | 'disconnected' | 'error', userId?: string) => {
    metrics.increment('pusher.connection', 1, { event, ...(userId && { userId }) })
  },

  pusherMessage: (channel: string, event: string, success: boolean) => {
    metrics.increment('pusher.message', 1, { channel, event, success: success.toString() })
  },

  // Session metrics
  sessionCreated: (duration: number, type: string, success: boolean) => {
    metrics.record('sessions.duration', duration, { type, success: success.toString() })
    metrics.increment('sessions.created', 1, { type, success: success.toString() })
  },

  // Error metrics
  error: (type: string, endpoint?: string, userId?: string) => {
    metrics.increment('errors.count', 1, {
      type,
      ...(endpoint && { endpoint }),
      ...(userId && { userId })
    })
  },

  // Performance metrics
  performanceTimer: (operation: string, duration: number, success: boolean = true) => {
    metrics.record('performance.operation.duration', duration, { operation, success: success.toString() })
    metrics.increment('performance.operation.count', 1, { operation, success: success.toString() })
  }
}

// Middleware helper for automatic API metrics
export function withMetrics<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  operation: string
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    const start = Date.now()
    let success = true

    try {
      const result = await fn(...args)
      return result
    } catch (error) {
      success = false
      throw error
    } finally {
      const duration = Date.now() - start
      Metrics.performanceTimer(operation, duration, success)
    }
  }
}

// Graceful shutdown
process.on('SIGINT', () => metrics.stop())
process.on('SIGTERM', () => metrics.stop())