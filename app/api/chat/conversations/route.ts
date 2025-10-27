import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { ChatService } from '@/lib/services/ChatService'
import { z } from 'zod'
import { withRateLimit } from '@/lib/middleware/rate-limit'

const createConversationSchema = z.object({
  mentorUserId: z.number().optional(),
  learnerUserId: z.number().optional(),
}).refine(data => data.mentorUserId || data.learnerUserId, {
  message: "Either mentorUserId or learnerUserId must be provided"
})

// Apply rate limiting to conversation creation
const rateLimitedPOST = withRateLimit('api', async (request: NextRequest) => {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { mentorUserId, learnerUserId } = createConversationSchema.parse(body)

    // Determine the final participant IDs based on user role and provided data
    let finalMentorUserId: number
    let finalLearnerUserId: number

    if (user.role === 'mentor') {
      finalMentorUserId = user.id
      if (!learnerUserId) {
        return NextResponse.json({ error: 'Learner user ID is required when mentor creates conversation' }, { status: 400 })
      }
      finalLearnerUserId = learnerUserId
    } else if (user.role === 'learner') {
      finalLearnerUserId = user.id
      if (!mentorUserId) {
        return NextResponse.json({ error: 'Mentor user ID is required when learner creates conversation' }, { status: 400 })
      }
      finalMentorUserId = mentorUserId
    } else {
      return NextResponse.json({ error: 'Only mentors and learners can create conversations' }, { status: 403 })
    }

    const conversation = await ChatService.getOrCreateConversation(
      finalMentorUserId,
      finalLearnerUserId
    )

    return NextResponse.json({ conversation })
  } catch (error) {
    console.error('Error creating/getting conversation:', error)
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    )
  }
})

// Apply rate limiting to conversation fetching
const rateLimitedGET = withRateLimit('api', async (request: NextRequest) => {
  let user = null
  try {
    user = await getSession()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only mentors and learners should have conversations
    if (user.role !== 'mentor' && user.role !== 'learner') {
      return NextResponse.json({ conversations: [] })
    }

    const conversations = await ChatService.getUserConversations(user.id)
    return NextResponse.json({ conversations })
  } catch (error) {
    console.error('Error fetching conversations for user:', user?.id, 'role:', user?.role, error)
    // Return empty array instead of error to prevent UI toast spam
    return NextResponse.json({ conversations: [] })
  }
})

export const POST = rateLimitedPOST
export const GET = rateLimitedGET