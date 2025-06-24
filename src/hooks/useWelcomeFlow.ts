'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useProfile } from '@/providers/ProfileProvider'

export function useWelcomeFlow() {
  const router = useRouter()
  const { status, data: session } = useSession()
  const { profile, isLoading, updateProfile } = useProfile()

  // Check onboarding status on mount
  useEffect(() => {
    if (status === 'authenticated' && !isLoading && profile) {
      // Check if user hasn't seen intro yet
      if (!profile.hasSeenIntro) {
        router.replace('/intro')
        return
      }

      // Check if onboarding is completed
      if (profile.onboardingCompleted || profile.onboardingData) {
        router.replace('/')
      }
    }
  }, [status, isLoading, profile, router])

  // Handle onboarding submission
  const submitOnboarding = async (formData: any) => {
    try {
      await updateProfile(formData)
      
      // Mark onboarding as completed in localStorage as backup
      if (session?.user?.email) {
        const localOnboardingKey = `onboarding_completed_${session.user.email}`
        localStorage.setItem(localOnboardingKey, 'true')
        localStorage.setItem(
          `onboarding_data_${session.user.email}`,
          JSON.stringify(formData)
        )
      }
      
      return { success: true }
    } catch (error) {
      console.error('Error saving onboarding:', error)
      
      // Still mark as completed locally to prevent blocking
      if (session?.user?.email) {
        const localOnboardingKey = `onboarding_completed_${session.user.email}`
        localStorage.setItem(localOnboardingKey, 'true')
      }
      
      return { success: true, error: 'Saved locally' }
    }
  }

  return {
    isLoading: status === 'loading' || isLoading,
    isAuthenticated: status === 'authenticated',
    shouldShowOnboarding: !profile?.onboardingCompleted && profile?.hasSeenIntro,
    submitOnboarding
  }
}