import '@testing-library/jest-dom'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: '',
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn().mockResolvedValue(undefined),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  },
}))

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    return <img {...props} />
  },
}))

// Mock environment variables for tests
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-purposes-only-12345'
process.env.BLOB_READ_WRITE_TOKEN = 'test-blob-token'
process.env.CRON_SECRET = 'test-cron-secret'
process.env.XENDIT_SECRET_KEY = 'test-xendit-key'
process.env.XENDIT_PLATFORM_ACCOUNT_NUMBER = 'test-account'

// Mock fetch globally
global.fetch = jest.fn()

// Cleanup after each test
afterEach(() => {
  jest.resetAllMocks()
})