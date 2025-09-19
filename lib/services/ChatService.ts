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
import { eq, and, desc, notExists } from 'drizzle-orm'
import { triggerPusherEvent, getConversationChannel, PUSHER_EVENTS } from '@/lib/pusher/config'

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

    // Check for existing conversation
    const existingConversation = await db.select()
      .from(conversations)
      .where(and(
        eq(conversations.mentorId, mentorResult[0].id),
        eq(conversations.learnerId, learnerResult[0].id)
      ))
      .limit(1)

    if (existingConversation[0]) {
      return await this.getConversationWithParticipants(existingConversation[0].id)
    } else {
      // Create new conversation
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
      createdAt: conv.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: conv.updatedAt?.toISOString() || new Date().toISOString(),
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
    // Get user's conversations as mentor (excluding soft-deleted ones)
    const mentorConversations = await db.select()
      .from(conversations)
      .innerJoin(mentors, eq(conversations.mentorId, mentors.id))
      .where(and(
        eq(mentors.userId, userId),
        notExists(
          db.select()
            .from(conversationUserDeletions)
            .where(and(
              eq(conversationUserDeletions.conversationId, conversations.id),
              eq(conversationUserDeletions.userId, userId)
            ))
        )
      ))

    // Get user's conversations as learner (excluding soft-deleted ones)
    const learnerConversations = await db.select()
      .from(conversations)
      .innerJoin(learners, eq(conversations.learnerId, learners.id))
      .where(and(
        eq(learners.userId, userId),
        notExists(
          db.select()
            .from(conversationUserDeletions)
            .where(and(
              eq(conversationUserDeletions.conversationId, conversations.id),
              eq(conversationUserDeletions.userId, userId)
            ))
        )
      ))

    const allConversationIds = [
      ...mentorConversations.map(c => c.conversations.id),
      ...learnerConversations.map(c => c.conversations.id)
    ]

    const result: ConversationWithParticipants[] = []
    for (const conversationId of allConversationIds) {
      try {
        const conv = await this.getConversationWithParticipants(conversationId)

        // Get the last message for this conversation
        const lastMessageQuery = await db.select()
          .from(messages)
          .innerJoin(users, eq(messages.senderId, users.id))
          .where(and(
            eq(messages.conversationId, conversationId),
            notExists(
              db.select()
                .from(messageUserDeletions)
                .where(and(
                  eq(messageUserDeletions.messageId, messages.id),
                  eq(messageUserDeletions.userId, userId)
                ))
            )
          ))
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
    const result = await db.select()
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(and(
        eq(messages.conversationId, conversationId),
        notExists(
          db.select()
            .from(messageUserDeletions)
            .where(and(
              eq(messageUserDeletions.messageId, messages.id),
              eq(messageUserDeletions.userId, userId)
            ))
        )
      ))
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
    // Insert message
    const newMessage = await db.insert(messages)
      .values({
        conversationId,
        senderId,
        content,
        messageType,
      })
      .returning()

    // Update conversation last message time
    await db.update(conversations)
      .set({
        lastMessageAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(conversations.id, conversationId))

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