import { db } from '@/db/index'
import {
  conversations,
  messages,
  messageUserDeletions,
  conversationUserDeletions,
  mentors,
  learners,
  users
} from '@/db/schema'
import { eq, and, desc, notExists, gt } from 'drizzle-orm'
import { triggerPusherEvent, getConversationChannel, PUSHER_EVENTS } from '@/lib/pusher/config'
import { validateChatMessage } from '@/lib/validation/messageValidation'
import { Metrics } from '@/lib/monitoring/metrics'

export interface ConversationWithParticipants {
  id: number
  mentorId: number
  learnerId: number
  mentorLastReadAt: string | null
  learnerLastReadAt: string | null
  lastMessageAt: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  mentor: {
    id: number
    userId: number
    firstName: string
    lastName: string
    profilePictureUrl: string | null
  }
  learner: {
    id: number
    userId: number
    firstName: string
    lastName: string
    profilePictureUrl: string | null
  }
  lastMessage?: {
    id: number
    content: string
    messageType: string
    createdAt: string
    senderName: string
  }
  unreadCount?: number
}

export interface ChatMessage {
  id: number
  conversationId: number
  senderId: number
  content: string
  messageType: string
  createdAt: string
  editedAt?: string
  sender: {
    id: number
    firstName: string
    lastName: string
    profilePictureUrl?: string | null
  }
  attachments?: Array<{
    id: number
    originalFilename: string
    fileUrl: string
    fileSize: number
    mimeType: string
  }>
}

export class ChatService {
  static async getOrCreateConversation(
    mentorUserId: number,
    learnerUserId: number
  ): Promise<ConversationWithParticipants> {
    // Get mentor and learner internal IDs
    const mentorResult = await db.select().from(mentors).where(eq(mentors.userId, mentorUserId)).limit(1)
    const learnerResult = await db.select().from(learners).where(eq(learners.userId, learnerUserId)).limit(1)

    if (!mentorResult[0] || !learnerResult[0]) {
      throw new Error('Mentor or learner not found')
    }

    // Check for existing conversation that's NOT soft-deleted by either user
    const existingConversation = await db.select()
      .from(conversations)
      .where(and(
        eq(conversations.mentorId, mentorResult[0].id),
        eq(conversations.learnerId, learnerResult[0].id),
        // Ensure conversation is not soft-deleted by the mentor
        notExists(
          db.select()
            .from(conversationUserDeletions)
            .where(and(
              eq(conversationUserDeletions.conversationId, conversations.id),
              eq(conversationUserDeletions.userId, mentorUserId)
            ))
        ),
        // Ensure conversation is not soft-deleted by the learner
        notExists(
          db.select()
            .from(conversationUserDeletions)
            .where(and(
              eq(conversationUserDeletions.conversationId, conversations.id),
              eq(conversationUserDeletions.userId, learnerUserId)
            ))
        )
      ))
      .limit(1)

    if (existingConversation[0]) {
      return await this.getConversationWithParticipants(existingConversation[0].id)
    } else {
      // Check if there's a soft-deleted conversation that can be restored
      const deletedConversation = await db.select()
        .from(conversations)
        .where(and(
          eq(conversations.mentorId, mentorResult[0].id),
          eq(conversations.learnerId, learnerResult[0].id)
        ))
        .limit(1)

      if (deletedConversation[0]) {
        // Don't remove deletion records - just return the existing conversation
        // The message fetching will handle showing only messages after deletion time
        return await this.getConversationWithParticipants(deletedConversation[0].id)
      } else {
        // No existing conversation found, create new one
        const newConversation = await db.insert(conversations)
          .values({
            mentorId: mentorResult[0].id,
            learnerId: learnerResult[0].id,
            isActive: true
          })
          .returning()

        return await this.getConversationWithParticipants(newConversation[0].id)
      }
    }
  }

