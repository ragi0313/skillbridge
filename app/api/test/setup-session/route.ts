import { NextRequest, NextResponse } from "next/server"
import { setupCompleteTestSession } from "@/lib/test-utils/session-helpers"

// Only available in development mode
export async function POST(request: NextRequest) {
  // Security check - only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Test endpoints only available in development mode' }, 
      { status: 403 }
    )
  }

  try {
    const body = await request.json().catch(() => ({}))
    
    const {
      skillName = 'JavaScript Debugging',
      durationMinutes = 60,
      ratePerHour = 50
    } = body

    console.log('🧪 Setting up test session via API...')
    
    const result = await setupCompleteTestSession(
      skillName,
      durationMinutes,
      ratePerHour
    )

    return NextResponse.json({
      success: true,
      message: 'Test session created and ready for testing',
      sessionId: result.sessionId,
      sessionUrl: `/sessions/${result.sessionId}`,
      mentor: {
        email: result.mentor.email,
        name: `${result.mentor.firstName} ${result.mentor.lastName}`
      },
      learner: {
        email: result.learner.email,
        name: `${result.learner.firstName} ${result.learner.lastName}`
      },
      instructions: [
        'Open Chrome browser and login as mentor',
        'Open Firefox browser and login as learner', 
        `Navigate both browsers to /sessions/${result.sessionId}`,
        'Allow camera/microphone access in both browsers',
        'Test video session functionality'
      ]
    })

  } catch (error) {
    console.error('Failed to setup test session:', error)
    return NextResponse.json(
      { 
        error: 'Failed to setup test session',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}

// GET endpoint to check test session status
export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Test endpoints only available in development mode' }, 
      { status: 403 }
    )
  }

  return NextResponse.json({
    available: true,
    message: 'Test session setup API is available',
    usage: {
      endpoint: 'POST /api/test/setup-session',
      parameters: {
        skillName: 'string (optional, default: "JavaScript Debugging")',
        durationMinutes: 'number (optional, default: 60)',
        ratePerHour: 'number (optional, default: 50)'
      }
    },
    requirements: [
      'Test mentor and learner accounts must exist',
      'Mentor must have the specified skill configured',
      'Sufficient credits in learner account',
      'Development environment only'
    ]
  })
}