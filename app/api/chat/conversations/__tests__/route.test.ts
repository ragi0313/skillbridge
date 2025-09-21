import { POST, GET } from '../route'
import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/getSession'
import { ChatService } from '@/lib/services/ChatService'

// Mock dependencies
jest.mock('@/lib/auth/getSession')
jest.mock('@/lib/services/ChatService')

const mockGetSession = getSession as jest.MockedFunction<typeof getSession>
const mockChatService = ChatService as jest.Mocked<typeof ChatService>

describe('/api/chat/conversations', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST', () => {
    it('should create conversation for mentor', async () => {
      const mockUser = { id: 1, role: 'mentor' }
      const mockConversation = {
        id: 1,
        mentorId: 1,
        learnerId: 2,
        mentor: { id: 1, userId: 1, firstName: 'John', lastName: 'Doe', profilePictureUrl: null },
        learner: { id: 2, userId: 2, firstName: 'Jane', lastName: 'Smith', profilePictureUrl: null },
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      mockGetSession.mockResolvedValue(mockUser as any)
      mockChatService.getOrCreateConversation.mockResolvedValue(mockConversation as any)

      const request = new NextRequest('http://localhost/api/chat/conversations', {
        method: 'POST',
        body: JSON.stringify({ learnerUserId: 2 }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.conversation).toEqual(mockConversation)
      expect(mockChatService.getOrCreateConversation).toHaveBeenCalledWith(1, 2)
    })

    it('should create conversation for learner', async () => {
      const mockUser = { id: 2, role: 'learner' }
      const mockConversation = {
        id: 1,
        mentorId: 1,
        learnerId: 2,
        mentor: { id: 1, userId: 1, firstName: 'John', lastName: 'Doe', profilePictureUrl: null },
        learner: { id: 2, userId: 2, firstName: 'Jane', lastName: 'Smith', profilePictureUrl: null },
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      mockGetSession.mockResolvedValue(mockUser as any)
      mockChatService.getOrCreateConversation.mockResolvedValue(mockConversation as any)

      const request = new NextRequest('http://localhost/api/chat/conversations', {
        method: 'POST',
        body: JSON.stringify({ mentorUserId: 1 }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.conversation).toEqual(mockConversation)
      expect(mockChatService.getOrCreateConversation).toHaveBeenCalledWith(1, 2)
    })

    it('should return 401 if not authenticated', async () => {
      mockGetSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/chat/conversations', {
        method: 'POST',
        body: JSON.stringify({ learnerUserId: 2 }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 if mentor missing learnerUserId', async () => {
      const mockUser = { id: 1, role: 'mentor' }
      mockGetSession.mockResolvedValue(mockUser as any)

      const request = new NextRequest('http://localhost/api/chat/conversations', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Learner user ID is required when mentor creates conversation')
    })

    it('should return 400 if learner missing mentorUserId', async () => {
      const mockUser = { id: 2, role: 'learner' }
      mockGetSession.mockResolvedValue(mockUser as any)

      const request = new NextRequest('http://localhost/api/chat/conversations', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Mentor user ID is required when learner creates conversation')
    })

    it('should return 403 if user role is invalid', async () => {
      const mockUser = { id: 1, role: 'admin' }
      mockGetSession.mockResolvedValue(mockUser as any)

      const request = new NextRequest('http://localhost/api/chat/conversations', {
        method: 'POST',
        body: JSON.stringify({ learnerUserId: 2 }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Only mentors and learners can create conversations')
    })

    it('should return 500 if service throws error', async () => {
      const mockUser = { id: 1, role: 'mentor' }
      mockGetSession.mockResolvedValue(mockUser as any)
      mockChatService.getOrCreateConversation.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost/api/chat/conversations', {
        method: 'POST',
        body: JSON.stringify({ learnerUserId: 2 }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to create conversation')
    })
  })

  describe('GET', () => {
    it('should return user conversations', async () => {
      const mockUser = { id: 1, role: 'mentor' }
      const mockConversations = [
        {
          id: 1,
          mentorId: 1,
          learnerId: 2,
          mentor: { id: 1, userId: 1, firstName: 'John', lastName: 'Doe', profilePictureUrl: null },
          learner: { id: 2, userId: 2, firstName: 'Jane', lastName: 'Smith', profilePictureUrl: null },
          lastMessage: { id: 1, content: 'Hello', messageType: 'text', createdAt: new Date().toISOString(), senderName: 'John Doe' },
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      ]

      mockGetSession.mockResolvedValue(mockUser as any)
      mockChatService.getUserConversations.mockResolvedValue(mockConversations as any)

      const request = new NextRequest('http://localhost/api/chat/conversations')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.conversations).toEqual(mockConversations)
      expect(mockChatService.getUserConversations).toHaveBeenCalledWith(1)
    })

    it('should return 401 if not authenticated', async () => {
      mockGetSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/chat/conversations')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 500 if service throws error', async () => {
      const mockUser = { id: 1, role: 'mentor' }
      mockGetSession.mockResolvedValue(mockUser as any)
      mockChatService.getUserConversations.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost/api/chat/conversations')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch conversations')
    })
  })
})