  static async getConversationWithParticipants(conversationId: number): Promise<ConversationWithParticipants> {
    // Get conversation
    const conversation = await db.select().from(conversations).where(eq(conversations.id, conversationId)).limit(1)
    if (!conversation[0]) {
      throw new Error('Conversation not found')
    }

    // Get mentor details
    const mentorData = await db.select()
      .from(mentors)
      .innerJoin(users, eq(mentors.userId, users.id))
      .where(eq(mentors.id, conversation[0].mentorId))
      .limit(1)

    // Get learner details
    const learnerData = await db.select()
      .from(learners)
      .innerJoin(users, eq(learners.userId, users.id))
      .where(eq(learners.id, conversation[0].learnerId))
      .limit(1)

    if (!mentorData[0] || !learnerData[0]) {
      throw new Error('Mentor or learner not found')
    }

    const conv = conversation[0]
    return {
      id: conv.id,
      mentorId: conv.mentorId,
      learnerId: conv.learnerId,
      mentorLastReadAt: conv.mentorLastReadAt?.toISOString() || null,
      learnerLastReadAt: conv.learnerLastReadAt?.toISOString() || null,
      lastMessageAt: conv.lastMessageAt?.toISOString() || null,
      isActive: conv.isActive,
      createdAt: conv.createdAt.toISOString(),
      updatedAt: conv.updatedAt.toISOString(),
      mentor: {
        id: mentorData[0].mentors.id,
        userId: mentorData[0].users.id,
        firstName: mentorData[0].users.firstName,
        lastName: mentorData[0].users.lastName,
        profilePictureUrl: mentorData[0].mentors.profilePictureUrl,
      },
      learner: {
        id: learnerData[0].learners.id,
        userId: learnerData[0].users.id,
        firstName: learnerData[0].users.firstName,
        lastName: learnerData[0].users.lastName,
        profilePictureUrl: learnerData[0].learners.profilePictureUrl,
      },
    }
  }

  static async getUserConversations(userId: number): Promise<ConversationWithParticipants[]> {
    // Get ALL user's conversations (including soft-deleted ones)
    const mentorConversations = await db.select()
      .from(conversations)
      .innerJoin(mentors, eq(conversations.mentorId, mentors.id))
      .where(eq(mentors.userId, userId))

    const learnerConversations = await db.select()
      .from(conversations)
      .innerJoin(learners, eq(conversations.learnerId, learners.id))
      .where(eq(learners.userId, userId))

    const allConversationIds = [
      ...mentorConversations.map(c => c.conversations.id),
      ...learnerConversations.map(c => c.conversations.id)
    ]

    const result: ConversationWithParticipants[] = []
    for (const conversationId of allConversationIds) {
      try {
        // Check if user deleted this conversation and if there are any messages after deletion
        const conversationDeletion = await db.select()
          .from(conversationUserDeletions)
          .where(and(
            eq(conversationUserDeletions.conversationId, conversationId),
            eq(conversationUserDeletions.userId, userId)
          ))
          .orderBy(desc(conversationUserDeletions.deletedAt))
          .limit(1)

        const deletionTime = conversationDeletion[0]?.deletedAt

        // If conversation was deleted, check if there are any messages after deletion
        if (deletionTime) {
          const messagesAfterDeletion = await db.select()
            .from(messages)
            .where(and(
              eq(messages.conversationId, conversationId),
              gt(messages.createdAt, deletionTime)
            ))
            .limit(1)

          // If no messages after deletion, skip this conversation
          if (messagesAfterDeletion.length === 0) {
            continue
          }
        }

        const conv = await this.getConversationWithParticipants(conversationId)

        // Get the last message for this conversation (respecting user deletion time)
        // (reuse deletionTime from above)

        const lastMessageConditions = [
          eq(messages.conversationId, conversationId),
          notExists(
            db.select()
              .from(messageUserDeletions)
              .where(and(
                eq(messageUserDeletions.messageId, messages.id),
                eq(messageUserDeletions.userId, userId)
              ))
          )
        ]

        // If user deleted the conversation, only show messages after deletion
        if (deletionTime) {
          lastMessageConditions.push(gt(messages.createdAt, deletionTime))
        }

        const lastMessageQuery = await db.select()
          .from(messages)
          .innerJoin(users, eq(messages.senderId, users.id))
          .where(and(...lastMessageConditions))
          .orderBy(desc(messages.createdAt))
          .limit(1)

        if (lastMessageQuery.length > 0) {
          const lastMsg = lastMessageQuery[0]
          conv.lastMessage = {
            id: lastMsg.messages.id,
            content: lastMsg.messages.content,
            messageType: lastMsg.messages.messageType,
            createdAt: lastMsg.messages.createdAt.toISOString(),
            senderName: `${lastMsg.users.firstName} ${lastMsg.users.lastName}`.trim(),
          }
        }

        result.push(conv)
      } catch (error) {
        console.error('Error fetching conversation:', conversationId, error)
      }
    }

    return result.sort((a, b) => {
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0
      return bTime - aTime
    })
  }

