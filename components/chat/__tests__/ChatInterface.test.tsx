import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChatInterface } from '../ChatInterface'
import { useChat as useChatHook } from '@/lib/hooks/useChat'
import { useChat } from '@/lib/context/ChatContext'

// Mock hooks
jest.mock('@/lib/hooks/useChat')
jest.mock('@/lib/context/ChatContext')

const mockUseChatHook = useChatHook as jest.MockedFunction<typeof useChatHook>
const mockUseChat = useChat as jest.MockedFunction<typeof useChat>

// Mock fetch
global.fetch = jest.fn()

describe('ChatInterface', () => {
  const mockUser = {
    id: 1,
    role: 'mentor',
    firstName: 'John',
    lastName: 'Doe',
  }

  const mockConversation = {
    id: 1,
    mentorId: 1,
    learnerId: 2,
    mentorLastReadAt: null,
    learnerLastReadAt: null,
    lastMessageAt: new Date().toISOString(),
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    mentor: {
      id: 1,
      userId: 1,
      firstName: 'John',
      lastName: 'Doe',
      profilePictureUrl: null,
    },
    learner: {
      id: 2,
      userId: 2,
      firstName: 'Jane',
      lastName: 'Smith',
      profilePictureUrl: null,
    },
  }

  const mockMessages = [
    {
      id: 1,
      conversationId: 1,
      senderId: 1,
      content: 'Hello there!',
      messageType: 'text',
      createdAt: new Date().toISOString(),
      sender: {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
      },
    },
    {
      id: 2,
      conversationId: 1,
      senderId: 2,
      content: 'Hi! How are you?',
      messageType: 'text',
      createdAt: new Date().toISOString(),
      sender: {
        id: 2,
        firstName: 'Jane',
        lastName: 'Smith',
      },
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock useChat context
    mockUseChat.mockReturnValue({
      subscribeToConversation: jest.fn(() => jest.fn()),
      unsubscribeFromConversation: jest.fn(),
      isConnected: true,
    } as any)

    // Mock useChatHook
    mockUseChatHook.mockReturnValue({
      messages: mockMessages,
      sending: false,
      fetchMessages: jest.fn(),
      sendMessage: jest.fn(),
      addMessage: jest.fn(),
      messagesEndRef: { current: null },
      scrollToBottom: jest.fn(),
    } as any)

    // Mock fetch for marking as read
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    })
  })

  it('renders chat interface with conversation', () => {
    render(
      <ChatInterface
        user={mockUser as any}
        conversation={mockConversation}
      />
    )

    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    expect(screen.getByText('Hello there!')).toBeInTheDocument()
    expect(screen.getByText('Hi! How are you?')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument()
  })

  it('renders empty state when no conversation selected', () => {
    render(
      <ChatInterface
        user={mockUser as any}
        conversation={null}
      />
    )

    expect(screen.getByText('Select a conversation')).toBeInTheDocument()
    expect(screen.getByText('Choose a conversation from the sidebar to start messaging')).toBeInTheDocument()
  })

  it('sends message when user types and presses enter', async () => {
    const mockSendMessage = jest.fn()
    const mockScrollToBottom = jest.fn()

    mockUseChatHook.mockReturnValue({
      messages: mockMessages,
      sending: false,
      fetchMessages: jest.fn(),
      sendMessage: mockSendMessage,
      addMessage: jest.fn(),
      messagesEndRef: { current: null },
      scrollToBottom: mockScrollToBottom,
    } as any)

    const user = userEvent.setup()

    render(
      <ChatInterface
        user={mockUser as any}
        conversation={mockConversation}
      />
    )

    const input = screen.getByPlaceholderText('Type a message...')

    await user.type(input, 'Test message')
    await user.keyboard('{Enter}')

    expect(mockSendMessage).toHaveBeenCalledWith('Test message')
    expect(mockScrollToBottom).toHaveBeenCalled()
  })

  it('sends message when send button is clicked', async () => {
    const mockSendMessage = jest.fn()
    const mockScrollToBottom = jest.fn()

    mockUseChatHook.mockReturnValue({
      messages: mockMessages,
      sending: false,
      fetchMessages: jest.fn(),
      sendMessage: mockSendMessage,
      addMessage: jest.fn(),
      messagesEndRef: { current: null },
      scrollToBottom: mockScrollToBottom,
    } as any)

    const user = userEvent.setup()

    render(
      <ChatInterface
        user={mockUser as any}
        conversation={mockConversation}
      />
    )

    const input = screen.getByPlaceholderText('Type a message...')
    const sendButton = screen.getByRole('button')

    await user.type(input, 'Test message')
    await user.click(sendButton)

    expect(mockSendMessage).toHaveBeenCalledWith('Test message')
    expect(mockScrollToBottom).toHaveBeenCalled()
  })

  it('does not send empty messages', async () => {
    const mockSendMessage = jest.fn()

    mockUseChatHook.mockReturnValue({
      messages: mockMessages,
      sending: false,
      fetchMessages: jest.fn(),
      sendMessage: mockSendMessage,
      addMessage: jest.fn(),
      messagesEndRef: { current: null },
      scrollToBottom: jest.fn(),
    } as any)

    const user = userEvent.setup()

    render(
      <ChatInterface
        user={mockUser as any}
        conversation={mockConversation}
      />
    )

    const input = screen.getByPlaceholderText('Type a message...')

    await user.type(input, '   ')
    await user.keyboard('{Enter}')

    expect(mockSendMessage).not.toHaveBeenCalled()
  })

  it('disables input and send button when sending', () => {
    mockUseChatHook.mockReturnValue({
      messages: mockMessages,
      sending: true,
      fetchMessages: jest.fn(),
      sendMessage: jest.fn(),
      addMessage: jest.fn(),
      messagesEndRef: { current: null },
      scrollToBottom: jest.fn(),
    } as any)

    render(
      <ChatInterface
        user={mockUser as any}
        conversation={mockConversation}
      />
    )

    const input = screen.getByPlaceholderText('Type a message...')
    const sendButton = screen.getByRole('button')

    expect(input).toBeDisabled()
    expect(sendButton).toBeDisabled()
  })

  it('shows online status when connected', () => {
    render(
      <ChatInterface
        user={mockUser as any}
        conversation={mockConversation}
      />
    )

    expect(screen.getByText('Online')).toBeInTheDocument()
  })

  it('shows offline status when disconnected', () => {
    mockUseChat.mockReturnValue({
      subscribeToConversation: jest.fn(() => jest.fn()),
      unsubscribeFromConversation: jest.fn(),
      isConnected: false,
    } as any)

    render(
      <ChatInterface
        user={mockUser as any}
        conversation={mockConversation}
      />
    )

    expect(screen.getByText('Offline')).toBeInTheDocument()
  })

  it('marks conversation as read when opened', async () => {
    render(
      <ChatInterface
        user={mockUser as any}
        conversation={mockConversation}
      />
    )

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/chat/conversations/1/read',
        { method: 'POST' }
      )
    })
  })

  it('calls fetchMessages when conversation changes', () => {
    const mockFetchMessages = jest.fn()

    mockUseChatHook.mockReturnValue({
      messages: mockMessages,
      sending: false,
      fetchMessages: mockFetchMessages,
      sendMessage: jest.fn(),
      addMessage: jest.fn(),
      messagesEndRef: { current: null },
      scrollToBottom: jest.fn(),
    } as any)

    const { rerender } = render(
      <ChatInterface
        user={mockUser as any}
        conversation={null}
      />
    )

    expect(mockFetchMessages).not.toHaveBeenCalled()

    rerender(
      <ChatInterface
        user={mockUser as any}
        conversation={mockConversation}
      />
    )

    expect(mockFetchMessages).toHaveBeenCalledWith(true)
  })
})