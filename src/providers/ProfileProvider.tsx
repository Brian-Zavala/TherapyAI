'use client'

import React, { createContext, useContext, ReactNode, useRef, useCallback, useEffect } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface UserProfile {
  id: string
  email: string
  name: string
  pronouns?: string
  age?: number | null
  partnerName?: string
  partnerAge?: number | null
  relationshipStatus?: string
  currentConcerns?: any
  emergencyContact?: string
  sessionPreference?: string
  preferredDays?: any
  sessionFrequency?: string
  recurringSession?: string
  reminderTiming?: string
  communicationStyle?: string
  additionalNotes?: string
  phone?: string
  notificationPrefs?: string | string[]
  onboardingCompleted?: boolean
  onboardingData?: any
  hasSeenIntro?: boolean
  // Family members
  familyMember1?: string
  familyMember2?: string
  familyMember3?: string
  familyMember4?: string
  familyMember5?: string
  familyMember6?: string
  familyMember7?: string
  familyMember1Age?: number | null
  familyMember2Age?: number | null
  familyMember3Age?: number | null
  familyMember4Age?: number | null
  familyMember5Age?: number | null
  familyMember6Age?: number | null
  familyMember7Age?: number | null
  familyMember1Relation?: string
  familyMember2Relation?: string
  familyMember3Relation?: string
  familyMember4Relation?: string
  familyMember5Relation?: string
  familyMember6Relation?: string
  familyMember7Relation?: string
}

interface ProfileContextType {
  profile: UserProfile | null
  isLoading: boolean
  error: Error | null
  refetch: () => void
  updateProfile: (data: Partial<UserProfile>) => Promise<void>
  isAuthenticated: boolean
  isUpdating: boolean
  lastFetchTime: number | null
  isStale: boolean
  invalidateProfile: () => Promise<void>
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined)

// Request deduplication
const fetchPromises = new Map<string, Promise<UserProfile>>()

