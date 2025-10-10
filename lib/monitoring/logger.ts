// Production-ready logging system
interface LogLevel {
  ERROR: 0
  WARN: 1
  INFO: 2
  DEBUG: 3
}

const LOG_LEVELS: LogLevel = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
} as const

type LogLevelKey = keyof LogLevel
type LogLevelValue = LogLevel[LogLevelKey]

interface LogEntry {
  timestamp: string
  level: LogLevelKey
  message: string
  context?: Record<string, any>
  error?: Error
  requestId?: string
  userId?: number | string
  service?: string
}

class Logger {
  private currentLevel: LogLevelValue
  private service: string

  constructor(service: string = 'bridgementor', level?: LogLevelKey) {
    this.service = service
    this.currentLevel = LOG_LEVELS[level || this.getDefaultLogLevel()]
  }

  private getDefaultLogLevel(): LogLevelKey {
    const env = process.env.NODE_ENV
    if (env === 'production') return 'INFO'
    if (env === 'test') return 'ERROR'
    return 'DEBUG'
  }

  private shouldLog(level: LogLevelKey): boolean {
    return LOG_LEVELS[level] <= this.currentLevel
  }

  private formatMessage(entry: LogEntry): string {
    const baseInfo = {
      timestamp: entry.timestamp,
      level: entry.level,
      service: entry.service || this.service,
      message: entry.message
    }

    const additionalInfo: Record<string, any> = {}

    if (entry.requestId) additionalInfo.requestId = entry.requestId
    if (entry.userId) additionalInfo.userId = entry.userId
    if (entry.context) additionalInfo.context = entry.context
    if (entry.error) {
      additionalInfo.error = {
        name: entry.error.name,
        message: entry.error.message,
        stack: entry.error.stack
      }
    }

    return JSON.stringify({ ...baseInfo, ...additionalInfo })
  }

  private log(level: LogLevelKey, message: string, context?: Record<string, any>, error?: Error) {
    if (!this.shouldLog(level)) return

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error,
      service: this.service
    }

    const formattedMessage = this.formatMessage(entry)

    // Route to appropriate console method based on level
    switch (level) {
      case 'ERROR':
        console.error(formattedMessage)
        break
      case 'WARN':
        break
      case 'INFO':
        console.info(formattedMessage)
        break
      case 'DEBUG':
        console.debug(formattedMessage)
        break
    }

    // In production, you might want to send critical errors to external services
    if (level === 'ERROR' && process.env.NODE_ENV === 'production') {
      this.sendToExternalService(entry)
    }
  }

  private async sendToExternalService(entry: LogEntry) {
    // Placeholder for external logging service (Sentry, LogRocket, etc.)
    // Implementation would depend on your monitoring service
    try {
      // Example: Send to Sentry, DataDog, etc.
      // await externalLoggingService.send(entry)
    } catch (error) {
      // Fallback to console if external service fails
      console.error('Failed to send log to external service:', error)
    }
  }

  // Public logging methods
  error(message: string, context?: Record<string, any>, error?: Error) {
    this.log('ERROR', message, context, error)
  }

  warn(message: string, context?: Record<string, any>) {
    this.log('WARN', message, context)
  }

  info(message: string, context?: Record<string, any>) {
    this.log('INFO', message, context)
  }

  debug(message: string, context?: Record<string, any>) {
    this.log('DEBUG', message, context)
  }

  // Create child logger with additional context
  child(additionalContext: { service?: string; requestId?: string; userId?: number | string }): Logger {
    const childLogger = new Logger(
      additionalContext.service || this.service,
      Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key as LogLevelKey] === this.currentLevel) as LogLevelKey
    )

    // Override log method to include additional context
    const originalLog = childLogger.log.bind(childLogger)
    childLogger.log = (level: LogLevelKey, message: string, context?: Record<string, any>, error?: Error) => {
      const mergedContext = {
        ...context,
        ...(additionalContext.requestId && { requestId: additionalContext.requestId }),
        ...(additionalContext.userId && { userId: additionalContext.userId })
      }
      originalLog(level, message, mergedContext, error)
    }

    return childLogger
  }

  // Set log level at runtime
  setLevel(level: LogLevelKey) {
    this.currentLevel = LOG_LEVELS[level]
  }
}

// Default logger instance
export const logger = new Logger()

// Specialized loggers for different parts of the application
export const chatLogger = new Logger('chat-service')
export const authLogger = new Logger('auth-service')
export const paymentLogger = new Logger('payment-service')
export const sessionLogger = new Logger('session-service')

// Utility functions for request-specific logging
export function createRequestLogger(requestId: string, userId?: number | string): Logger {
  return logger.child({ requestId, userId })
}

// Performance monitoring
export class PerformanceMonitor {
  private startTime: number
  private logger: Logger

  constructor(operation: string, logger: Logger = logger) {
    this.startTime = Date.now()
    this.logger = logger
    this.logger.debug(`Starting operation: ${operation}`)
  }

  finish(operation: string, context?: Record<string, any>) {
    const duration = Date.now() - this.startTime
    this.logger.info(`Completed operation: ${operation}`, {
      ...context,
      duration: `${duration}ms`
    })

    // Log slow operations as warnings
    if (duration > 1000) {
      this.logger.warn(`Slow operation detected: ${operation}`, {
        ...context,
        duration: `${duration}ms`,
        threshold: '1000ms'
      })
    }

    return duration
  }

  static time<T>(operation: string, fn: () => Promise<T>, context?: Record<string, any>): Promise<T>
  static time<T>(operation: string, fn: () => T, context?: Record<string, any>): T
  static time<T>(operation: string, fn: () => T | Promise<T>, context?: Record<string, any>): T | Promise<T> {
    const monitor = new PerformanceMonitor(operation)

    try {
      const result = fn()

      if (result instanceof Promise) {
        return result
          .then(value => {
            monitor.finish(operation, context)
            return value
          })
          .catch(error => {
            monitor.logger.error(`Operation failed: ${operation}`, context, error)
            throw error
          })
      } else {
        monitor.finish(operation, context)
        return result
      }
    } catch (error) {
      monitor.logger.error(`Operation failed: ${operation}`, context, error as Error)
      throw error
    }
  }
}

// Error tracking for specific types
export function trackError(error: Error, context?: Record<string, any>, userId?: number | string) {
  logger.error('Unhandled error', {
    ...context,
    ...(userId && { userId }),
    errorType: error.constructor.name
  }, error)
}

// API request logging middleware helper
export function logApiRequest(method: string, path: string, statusCode: number, duration: number, userId?: number | string) {
  const level = statusCode >= 500 ? 'ERROR' : statusCode >= 400 ? 'WARN' : 'INFO'

  logger[level === 'ERROR' ? 'error' : level === 'WARN' ? 'warn' : 'info'](
    `API Request: ${method} ${path}`,
    {
      method,
      path,
      statusCode,
      duration: `${duration}ms`,
      ...(userId && { userId })
    }
  )
}