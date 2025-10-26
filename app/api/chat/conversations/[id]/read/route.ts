import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { ChatService } from '@/lib/services/ChatService'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params
    const conversationId = parseInt(id, 10)

    if (isNaN(conversationId)) {
      return NextResponse.json(
        { error: 'Invalid conversation ID' },
        { status: 400 }
      )
    }

    await ChatService.markConversationAsRead(conversationId, user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error marking conversation as read:', error)
    return NextResponse.json(
      { error: 'Failed to mark conversation as read' },
      { status: 500 }
    )
  }
}