  static async getConversationMessages(
    conversationId: number,
    userId: number,
    page = 0,
    limit = 50
  ): Promise<ChatMessage[]> {
    // Check if user deleted this conversation and when
    const conversationDeletion = await db.select()
      .from(conversationUserDeletions)
      .where(and(
        eq(conversationUserDeletions.conversationId, conversationId),
        eq(conversationUserDeletions.userId, userId)
      ))
      .orderBy(desc(conversationUserDeletions.deletedAt))
      .limit(1)

    const deletionTime = conversationDeletion[0]?.deletedAt

    const whereConditions = [
      eq(messages.conversationId, conversationId),
      // Exclude individually deleted messages
      notExists(
        db.select()
          .from(messageUserDeletions)
          .where(and(
            eq(messageUserDeletions.messageId, messages.id),
            eq(messageUserDeletions.userId, userId)
          ))
      )
    ]

    // If user deleted the conversation, only show messages after deletion
    if (deletionTime) {
      whereConditions.push(gt(messages.createdAt, deletionTime))
    }

    const result = await db.select()
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(and(...whereConditions))
      .orderBy(desc(messages.createdAt))
      .limit(limit)
      .offset(page * limit)

    return result.map(row => ({
      id: row.messages.id,
      conversationId: row.messages.conversationId,
      senderId: row.messages.senderId,
      content: row.messages.content,
      messageType: row.messages.messageType,
      createdAt: row.messages.createdAt.toISOString(),
      editedAt: row.messages.editedAt?.toISOString(),
      sender: {
        id: row.users.id,
        firstName: row.users.firstName,
        lastName: row.users.lastName,
        profilePictureUrl: null,
      },
    }))
  }

