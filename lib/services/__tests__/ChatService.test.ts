import { ChatService } from '../ChatService'
import { db } from '@/db'
import { conversations, messages, mentors, learners, users, messageUserDeletions, conversationUserDeletions } from '@/db/schema'
import { triggerPusherEvent } from '@/lib/pusher/config'

// Mock the database
jest.mock('@/db', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    transaction: jest.fn(),
  },
}))

// Mock Pusher
jest.mock('@/lib/pusher/config', () => ({
  triggerPusherEvent: jest.fn(),
  getConversationChannel: jest.fn((id) => `conversation-${id}`),
  PUSHER_EVENTS: {
    NEW_MESSAGE: 'new-message',
  },
}))

const mockDb = db as jest.Mocked<typeof db>
const mockTriggerPusherEvent = triggerPusherEvent as jest.MockedFunction<typeof triggerPusherEvent>

describe('ChatService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getOrCreateConversation', () => {
    it('should return existing conversation if it exists', async () => {
      const mockMentor = { id: 1 }
      const mockLearner = { id: 2 }
      const mockConversation = { id: 3, mentorId: 1, learnerId: 2 }

      // Mock mentor lookup
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockMentor])
          })
        })
      } as any)

      // Mock learner lookup
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockLearner])
          })
        })
      } as any)

      // Mock existing conversation lookup
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockConversation])
          })
        })
      } as any)

      // Mock getConversationWithParticipants call
      const mockFullConversation = {
        ...mockConversation,
        mentor: { id: 1, userId: 1, firstName: 'John', lastName: 'Doe', profilePictureUrl: null },
        learner: { id: 2, userId: 2, firstName: 'Jane', lastName: 'Smith', profilePictureUrl: null },
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // Mock the detailed conversation query
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockConversation])
          })
        })
      } as any)

      // Mock mentor details
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          innerJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([{
                mentors: { id: 1 },
                users: { id: 1, firstName: 'John', lastName: 'Doe' }
              }])
            })
          })
        })
      } as any)

      // Mock learner details
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          innerJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([{
                learners: { id: 2 },
                users: { id: 2, firstName: 'Jane', lastName: 'Smith' }
              }])
            })
          })
        })
      } as any)

      const result = await ChatService.getOrCreateConversation(1, 2)

      expect(result).toMatchObject({
        id: 3,
        mentorId: 1,
        learnerId: 2,
      })
    })

    it('should create new conversation if none exists', async () => {
      const mockMentor = { id: 1 }
      const mockLearner = { id: 2 }
      const mockNewConversation = { id: 3, mentorId: 1, learnerId: 2 }

      // Mock mentor lookup
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockMentor])
          })
        })
      } as any)

      // Mock learner lookup
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockLearner])
          })
        })
      } as any)

      // Mock no existing conversation
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([])
          })
        })
      } as any)

      // Mock no deleted conversation
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([])
          })
        })
      } as any)

      // Mock conversation creation
      mockDb.insert.mockReturnValueOnce({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockNewConversation])
        })
      } as any)

      // Mock getConversationWithParticipants calls for the new conversation
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockNewConversation])
          })
        })
      } as any)

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          innerJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([{
                mentors: { id: 1 },
                users: { id: 1, firstName: 'John', lastName: 'Doe' }
              }])
            })
          })
        })
      } as any)

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          innerJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([{
                learners: { id: 2 },
                users: { id: 2, firstName: 'Jane', lastName: 'Smith' }
              }])
            })
          })
        })
      } as any)

      const result = await ChatService.getOrCreateConversation(1, 2)

      expect(mockDb.insert).toHaveBeenCalledWith(conversations)
      expect(result).toMatchObject({
        id: 3,
        mentorId: 1,
        learnerId: 2,
      })
    })

    it('should throw error if mentor not found', async () => {
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([])
          })
        })
      } as any)

      await expect(ChatService.getOrCreateConversation(1, 2)).rejects.toThrow('Mentor or learner not found')
    })
  })

  describe('sendMessage', () => {
    it('should send message and trigger pusher event', async () => {
      const mockMessage = { id: 1, conversationId: 1, senderId: 1, content: 'Hello' }
      const mockConversation = { id: 1, mentorId: 1, learnerId: 2 }

      // Mock message insertion
      mockDb.insert.mockReturnValueOnce({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockMessage])
        })
      } as any)

      // Mock conversation lookup
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockConversation])
          })
        })
      } as any)

      // Mock mentor/learner checks
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{ id: 1 }])
          })
        })
      } as any)

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([])
          })
        })
      } as any)

      // Mock conversation update
      mockDb.update.mockReturnValueOnce({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined)
        })
      } as any)

      // Mock message with sender query
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          innerJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([{
                messages: mockMessage,
                users: { id: 1, firstName: 'John', lastName: 'Doe' }
              }])
            })
          })
        })
      } as any)

      mockTriggerPusherEvent.mockResolvedValue(true)

      const result = await ChatService.sendMessage(1, 1, 'Hello', 'text')

      expect(mockDb.insert).toHaveBeenCalledWith(messages)
      expect(mockTriggerPusherEvent).toHaveBeenCalled()
      expect(result).toMatchObject({
        id: 1,
        content: 'Hello',
        senderId: 1,
      })
    })
  })

  describe('markConversationAsRead', () => {
    it('should mark conversation as read for mentor', async () => {
      const mockConversation = { id: 1, mentorId: 1, learnerId: 2 }
      const mockMentor = { id: 1 }

      // Mock conversation lookup
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockConversation])
          })
        })
      } as any)

      // Mock mentor lookup
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockMentor])
          })
        })
      } as any)

      // Mock learner lookup (empty)
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([])
          })
        })
      } as any)

      // Mock conversation update
      mockDb.update.mockReturnValueOnce({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined)
        })
      } as any)

      await ChatService.markConversationAsRead(1, 1)

      expect(mockDb.update).toHaveBeenCalledWith(conversations)
    })

    it('should throw error if user is not a participant', async () => {
      const mockConversation = { id: 1, mentorId: 1, learnerId: 2 }

      // Mock conversation lookup
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockConversation])
          })
        })
      } as any)

      // Mock mentor lookup (empty)
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([])
          })
        })
      } as any)

      // Mock learner lookup (empty)
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([])
          })
        })
      } as any)

      await expect(ChatService.markConversationAsRead(1, 999)).rejects.toThrow('User is not a participant in this conversation')
    })
  })

  describe('deleteMessageForUser', () => {
    it('should create user deletion record', async () => {
      mockDb.insert.mockReturnValueOnce({
        values: jest.fn().mockResolvedValue(undefined)
      } as any)

      await ChatService.deleteMessageForUser(1, 1)

      expect(mockDb.insert).toHaveBeenCalledWith(messageUserDeletions)
    })
  })

  describe('deleteConversationForUser', () => {
    it('should create conversation deletion record', async () => {
      mockDb.insert.mockReturnValueOnce({
        values: jest.fn().mockResolvedValue(undefined)
      } as any)

      await ChatService.deleteConversationForUser(1, 1)

      expect(mockDb.insert).toHaveBeenCalledWith(conversationUserDeletions)
    })
  })
})