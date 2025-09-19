import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth/verify-token'

export async function GET(request: NextRequest) {
  try {
    const user = await verifyToken(request)

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error getting current user:', error)
    return NextResponse.json(
      { error: 'Failed to get user information' },
      { status: 500 }
    )
  }
}