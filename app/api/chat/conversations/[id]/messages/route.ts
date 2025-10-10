import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { ChatService } from '@/lib/services/ChatService'
import { z } from 'zod'
import { withRateLimit } from '@/lib/middleware/rate-limit'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const conversationId = parseInt(id)
    if (isNaN(conversationId)) {
      return NextResponse.json({ error: 'Invalid conversation ID' }, { status: 400 })
    }

    // Verify user is a participant in this conversation
    const conversation = await ChatService.getConversationWithParticipants(conversationId)
    if (conversation.mentor.userId !== user.id && conversation.learner.userId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '0')
    const limit = parseInt(url.searchParams.get('limit') || '50')

    const messages = await ChatService.getConversationMessages(conversationId, user.id, page, limit)

    return NextResponse.json({ messages })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}

const sendMessageSchema = z.object({
  content: z.string(),
  messageType: z.enum(['text', 'file', 'image']).default('text'),
  attachments: z.array(z.object({
    originalFilename: z.string(),
    systemFilename: z.string(),
    fileUrl: z.string(),
    fileSize: z.number(),
    mimeType: z.string(),
    storagePath: z.string().optional(),
  })).optional(),
}).refine(
  (data) => data.content.trim().length > 0 || (data.attachments && data.attachments.length > 0),
  { message: 'Message must have either content or attachments', path: ['content'] }
)

// Apply rate limiting to message sending
const rateLimitedPOST = withRateLimit('chat', async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  let conversationId: number | null = null
  let body: any = null
  let user: any = null

  try {
    user = await getSession()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    conversationId = parseInt(id)
    if (isNaN(conversationId)) {
      return NextResponse.json({ error: 'Invalid conversation ID' }, { status: 400 })
    }

    body = await request.json()
    const { content, messageType, attachments } = sendMessageSchema.parse(body)

    // Verify user is a participant in this conversation
    const conversation = await ChatService.getConversationWithParticipants(conversationId)
    if (conversation.mentor.userId !== user.id && conversation.learner.userId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const message = await ChatService.sendMessage(
      conversationId,
      user.id,
      content,
      messageType,
      attachments
    )

    return NextResponse.json({ message })
  } catch (error) {
    console.error('Error sending message:', {
      error: error.message,
      stack: error.stack,
      conversationId,
      userId: user?.id,
      body
    })
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error.message || 'Failed to send message' },
      { status: 500 }
    )
  }
})

export const POST = rateLimitedPOST