  static async sendMessage(
    conversationId: number,
    senderId: number,
    content: string,
    messageType: string = 'text',
    _attachments?: Array<{
      originalFilename: string
      systemFilename: string
      fileUrl: string
      fileSize: number
      mimeType: string
      storagePath?: string
    }>
  ): Promise<ChatMessage> {
    // Validate message content and attachments
    const validation = validateChatMessage({
      content,
      messageType: messageType as 'text' | 'file' | 'image',
      attachments: _attachments,
    })

    if (!validation.isValid) {
      Metrics.error('chat_validation_failed', `sendMessage:${conversationId}`)
      throw new Error(`Message validation failed: ${validation.errors.join(', ')}`)
    }

    // Log warnings if any
    if (validation.warnings.length > 0) {
      console.warn('[CHAT_SERVICE] Message validation warnings:', validation.warnings)
    }

    // Use sanitized content if available
    const sanitizedContent = validation.sanitizedContent || content

    // Log metrics for spam detection
    if (validation.isSpam) {
      Metrics.increment('chat.spam.detected', 1, { conversationId: conversationId.toString() })
      console.warn(`[CHAT_SERVICE] Potential spam detected in conversation ${conversationId}`)
    }

    // Log risk level metrics
    Metrics.increment('chat.message.risk_level', 1, {
      level: validation.riskLevel,
      conversationId: conversationId.toString()
    })

    // Insert message with sanitized content
    const newMessage = await db.insert(messages)
      .values({
        conversationId,
        senderId,
        content: sanitizedContent,
        messageType,
      })
      .returning()

    // Track message metrics
    Metrics.messagesSent(conversationId, messageType)

    // Update conversation last message time and mark as read for sender
    const conversation = await db.select().from(conversations).where(eq(conversations.id, conversationId)).limit(1)
    if (conversation[0]) {
      const now = new Date()
      const updateData: any = {
        lastMessageAt: now,
        updatedAt: now
      }

      // Mark as read for the sender
      const mentorData = await db.select().from(mentors).where(eq(mentors.userId, senderId)).limit(1)
      const learnerData = await db.select().from(learners).where(eq(learners.userId, senderId)).limit(1)

      if (mentorData[0] && conversation[0].mentorId === mentorData[0].id) {
        // Sender is the mentor
        updateData.mentorLastReadAt = now
      } else if (learnerData[0] && conversation[0].learnerId === learnerData[0].id) {
        // Sender is the learner
        updateData.learnerLastReadAt = now
      }

      await db.update(conversations)
        .set(updateData)
        .where(eq(conversations.id, conversationId))
    }

    // Get complete message with sender info
    const messageWithSender = await db.select()
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.id, (newMessage as any)[0]?.id!))
      .limit(1)

    const msg = messageWithSender[0] as any
    const chatMessage: ChatMessage = {
      id: msg.messages.id,
      conversationId: msg.messages.conversationId,
      senderId: msg.messages.senderId,
      content: msg.messages.content,
      messageType: msg.messages.messageType,
      createdAt: msg.messages.createdAt.toISOString(),
      editedAt: msg.messages.editedAt?.toISOString(),
      sender: {
        id: msg.users.id,
        firstName: msg.users.firstName,
        lastName: msg.users.lastName,
        profilePictureUrl: null,
      },
    }

    // Trigger real-time event
    await triggerPusherEvent(
      getConversationChannel(conversationId),
      PUSHER_EVENTS.NEW_MESSAGE,
      chatMessage
    )

    return chatMessage
  }

  static async markConversationAsRead(conversationId: number, userId: number): Promise<void> {
    // Get conversation to determine user role
    const conversation = await db.select().from(conversations).where(eq(conversations.id, conversationId)).limit(1)
    if (!conversation[0]) {
      throw new Error('Conversation not found')
    }

    // Check if user is mentor or learner
    const userMentor = await db.select().from(mentors).where(eq(mentors.userId, userId)).limit(1)
    const userLearner = await db.select().from(learners).where(eq(learners.userId, userId)).limit(1)

    const now = new Date()

    if (userMentor[0] && userMentor[0].id === conversation[0].mentorId) {
      // User is the mentor
      await db.update(conversations)
        .set({ mentorLastReadAt: now })
        .where(eq(conversations.id, conversationId))
    } else if (userLearner[0] && userLearner[0].id === conversation[0].learnerId) {
      // User is the learner
      await db.update(conversations)
        .set({ learnerLastReadAt: now })
        .where(eq(conversations.id, conversationId))
    } else {
      throw new Error('User is not a participant in this conversation')
    }
  }

  static async deleteMessageForUser(messageId: number, userId: number): Promise<void> {
    await db.insert(messageUserDeletions)
      .values({
        messageId,
        userId,
      })
  }

  static async deleteConversationForUser(conversationId: number, userId: number): Promise<void> {
    await db.insert(conversationUserDeletions)
      .values({
        conversationId,
        userId,
      })
  }
}