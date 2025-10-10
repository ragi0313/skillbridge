import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { db } from '@/db'
import { users, learners, mentors, admins, bookingSessions } from '@/db/schema'
import { eq } from 'drizzle-orm'

export type UserRole = 'admin' | 'mentor' | 'learner'

/**
 * Authorization check result
 */
export interface AuthorizationResult {
  authorized: boolean
  userId?: number
  role?: UserRole
  error?: string
  statusCode?: number
}

/**
 * Require authentication - ensure user is logged in
 */
export async function requireAuth(): Promise<AuthorizationResult> {
  const session = await getSession()

  if (!session || !session.id) {
    return {
      authorized: false,
      error: 'Authentication required',
      statusCode: 401
    }
  }

  return {
    authorized: true,
    userId: session.id,
    role: session.role as UserRole
  }
}

/**
 * Require specific role
 */
export async function requireRole(
  allowedRoles: UserRole | UserRole[]
): Promise<AuthorizationResult> {
  const authResult = await requireAuth()

  if (!authResult.authorized) {
    return authResult
  }

  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]

  if (!roles.includes(authResult.role!)) {
    return {
      authorized: false,
      userId: authResult.userId,
      role: authResult.role,
      error: 'Insufficient permissions',
      statusCode: 403
    }
  }

  return authResult
}

/**
 * Require admin role
 */
export async function requireAdmin(): Promise<AuthorizationResult> {
  return requireRole('admin')
}

/**
 * Check if user owns a resource
 */
export async function requireOwnership(
  resourceUserId: number
): Promise<AuthorizationResult> {
  const authResult = await requireAuth()

  if (!authResult.authorized) {
    return authResult
  }

  // Admins can access any resource
  if (authResult.role === 'admin') {
    return authResult
  }

  // Check ownership
  if (authResult.userId !== resourceUserId) {
    return {
      authorized: false,
      userId: authResult.userId,
      role: authResult.role,
      error: 'Resource not found', // SECURITY: Return 404 to hide existence
      statusCode: 404
    }
  }

  return authResult
}

/**
 * Check if user is participant in a session
 */
export async function requireSessionParticipant(
  sessionId: number
): Promise<AuthorizationResult & { isLearner?: boolean; isMentor?: boolean }> {
  const authResult = await requireAuth()

  if (!authResult.authorized) {
    return authResult
  }

  try {
    // Get session with participant info
    const sessionQuery = await db
      .select({
        session: bookingSessions,
        learner: learners,
        mentor: mentors
      })
      .from(bookingSessions)
      .leftJoin(learners, eq(bookingSessions.learnerId, learners.id))
      .leftJoin(mentors, eq(bookingSessions.mentorId, mentors.id))
      .where(eq(bookingSessions.id, sessionId))
      .limit(1)

    if (sessionQuery.length === 0) {
      return {
        authorized: false,
        userId: authResult.userId,
        role: authResult.role,
        error: 'Resource not found',
        statusCode: 404
      }
    }

    const { learner, mentor } = sessionQuery[0]

    const isLearner = learner?.userId === authResult.userId
    const isMentor = mentor?.userId === authResult.userId
    const isAdmin = authResult.role === 'admin'

    if (!isLearner && !isMentor && !isAdmin) {
      // SECURITY: Return 404 to hide session existence from unauthorized users
      return {
        authorized: false,
        userId: authResult.userId,
        role: authResult.role,
        error: 'Resource not found',
        statusCode: 404
      }
    }

    return {
      authorized: true,
      userId: authResult.userId,
      role: authResult.role,
      isLearner,
      isMentor
    }
  } catch (error) {
    console.error('Authorization check failed:', error)
    return {
      authorized: false,
      userId: authResult.userId,
      role: authResult.role,
      error: 'Authorization check failed',
      statusCode: 500
    }
  }
}

/**
 * Middleware wrapper for authorization
 */
export function withAuthorization(
  authCheck: () => Promise<AuthorizationResult>,
  handler: (req: NextRequest, authResult: AuthorizationResult, context?: any) => Promise<NextResponse>
) {
  return async function authorizedHandler(
    req: NextRequest,
    context?: any
  ): Promise<NextResponse> {
    const authResult = await authCheck()

    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: authResult.statusCode || 401 }
      )
    }

    return handler(req, authResult, context)
  }
}

/**
 * Helper to require authentication in API routes
 */
export function withAuth(
  handler: (req: NextRequest, authResult: AuthorizationResult, context?: any) => Promise<NextResponse>
) {
  return withAuthorization(requireAuth, handler)
}

/**
 * Helper to require admin role in API routes
 */
export function withAdmin(
  handler: (req: NextRequest, authResult: AuthorizationResult, context?: any) => Promise<NextResponse>
) {
  return withAuthorization(requireAdmin, handler)
}

/**
 * Helper to require specific role in API routes
 */
export function withRole(
  allowedRoles: UserRole | UserRole[],
  handler: (req: NextRequest, authResult: AuthorizationResult, context?: any) => Promise<NextResponse>
) {
  return withAuthorization(() => requireRole(allowedRoles), handler)
}

/**
 * Check if a user exists and is active
 */
export async function verifyUserExists(userId: number): Promise<boolean> {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        id: true,
        blacklistedAt: true,
        suspendedAt: true,
        suspensionEndsAt: true
      }
    })

    if (!user) {
      return false
    }

    // Check if user is blacklisted
    if (user.blacklistedAt) {
      return false
    }

    // Check if user is currently suspended
    if (user.suspendedAt && user.suspensionEndsAt) {
      const now = new Date()
      if (now < user.suspensionEndsAt) {
        return false
      }
    }

    return true
  } catch (error) {
    console.error('User verification failed:', error)
    return false
  }
}

/**
 * Rate limit based on user actions (prevent abuse)
 */
export async function checkUserActionRateLimit(
  userId: number,
  action: string,
  maxActions: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number }> {
  // This would integrate with your Redis cache
  // Implementation similar to rate limiting but action-specific
  // For now, return allowed by default
  return { allowed: true, remaining: maxActions }
}
