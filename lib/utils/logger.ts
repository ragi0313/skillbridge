import { getSafeCache } from '@/lib/cache/redis-safe'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: any
  userId?: number
  feature?: string
}

class Logger {
  private isDevelopment = process.env.NODE_ENV !== 'production'
  private cache = getSafeCache()

  private formatMessage(level: LogLevel, message: string, context?: any): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      feature: context?.feature || 'general'
    }
  }

  private async persistLog(entry: LogEntry) {
    try {
      // In production, persist critical logs to cache for monitoring
      if (!this.isDevelopment && (entry.level === 'error' || entry.level === 'warn')) {
        const key = `logs:${entry.level}:${Date.now()}`
        await this.cache.set(key, JSON.stringify(entry), 24 * 60 * 60 * 1000) // 24 hour expiry
      }
    } catch (error) {
      // Fail silently to prevent logging from breaking the application
    }
  }

  debug(message: string, context?: any) {
    if (this.isDevelopment) {
      console.log(`[DEBUG] ${message}`, context || '')
    }
  }

  info(message: string, context?: any) {
    const entry = this.formatMessage('info', message, context)
    if (this.isDevelopment) {
      console.log(`[INFO] ${message}`, context || '')
    }
    this.persistLog(entry)
  }

  warn(message: string, context?: any) {
    const entry = this.formatMessage('warn', message, context)
    console.warn(`[WARN] ${message}`, context || '')
    this.persistLog(entry)
  }

  error(message: string, context?: any) {
    const entry = this.formatMessage('error', message, context)
    console.error(`[ERROR] ${message}`, context || '')
    this.persistLog(entry)
  }

  // Application-specific logging methods

  rateLimit(userId: number, endpoint: string) {
    this.warn(`Rate limit hit`, { userId, endpoint, feature: 'rate-limiting' })
  }

  // Get recent logs for monitoring
  async getRecentLogs(level?: LogLevel, limit: number = 50): Promise<LogEntry[]> {
    try {
      // This would be implemented with proper log aggregation in production
      return []
    } catch (error) {
      return []
    }
  }
}

export const logger = new Logger()