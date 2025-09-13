import { db } from "@/db"
import { conversations, messages, users, mentors, learners, conversationUserDeletions } from "@/db/schema"
import { eq, desc, and, or, notExists } from "drizzle-orm"
import { getSession } from "@/lib/auth/getSession"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const session = await getSession()
  
  if (!session || !["mentor", "learner"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    let userConversations

    if (session.role === "mentor") {
      const mentor = await db
        .select({ id: mentors.id })
        .from(mentors)
        .where(eq(mentors.userId, session.id))
        .limit(1)
      
      if (!mentor[0]) {
        return NextResponse.json({ error: "Mentor profile not found" }, { status: 404 })
      }

      userConversations = await db
        .select({
          id: conversations.id,
          mentorId: conversations.mentorId,
          learnerId: conversations.learnerId,
          lastMessageAt: conversations.lastMessageAt,
          mentorLastReadAt: conversations.mentorLastReadAt,
          learnerLastReadAt: conversations.learnerLastReadAt,
          isActive: conversations.isActive,
          createdAt: conversations.createdAt,
          updatedAt: conversations.updatedAt,
          otherUser: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            profilePictureUrl: learners.profilePictureUrl,
          }
        })
        .from(conversations)
        .innerJoin(learners, eq(conversations.learnerId, learners.id))
        .innerJoin(users, eq(learners.userId, users.id))
        .where(and(
          eq(conversations.mentorId, mentor[0].id),
          // Exclude conversations deleted by this user
          notExists(
            db.select()
              .from(conversationUserDeletions)
              .where(
                and(
                  eq(conversationUserDeletions.conversationId, conversations.id),
                  eq(conversationUserDeletions.userId, session.id)
                )
              )
          )
        ))
        .orderBy(desc(conversations.lastMessageAt))

      // Fetch last message for each conversation
      for (const conversation of userConversations) {
        const lastMessage = await db
          .select({
            id: messages.id,
            content: messages.content,
            senderId: messages.senderId,
            messageType: messages.messageType,
            createdAt: messages.createdAt,
          })
          .from(messages)
          .where(eq(messages.conversationId, conversation.id))
          .orderBy(desc(messages.createdAt))
          .limit(1)
        
        if (lastMessage.length > 0) {
          (conversation as any).lastMessage = lastMessage[0]
        }
      }
    } else {
      const learner = await db
        .select({ id: learners.id })
        .from(learners)
        .where(eq(learners.userId, session.id))
        .limit(1)
      
      if (!learner[0]) {
        return NextResponse.json({ error: "Learner profile not found" }, { status: 404 })
      }

      userConversations = await db
        .select({
          id: conversations.id,
          mentorId: conversations.mentorId,
          learnerId: conversations.learnerId,
          lastMessageAt: conversations.lastMessageAt,
          mentorLastReadAt: conversations.mentorLastReadAt,
          learnerLastReadAt: conversations.learnerLastReadAt,
          isActive: conversations.isActive,
          createdAt: conversations.createdAt,
          updatedAt: conversations.updatedAt,
          otherUser: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            profilePictureUrl: mentors.profilePictureUrl,
          }
        })
        .from(conversations)
        .innerJoin(mentors, eq(conversations.mentorId, mentors.id))
        .innerJoin(users, eq(mentors.userId, users.id))
        .where(and(
          eq(conversations.learnerId, learner[0].id),
          // Exclude conversations deleted by this user
          notExists(
            db.select()
              .from(conversationUserDeletions)
              .where(
                and(
                  eq(conversationUserDeletions.conversationId, conversations.id),
                  eq(conversationUserDeletions.userId, session.id)
                )
              )
          )
        ))
        .orderBy(desc(conversations.lastMessageAt))

      // Fetch last message for each conversation
      for (const conversation of userConversations) {
        const lastMessage = await db
          .select({
            id: messages.id,
            content: messages.content,
            senderId: messages.senderId,
            messageType: messages.messageType,
            createdAt: messages.createdAt,
          })
          .from(messages)
          .where(eq(messages.conversationId, conversation.id))
          .orderBy(desc(messages.createdAt))
          .limit(1)
        
        if (lastMessage.length > 0) {
          (conversation as any).lastMessage = lastMessage[0]
        }
      }
    }

    return NextResponse.json({ conversations: userConversations })
  } catch (error) {
    console.error("Error fetching conversations:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  
  if (!session || !["mentor", "learner"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { otherUserId } = await request.json()
    
    if (!otherUserId) {
      return NextResponse.json({ error: "Other user ID is required" }, { status: 400 })
    }

    let mentorId: number, learnerId: number
    
    if (session.role === "mentor") {
      const mentor = await db
        .select({ id: mentors.id })
        .from(mentors)
        .where(eq(mentors.userId, session.id))
        .limit(1)
      
      if (!mentor[0]) {
        return NextResponse.json({ error: "Mentor profile not found" }, { status: 404 })
      }
      
      mentorId = mentor[0].id
      
      const learnerResult = await db.select({ id: learners.id }).from(learners).where(eq(learners.userId, otherUserId))
      if (learnerResult.length === 0) {
        return NextResponse.json({ error: "Learner not found" }, { status: 404 })
      }
      learnerId = learnerResult[0].id
    } else {
      const learner = await db
        .select({ id: learners.id })
        .from(learners)
        .where(eq(learners.userId, session.id))
        .limit(1)
      
      if (!learner[0]) {
        return NextResponse.json({ error: "Learner profile not found" }, { status: 404 })
      }
      
      learnerId = learner[0].id
      
      const mentorResult = await db.select({ id: mentors.id }).from(mentors).where(eq(mentors.userId, otherUserId))
      if (mentorResult.length === 0) {
        return NextResponse.json({ error: "Mentor not found" }, { status: 404 })
      }
      mentorId = mentorResult[0].id
    }

    // Check if conversation already exists and is not deleted by current user
    const existingConversation = await db
      .select()
      .from(conversations)
      .where(and(
        eq(conversations.mentorId, mentorId),
        eq(conversations.learnerId, learnerId),
        // Make sure the conversation is not deleted by the current user
        notExists(
          db.select()
            .from(conversationUserDeletions)
            .where(
              and(
                eq(conversationUserDeletions.conversationId, conversations.id),
                eq(conversationUserDeletions.userId, session.id)
              )
            )
        )
      ))
      .limit(1)

    if (existingConversation.length > 0) {
      return NextResponse.json({ conversation: existingConversation[0] })
    }

    // Create new conversation
    const newConversation = await db
      .insert(conversations)
      .values({
        mentorId,
        learnerId,
        lastMessageAt: new Date(),
      })
      .returning()

    return NextResponse.json({ conversation: newConversation[0] }, { status: 201 })
  } catch (error) {
    console.error("Error creating conversation:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}