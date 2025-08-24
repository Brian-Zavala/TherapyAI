// Test setup file for Vitest
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.DIRECT_URL = 'postgresql://test:test@localhost:5432/test'
process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.NEXTAUTH_SECRET = 'test-secret'
process.env.JWT_TOKEN_SECRET = 'test-jwt-secret'
process.env.VAPI_API_KEY = 'test-vapi-key'
// process.env.NODE_ENV = 'test' // Cannot assign to readonly NODE_ENV

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Suppress console errors during tests (optional)
const originalError = console.error
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
       args[0].includes('Warning: unmounted component') ||
       args[0].includes('Warning: An update to'))
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

// Global test utilities
export const waitForAsync = (ms: number = 0) => 
  new Promise(resolve => setTimeout(resolve, ms))

export const mockFetch = (response: any, options: { ok?: boolean; status?: number } = {}) => {
  return vi.fn().mockResolvedValue({
    ok: options.ok !== undefined ? options.ok : true,
    status: options.status || 200,
    json: async () => response,
    text: async () => JSON.stringify(response),
    headers: new Headers(),
    redirected: false,
    type: 'basic',
    url: 'http://localhost:3000/api/test',
    clone: function() { return this },
    body: null,
    bodyUsed: false,
    arrayBuffer: async () => new ArrayBuffer(0),
    blob: async () => new Blob(),
    formData: async () => new FormData(),
  } as Response)
}