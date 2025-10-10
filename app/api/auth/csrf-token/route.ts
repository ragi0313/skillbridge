import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { getCsrfToken } from '@/lib/security/csrf'

/**
 * GET /api/auth/csrf-token
 * Returns a CSRF token for authenticated users
 */
export async function GET() {
  try {
    const session = await getSession()

    if (!session || !session.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Generate or retrieve CSRF token for this user
    const token = await getCsrfToken(session.id)

    return NextResponse.json({
      token,
      expiresIn: 3600 // 1 hour in seconds
    })
  } catch (error) {
    console.error('Failed to generate CSRF token:', error)
    return NextResponse.json(
      { error: 'Failed to generate CSRF token' },
      { status: 500 }
    )
  }
}
