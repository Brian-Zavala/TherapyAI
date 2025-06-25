'use client'

import React, { createContext, useContext, ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'

interface UserProfile {
  id: string
  email: string
  name: string
  pronouns?: string
  age?: number | null
  partnerName?: string
  partnerAge?: number | null
  relationshipStatus?: string
  therapyType?: string
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
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined)

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession()
  const queryClient = useQueryClient()

  const profileQuery = useQuery<UserProfile>({
    queryKey: ['user', 'profile'],
    queryFn: async () => {
      const res = await fetch('/api/user/profile', {
        headers: {
          'Content-Type': 'application/json',
        },
        // Add cache headers for browser caching
        cache: 'force-cache',
        next: { revalidate: 60 } // Revalidate every 60 seconds
      })
      
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Unauthorized')
        }
        throw new Error('Failed to fetch profile')
      }
      
      return res.json()
    },
    enabled: status === 'authenticated' && !!session?.user?.email,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    retry: (failureCount, error) => {
      // Don't retry on 401 errors
      if (error instanceof Error && error.message === 'Unauthorized') {
        return false
      }
      return failureCount < 3
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })

  const updateProfile = async (data: Partial<UserProfile>) => {
    const res = await fetch('/api/user/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    
    if (!res.ok) {
      throw new Error('Failed to update profile')
    }
    
    const updatedProfile = await res.json()
    
    // Update the cache immediately
    queryClient.setQueryData(['user', 'profile'], updatedProfile.user)
    
    // Invalidate to ensure consistency
    queryClient.invalidateQueries({ queryKey: ['user', 'profile'] })
  }

  const value: ProfileContextType = {
    profile: profileQuery.data ?? null,
    isLoading: profileQuery.isLoading,
    error: profileQuery.error as Error | null,
    refetch: profileQuery.refetch,
    updateProfile,
    isAuthenticated: status === 'authenticated'
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

// Export a hook for components that need to check if profile is ready
export function useProfileReady() {
  const { profile, isLoading, isAuthenticated } = useProfile()
  return {
    isReady: isAuthenticated && !isLoading && !!profile,
    isLoading,
    isAuthenticated,
    hasProfile: !!profile
  }
}