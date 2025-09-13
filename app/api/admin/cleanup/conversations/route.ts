import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { conversations, messages } from '@/db/schema'
import { and, eq, sql } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  try {
    // This is a dangerous operation - add some protection
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.ADMIN_SECRET || 'temp-admin-key'}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Starting conversation duplicate cleanup...')

    // Find duplicate conversations (same mentor_id and learner_id)
    const duplicates = await db
      .select({
        mentorId: conversations.mentorId,
        learnerId: conversations.learnerId,
        count: sql<number>`COUNT(*)`.as('count'),
        ids: sql<number[]>`ARRAY_AGG(${conversations.id} ORDER BY ${conversations.createdAt})`.as('ids')
      })
      .from(conversations)
      .groupBy(conversations.mentorId, conversations.learnerId)
      .having(sql`COUNT(*) > 1`)

    console.log(`Found ${duplicates.length} sets of duplicate conversations`)

    let totalRemoved = 0

    for (const duplicate of duplicates) {
      // Keep the first conversation (oldest), remove the rest
      const [keepId, ...removeIds] = duplicate.ids
      
      console.log(`Keeping conversation ${keepId}, removing: ${removeIds.join(', ')}`)

      // Move messages from duplicate conversations to the main one
      for (const removeId of removeIds) {
        await db
          .update(messages)
          .set({ conversationId: keepId })
          .where(eq(messages.conversationId, removeId))
      }

      // Delete the duplicate conversations one by one
      for (const removeId of removeIds) {
        await db
          .delete(conversations)
          .where(eq(conversations.id, removeId))
        
        totalRemoved++
      }
    }

    console.log(`Cleanup completed. Removed ${totalRemoved} duplicate conversations`)

    return NextResponse.json({
      success: true,
      duplicatesFound: duplicates.length,
      conversationsRemoved: totalRemoved,
      message: `Cleaned up ${totalRemoved} duplicate conversations`
    })

  } catch (error) {
    console.error('Error cleaning up conversations:', error)
    return NextResponse.json({
      success: false,
      error: 'Cleanup failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Also allow GET for checking duplicates without removing
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.ADMIN_SECRET || 'temp-admin-key'}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find duplicate conversations (same mentor_id and learner_id)
    const duplicates = await db
      .select({
        mentorId: conversations.mentorId,
        learnerId: conversations.learnerId,
        count: sql<number>`COUNT(*)`.as('count'),
        ids: sql<number[]>`ARRAY_AGG(${conversations.id} ORDER BY ${conversations.createdAt})`.as('ids')
      })
      .from(conversations)
      .groupBy(conversations.mentorId, conversations.learnerId)
      .having(sql`COUNT(*) > 1`)

    return NextResponse.json({
      duplicatesFound: duplicates.length,
      totalExtraConversations: duplicates.reduce((sum, dup) => sum + (dup.count - 1), 0),
      duplicates: duplicates.map(dup => ({
        mentorId: dup.mentorId,
        learnerId: dup.learnerId,
        count: dup.count,
        conversationIds: dup.ids
      }))
    })

  } catch (error) {
    console.error('Error checking for duplicates:', error)
    return NextResponse.json({
      success: false,
      error: 'Check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}