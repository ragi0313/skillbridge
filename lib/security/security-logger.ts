import { NextRequest } from 'next/server'
import { logUserAction, AUDIT_ACTIONS, ENTITY_TYPES } from '@/lib/admin/audit-log'

export type SecurityEventType =
  | 'authentication_failure'
  | 'authorization_failure'
  | 'csrf_token_invalid'
  | 'rate_limit_exceeded'
  | 'suspicious_activity'
  | 'sql_injection_attempt'
  | 'xss_attempt'
  | 'path_traversal_attempt'
  | 'invalid_input'
  | 'webhook_forgery'
  | 'session_hijacking_attempt'
  | 'brute_force_attempt'
  | 'account_enumeration_attempt'
  | 'file_upload_violation'
  | 'privilege_escalation_attempt'

export type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical'

export interface SecurityEvent {
  type: SecurityEventType
  severity: SecuritySeverity
  userId?: number
  ipAddress?: string
  userAgent?: string
  requestPath?: string
  description: string
  metadata?: Record<string, any>
}

/**
 * Extract request information for logging
 */
export function extractRequestInfo(req: NextRequest): {
  ipAddress: string
  userAgent: string
  requestPath: string
} {
  const forwarded = req.headers.get('x-forwarded-for')
  const realIp = req.headers.get('x-real-ip')
  const cfConnectingIp = req.headers.get('cf-connecting-ip')

  const ipAddress = forwarded?.split(',')[0] || realIp || cfConnectingIp || 'unknown'
  const userAgent = req.headers.get('user-agent') || 'unknown'
  const requestPath = new URL(req.url).pathname

  return { ipAddress, userAgent, requestPath }
}

/**
 * Log security event
 */
export async function logSecurityEvent(event: SecurityEvent): Promise<void> {
  try {
    // Log to console immediately for monitoring
    const timestamp = new Date().toISOString()
    const logLevel = event.severity === 'critical' || event.severity === 'high' ? 'ERROR' : 'WARN'

    console[logLevel === 'ERROR' ? 'error' : 'warn'](
      `[SECURITY ${event.severity.toUpperCase()}] ${event.type}`,
      {
        timestamp,
        description: event.description,
        userId: event.userId,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent?.substring(0, 100),
        requestPath: event.requestPath,
        metadata: event.metadata
      }
    )

    // Log to audit log for persistence
    await logUserAction({
      userId: event.userId,
      action: `SECURITY_${event.type.toUpperCase()}` as any,
      entityType: ENTITY_TYPES.SYSTEM as any,
      description: event.description,
      metadata: {
        securityEventType: event.type,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        requestPath: event.requestPath,
        timestamp,
        ...event.metadata
      },
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      severity: event.severity === 'critical' ? 'critical' : event.severity === 'high' ? 'warning' : 'info'
    })

    // For critical events, you might want to send alerts
    if (event.severity === 'critical') {
      await sendSecurityAlert(event)
    }
  } catch (error) {
    // Don't let logging errors break the application
    console.error('Failed to log security event:', error)
  }
}

/**
 * Send security alert for critical events
 */
async function sendSecurityAlert(event: SecurityEvent): Promise<void> {
  // Implementation depends on your alerting system
  // Could send email, Slack notification, PagerDuty alert, etc.
  console.error('[SECURITY ALERT - CRITICAL]', {
    type: event.type,
    description: event.description,
    timestamp: new Date().toISOString()
  })

  // TODO: Implement actual alerting (email, Slack, etc.)
}

/**
 * Middleware to log security events
 */
export function createSecurityLogger(eventType: SecurityEventType, severity: SecuritySeverity = 'medium') {
  return async function securityLoggerMiddleware(
    req: NextRequest,
    additionalInfo?: Partial<SecurityEvent>
  ): Promise<void> {
    const { ipAddress, userAgent, requestPath } = extractRequestInfo(req)

    await logSecurityEvent({
      type: eventType,
      severity,
      ipAddress,
      userAgent,
      requestPath,
      description: additionalInfo?.description || `Security event: ${eventType}`,
      userId: additionalInfo?.userId,
      metadata: additionalInfo?.metadata
    })
  }
}

/**
 * Detect and log suspicious patterns
 */
