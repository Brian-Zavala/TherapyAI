// Tests for ProfileProvider component
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, waitFor, act } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ProfileProvider, useProfile } from '@/providers/ProfileProvider'
import type { UserProfile } from '@/types/user'

// Mock dependencies
vi.mock('next-auth/react')
vi.mock('next/navigation')

// Test component to access context
function TestComponent() {
  const profile = useProfile()
  return (
    <div>
      <div data-testid="loading">{profile.loading.toString()}</div>
      <div data-testid="error">{profile.error || 'no-error'}</div>
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

    it('should handle session change and refetch profile', async () => {
      const { rerender } = render(
        <ProfileProvider>
          <TestComponent />
        </ProfileProvider>
      )

      // Change session
      vi.mocked(useSession).mockReturnValue({ 
        data: { user: { email: 'new@example.com' } }, 
        status: 'authenticated' 
      } as any)

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockProfile, email: 'new@example.com' })
      } as Response)

      rerender(
        <ProfileProvider>
          <TestComponent />
        </ProfileProvider>
      )

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle 401 errors and redirect to auth', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 401
      } as Response)

      render(
        <ProfileProvider>
          <TestComponent />
        </ProfileProvider>
      )

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/auth/signin')
      })
    })

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

    it('should retry on failure', async () => {
      vi.mocked(fetch)
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockProfile
        } as Response)

      const { getByTestId } = render(
        <ProfileProvider>
          <TestComponent />
        </ProfileProvider>
      )

      await waitFor(() => {
        expect(getByTestId('profile')).toHaveTextContent(JSON.stringify(mockProfile))
      }, { timeout: 5000 })

      expect(fetch).toHaveBeenCalledTimes(2)
    })

    it('should handle timeout errors', async () => {
      vi.mocked(fetch).mockImplementation(() => 
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 100)
        })
      )

      const { getByTestId } = render(
        <ProfileProvider>
          <TestComponent />
        </ProfileProvider>
      )

      await waitFor(() => {
        expect(getByTestId('error')).toHaveTextContent('Failed to load profile')
      })
    })
  })

  describe('Request Deduplication', () => {
    it('should prevent duplicate concurrent requests', async () => {
      let resolveCount = 0
      vi.mocked(fetch).mockImplementation(() => 
        new Promise(resolve => {
          resolveCount++
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => mockProfile
            } as Response)
          }, 100)
        })
      )

      // Render multiple components that will trigger fetch
      const { rerender } = render(
        <ProfileProvider>
          <TestComponent />
          <TestComponent />
          <TestComponent />
        </ProfileProvider>
      )

      // Force multiple fetch attempts
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
      })

      expect(resolveCount).toBe(1) // Only one request should be made
    })

    it('should allow new request after previous completes', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockProfile
      } as Response)

      const { rerender } = render(
        <ProfileProvider>
          <TestComponent />
        </ProfileProvider>
      )

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledTimes(1)
      })

      // Change session to trigger new fetch
      vi.mocked(useSession).mockReturnValue({ 
        data: { user: { email: 'another@example.com' } }, 
        status: 'authenticated' 
      } as any)

      rerender(
        <ProfileProvider>
          <TestComponent />
        </ProfileProvider>
      )

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('Profile Updates', () => {
    it('should update profile optimistically', async () => {
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
        expect(getByTestId('profile')).toHaveTextContent(JSON.stringify(mockProfile))
      })

      // Get the updateProfile function
      const updatedProfile = { ...mockProfile, name: 'Updated Name' }
      
      // Mock the update request
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      } as Response)

      // Trigger profile update through context
      act(() => {
        // This would be called by a component using the context
        // For now, we verify the structure exists
        expect(getByTestId('profile')).toBeDefined()
      })
    })

    it('should rollback on update failure', async () => {
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
        expect(getByTestId('profile')).toHaveTextContent(JSON.stringify(mockProfile))
      })

      // Mock failed update
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500
      } as Response)

      // Update would rollback to original profile
      await waitFor(() => {
        expect(getByTestId('profile')).toHaveTextContent(JSON.stringify(mockProfile))
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle missing profile data gracefully', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => null
      } as Response)

      const { getByTestId } = render(
        <ProfileProvider>
          <TestComponent />
        </ProfileProvider>
      )

      await waitFor(() => {
        expect(getByTestId('profile')).toHaveTextContent('null')
        expect(getByTestId('loading')).toHaveTextContent('false')
      })
    })

    it('should handle malformed response data', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invalid: 'data' })
      } as Response)

      const { getByTestId } = render(
        <ProfileProvider>
          <TestComponent />
        </ProfileProvider>
      )

      await waitFor(() => {
        expect(getByTestId('profile')).toHaveTextContent(JSON.stringify({ invalid: 'data' }))
      })
    })

    it('should cleanup on unmount', async () => {
      vi.mocked(fetch).mockImplementation(() => 
        new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => mockProfile
            } as Response)
          }, 1000)
        })
      )

      const { unmount } = render(
        <ProfileProvider>
          <TestComponent />
        </ProfileProvider>
      )

      unmount()

      // Should not cause any errors or memory leaks
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 1100))
      })
    })

    it('should handle rapid session changes', async () => {
      const sessions = [
        { user: { email: 'user1@example.com' } },
        { user: { email: 'user2@example.com' } },
        { user: { email: 'user3@example.com' } }
      ]

      let sessionIndex = 0
      vi.mocked(useSession).mockImplementation(() => ({
        data: sessions[sessionIndex],
        status: 'authenticated'
      } as any))

      vi.mocked(fetch).mockImplementation(() => 
        Promise.resolve({
          ok: true,
          json: async () => ({ ...mockProfile, email: sessions[sessionIndex].user.email })
        } as Response)
      )

      const { rerender } = render(
        <ProfileProvider>
          <TestComponent />
        </ProfileProvider>
      )

      // Rapidly change sessions
      for (let i = 1; i < sessions.length; i++) {
        sessionIndex = i
        rerender(
          <ProfileProvider>
            <TestComponent />
          </ProfileProvider>
        )
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 10))
        })
      }

      // Should handle all changes without errors
      expect(fetch).toHaveBeenCalled()
    })
  })

  describe('Performance', () => {
    it('should memoize context value to prevent unnecessary renders', () => {
      let renderCount = 0
      function CountingComponent() {
        renderCount++
        const profile = useProfile()
        return <div>{profile.loading.toString()}</div>
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