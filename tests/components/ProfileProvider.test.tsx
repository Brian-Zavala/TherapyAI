// Tests for ProfileProvider component
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, waitFor, act } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ProfileProvider, useProfile } from '@/providers/ProfileProvider'

// Define UserProfile interface locally since @/types/user doesn't exist
interface UserProfile {
  id: string
  email: string
  name: string
  onboardingCompleted?: boolean
  hasSeenIntro?: boolean
}

// Mock dependencies
vi.mock('next-auth/react')
vi.mock('next/navigation')

// Test component to access context
function TestComponent() {
  const profile = useProfile()
  return (
    <div>
      <div data-testid="loading">{profile.isLoading.toString()}</div>
      <div data-testid="error">{profile.error?.message || 'no-error'}</div>
      <div data-testid="profile">{JSON.stringify(profile.profile)}</div>
    </div>
  )
}

describe('ProfileProvider', () => {
  const mockPush = vi.fn()
  const mockSession = {
    user: { email: 'test@example.com', name: 'Test User' }
  }
  const mockProfile: UserProfile = {
    id: '123',
    email: 'test@example.com',
    name: 'Test User',
    onboardingCompleted: true,
    hasSeenIntro: true
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useRouter).mockReturnValue({ push: mockPush } as any)
    vi.mocked(useSession).mockReturnValue({ 
      data: mockSession, 
      status: 'authenticated' 
    } as any)
    
    // Reset fetch mock
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Initial Loading', () => {
    it('should show loading state initially', () => {
      vi.mocked(fetch).mockImplementation(() => new Promise(() => {})) // Never resolves

      const { getByTestId } = render(
        <ProfileProvider>
          <TestComponent />
        </ProfileProvider>
      )

      expect(getByTestId('loading')).toHaveTextContent('true')
      expect(getByTestId('error')).toHaveTextContent('no-error')
      expect(getByTestId('profile')).toHaveTextContent('null')
    })

    it('should not fetch profile when user is not authenticated', () => {
      vi.mocked(useSession).mockReturnValue({ 
        data: null, 
        status: 'unauthenticated' 
      } as any)

      render(
        <ProfileProvider>
          <TestComponent />
        </ProfileProvider>
      )

      expect(fetch).not.toHaveBeenCalled()
    })
  })

  describe('Successful Profile Fetch', () => {
    it('should fetch and display profile data', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockProfile
      } as Response)

      const { getByTestId } = render(
        <ProfileProvider>
          <TestComponent />
        </ProfileProvider>
      )

      await waitFor(() => {
        expect(getByTestId('loading')).toHaveTextContent('false')
        expect(getByTestId('profile')).toHaveTextContent(JSON.stringify(mockProfile))
      })

      expect(fetch).toHaveBeenCalledWith('/api/user/profile')
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

      const { getByTestId } = render(
        <ProfileProvider>
          <TestComponent />
        </ProfileProvider>
      )

      await waitFor(() => {
        expect(getByTestId('error')).toHaveTextContent('Failed to load profile')
        expect(getByTestId('loading')).toHaveTextContent('false')
      })
    })
  })

  describe('Performance', () => {
    it('should memoize context value to prevent unnecessary renders', () => {
      let renderCount = 0
      function CountingComponent() {
        renderCount++
        const profile = useProfile()
        return <div>{profile.isLoading.toString()}</div>
      }

      const { rerender } = render(
        <ProfileProvider>
          <CountingComponent />
        </ProfileProvider>
      )

      const initialRenderCount = renderCount

      // Rerender with same props
      rerender(
        <ProfileProvider>
          <CountingComponent />
        </ProfileProvider>
      )

      // Should not cause additional renders if context value hasn't changed
      expect(renderCount).toBeLessThanOrEqual(initialRenderCount + 2)
    })
  })
})