export async function detectAndLogSuspiciousActivity(
  req: NextRequest,
  pattern: {
    type: 'rapid_requests' | 'unusual_endpoint' | 'suspicious_payload' | 'multiple_failures'
    details: string
    metadata?: Record<string, any>
  },
  userId?: number
): Promise<void> {
  const { ipAddress, userAgent, requestPath } = extractRequestInfo(req)

  await logSecurityEvent({
    type: 'suspicious_activity',
    severity: 'high',
    userId,
    ipAddress,
    userAgent,
    requestPath,
    description: `Suspicious activity detected: ${pattern.type} - ${pattern.details}`,
    metadata: {
      patternType: pattern.type,
      ...pattern.metadata
    }
  })
}

/**
 * Track authentication failures for brute force detection
 */
const authFailureTracking = new Map<string, { count: number; firstAttempt: number }>()

export async function trackAuthenticationFailure(
  req: NextRequest,
  identifier: string // email or username
): Promise<{ shouldBlock: boolean; attemptCount: number }> {
  const { ipAddress, userAgent, requestPath } = extractRequestInfo(req)
  const key = `${ipAddress}:${identifier}`
  const now = Date.now()
  const windowMs = 15 * 60 * 1000 // 15 minutes

  const existing = authFailureTracking.get(key)

  if (!existing || now - existing.firstAttempt > windowMs) {
    // Reset or create new tracking
    authFailureTracking.set(key, { count: 1, firstAttempt: now })
    return { shouldBlock: false, attemptCount: 1 }
  }

  existing.count++
  const attemptCount = existing.count

  // Log if threshold exceeded
  if (attemptCount >= 5) {
    await logSecurityEvent({
      type: 'brute_force_attempt',
      severity: attemptCount >= 10 ? 'critical' : 'high',
      ipAddress,
      userAgent,
      requestPath,
      description: `Potential brute force attack detected: ${attemptCount} failed login attempts for ${identifier}`,
      metadata: {
        identifier,
        attemptCount,
        windowMs
      }
    })
  }

  // Block after 10 attempts
  return {
    shouldBlock: attemptCount >= 10,
    attemptCount
  }
}

/**
 * Clear authentication failure tracking on successful login
 */
export function clearAuthenticationFailures(ipAddress: string, identifier: string): void {
  const key = `${ipAddress}:${identifier}`
  authFailureTracking.delete(key)
}

/**
 * Log injection attempt
 */
export async function logInjectionAttempt(
  req: NextRequest,
  injectionType: 'sql' | 'xss' | 'path_traversal' | 'command',
  payload: string,
  userId?: number
): Promise<void> {
  const { ipAddress, userAgent, requestPath } = extractRequestInfo(req)

  const eventTypeMap = {
    sql: 'sql_injection_attempt' as const,
    xss: 'xss_attempt' as const,
    path_traversal: 'path_traversal_attempt' as const,
    command: 'suspicious_activity' as const
  }

  await logSecurityEvent({
    type: eventTypeMap[injectionType],
    severity: 'critical',
    userId,
    ipAddress,
    userAgent,
    requestPath,
    description: `${injectionType.toUpperCase()} injection attempt detected`,
    metadata: {
      injectionType,
      payload: payload.substring(0, 200), // Limit payload size in logs
      payloadLength: payload.length
    }
  })
}

/**
 * Log privilege escalation attempt
 */
export async function logPrivilegeEscalationAttempt(
  req: NextRequest,
  userId: number,
  attemptedRole: string,
  currentRole: string
): Promise<void> {
  const { ipAddress, userAgent, requestPath } = extractRequestInfo(req)

  await logSecurityEvent({
    type: 'privilege_escalation_attempt',
    severity: 'critical',
    userId,
    ipAddress,
    userAgent,
    requestPath,
    description: `User attempted to escalate privileges from ${currentRole} to ${attemptedRole}`,
    metadata: {
      currentRole,
      attemptedRole
    }
  })
}

/**
 * Log file upload violation
 */
export async function logFileUploadViolation(
  req: NextRequest,
  violation: {
    type: 'size_exceeded' | 'invalid_type' | 'malicious_content' | 'rate_limit'
    details: string
    fileInfo?: Record<string, any>
  },
  userId?: number
): Promise<void> {
  const { ipAddress, userAgent, requestPath } = extractRequestInfo(req)

  await logSecurityEvent({
    type: 'file_upload_violation',
    severity: violation.type === 'malicious_content' ? 'critical' : 'medium',
    userId,
    ipAddress,
    userAgent,
    requestPath,
    description: `File upload violation: ${violation.type} - ${violation.details}`,
    metadata: {
      violationType: violation.type,
      ...violation.fileInfo
    }
  })
}