// Error retry configuration
const MAX_RETRIES = 3
const RETRY_DELAYS = [1000, 3000, 5000] // Exponential backoff

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession()
  const queryClient = useQueryClient()
  const router = useRouter()
  const retryCount = useRef(0)
  const lastSuccessfulFetch = useRef<number | null>(null)

  // Deduplicated fetch function
  const fetchProfile = useCallback(async (): Promise<UserProfile> => {
    const email = session?.user?.email
    if (!email) {
      throw new Error('No authenticated user')
    }

    // Check for existing promise
    const existingPromise = fetchPromises.get(email)
    if (existingPromise) {
      console.log('[ProfileProvider] Reusing existing fetch promise')
      return existingPromise
    }

    // Create new promise
    const promise = (async () => {
      try {
        // 2025 Standard: Only log in debug mode
        if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG_PROFILE === 'true') {
          console.log('[ProfileProvider] Fetching profile for:', email)
        }
        
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
        
        const res = await fetch('/api/user/profile', {
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
          cache: 'no-store', // Bypass Next.js cache since we use React Query
        })
        
        clearTimeout(timeoutId)
        
        if (!res.ok) {
          if (res.status === 401) {
            // Handle unauthorized - redirect to signin
            console.error('[ProfileProvider] Unauthorized, redirecting to signin')
            router.push('/auth/login')
            throw new Error('Unauthorized')
          }
          
          if (res.status === 404) {
            // User not found - might need to create profile
            console.warn('[ProfileProvider] User profile not found')
            throw new Error('Profile not found')
          }
          
          if (res.status >= 500) {
            // Server error - will trigger retry
            console.error('[ProfileProvider] Server error:', res.status)
            throw new Error(`Server error: ${res.status}`)
          }
          
          throw new Error(`Failed to fetch profile: ${res.status}`)
        }
        
        const data = await res.json()
        lastSuccessfulFetch.current = Date.now()
        retryCount.current = 0 // Reset retry count on success
        
        return data
      } catch (error) {
        // Handle fetch errors more gracefully
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            console.error('[ProfileProvider] Request timed out')
            throw new Error('Request timed out')
          }
          
          if (error.message.includes('fetch')) {
            console.error('[ProfileProvider] Network error:', error.message)
            throw new Error('Network error - please check your connection')
          }
        }
        
        console.error('[ProfileProvider] Fetch error:', error)
        throw error
      } finally {
        // Clean up promise from map
        fetchPromises.delete(email)
      }
    })()

    // Store promise for deduplication
    fetchPromises.set(email, promise)
    
    return promise
  }, [session?.user?.email, router])

  const profileQuery = useQuery<UserProfile>({
    queryKey: ['user', 'profile', session?.user?.email],
    queryFn: fetchProfile,
    enabled: status === 'authenticated' && !!session?.user?.email,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: (failureCount, error) => {
      // Don't retry on 401 or 404
      if (error instanceof Error) {
        if (error.message === 'Unauthorized' || error.message === 'Profile not found') {
          return false
        }
      }
      
      // Use our retry count and delays
      if (failureCount >= MAX_RETRIES) {
        console.error('[ProfileProvider] Max retries reached')
        return false
      }
      
      retryCount.current = failureCount
      return true
    },
    retryDelay: (attemptIndex) => {
      const delay = RETRY_DELAYS[attemptIndex] || 5000
      console.log(`[ProfileProvider] Retrying in ${delay}ms (attempt ${attemptIndex + 1})`)
      return delay
    },
  })

  // Handle query errors in useEffect (React Query v5 pattern)
  useEffect(() => {
    if (profileQuery.error) {
      console.error('[ProfileProvider] Query error:', profileQuery.error)
      
      // If we have cached data, don't show error to user
      const cached = queryClient.getQueryData(['user', 'profile', session?.user?.email])
      if (cached) {
        console.log('[ProfileProvider] Using cached data despite error')
      }
    }
  }, [profileQuery.error, session?.user?.email, queryClient])

  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<UserProfile>) => {
      console.log('[ProfileProvider] Updating profile:', data)
      
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(30000), // 30 second timeout
      })
      
      if (!res.ok) {
        let errorData: any = { error: 'Unknown error' }
        let errorText = ''
        
        try {
          // First try to get the response as text
          errorText = await res.text()
          // Then try to parse it as JSON
          errorData = JSON.parse(errorText)
        } catch (parseError) {
          // If parsing fails, use the text directly
          console.error('[ProfileProvider] Response parsing failed:', parseError)
          console.error('[ProfileProvider] Raw response:', errorText)
          errorData = { 
            error: errorText || `Server error: ${res.status} ${res.statusText}`,
            status: res.status 
          }
        }
        
        console.error('[ProfileProvider] Update failed with status:', res.status)
        console.error('[ProfileProvider] Error data:', errorData)
        
        // Extract error details for better debugging
        if (errorData.details) {
          console.error('[ProfileProvider] Validation details:', errorData.details)
        }
        
        throw new Error(errorData.error || `Failed to update profile (${res.status})`)
      }
      
      const response = await res.json()
      // API now returns the complete profile data directly
      return response
    },
    onMutate: async (newData) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: ['user', 'profile', session?.user?.email] 
      })
      
      // Snapshot the previous value
      const previousProfile = queryClient.getQueryData(['user', 'profile', session?.user?.email])
      
      // Optimistically update to the new value
      if (previousProfile) {
        queryClient.setQueryData(['user', 'profile', session?.user?.email], (old: UserProfile) => ({
          ...old,
          ...newData,
        }))
      }
      
      // Return a context object with the snapshotted value
      return { previousProfile }
    },
    onError: (err, newData, context) => {
      console.error('[ProfileProvider] Update error:', err)
      
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousProfile) {
        queryClient.setQueryData(
          ['user', 'profile', session?.user?.email], 
          context.previousProfile
        )
      }
    },
    onSuccess: (data) => {
      console.log('[ProfileProvider] Update successful')
      
      // Update the cache with server response
      queryClient.setQueryData(['user', 'profile', session?.user?.email], data)
      
      // Invalidate and refetch
      queryClient.invalidateQueries({ 
        queryKey: ['user', 'profile', session?.user?.email] 
      })
    },
  })

  const updateProfile = useCallback(async (data: Partial<UserProfile>) => {
    return updateProfileMutation.mutateAsync(data)
  }, [updateProfileMutation])

  const invalidateProfile = useCallback(async () => {
    console.log('[ProfileProvider] Manually invalidating profile cache')
    await queryClient.invalidateQueries({ 
      queryKey: ['user', 'profile', session?.user?.email] 
    })
  }, [queryClient, session?.user?.email])

  // Calculate if data is stale
  const isStale = profileQuery.isStale || 
    (lastSuccessfulFetch.current 
      ? Date.now() - lastSuccessfulFetch.current > 5 * 60 * 1000 
      : false)

  const value: ProfileContextType = {
    profile: profileQuery.data ?? null,
    isLoading: profileQuery.isLoading,
    error: profileQuery.error as Error | null,
    refetch: profileQuery.refetch,
    updateProfile,
    isAuthenticated: status === 'authenticated',
    isUpdating: updateProfileMutation.isPending,
    lastFetchTime: lastSuccessfulFetch.current,
    isStale,
    invalidateProfile,
  }

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  const context = useContext(ProfileContext)
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider')
  }
  return context
}

// Export hook for components that need to check if profile is ready
export function useProfileReady() {
  const { profile, isLoading, isAuthenticated, error } = useProfile()
  
  return {
    isReady: isAuthenticated && !isLoading && !!profile && !error,
    isLoading,
    isAuthenticated,
    hasProfile: !!profile,
    hasError: !!error,
    needsOnboarding: isAuthenticated && !isLoading && !profile && !error,
  }
}

// Hook for components that need profile data with loading/error states
export function useProfileWithStates() {
  const context = useProfile()
  
  if (context.isLoading) {
    return { state: 'loading' as const, profile: null }
  }
  
  if (context.error) {
    return { state: 'error' as const, profile: null, error: context.error }
  }
  
  if (!context.profile) {
    return { state: 'empty' as const, profile: null }
  }
  
  return { state: 'success' as const, profile: context.profile }
}