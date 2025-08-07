'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useProfile } from '@/providers/ProfileProvider'

export default function IntroClientWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { status } = useSession()
  const { profile, isLoading } = useProfile()

  useEffect(() => {
    // Redirect to auth if not authenticated
    if (status === 'unauthenticated') {
      router.push('/auth/login?callbackUrl=/intro')
      return
    }

    // Check if user has already seen intro
    if (!isLoading && profile?.hasSeenIntro === true) {
      router.push('/welcome')
    }
  }, [status, profile, isLoading, router])

  // Show loading state while checking
  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  // Don't render if redirecting
  if (status === 'unauthenticated' || profile?.hasSeenIntro === true) {
    return null
  }

  return <>{children}</>
}