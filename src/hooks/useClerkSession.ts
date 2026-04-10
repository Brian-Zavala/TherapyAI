'use client'

import { useUser } from '@clerk/nextjs'
import { useState, useEffect, useMemo } from 'react'

/**
 * Drop-in replacement for NextAuth's useSession().
 * Returns { data: session, status } matching the old NextAuth pattern.
 *
 * IMPORTANT: The user.id returned here is the DATABASE user ID (not the Clerk user ID).
 * This is achieved by calling /api/auth/me on mount which resolves the Clerk user
 * to the database user via getAuthSession().
 */
export function useSession() {
  const { user: clerkUser, isLoaded, isSignedIn } = useUser()
  const [dbUserId, setDbUserId] = useState<string | null>(null)
  const [isResolving, setIsResolving] = useState(false)

  // Resolve the database user ID from the Clerk user
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !clerkUser) {
      setDbUserId(null)
      return
    }

    // Check sessionStorage cache first
    const cached = sessionStorage.getItem('db_user_id')
    if (cached) {
      setDbUserId(cached)
      return
    }

    setIsResolving(true)
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.user?.id) {
          setDbUserId(data.user.id)
          sessionStorage.setItem('db_user_id', data.user.id)
        }
      })
      .catch(() => {})
      .finally(() => setIsResolving(false))
  }, [isLoaded, isSignedIn, clerkUser?.id])

  // Always call useMemo — never after early returns
  const session = useMemo(() => {
    if (!isSignedIn || !clerkUser || !dbUserId) return null
    return {
      user: {
        id: dbUserId,
        name: clerkUser.fullName,
        email: clerkUser.primaryEmailAddress?.emailAddress,
        image: clerkUser.imageUrl,
      },
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }
  }, [isSignedIn, clerkUser?.fullName, clerkUser?.primaryEmailAddress?.emailAddress, clerkUser?.imageUrl, dbUserId])

  if (!isLoaded || isResolving) {
    return {
      data: null,
      status: 'loading' as const,
      update: async () => null,
    }
  }

  if (!session) {
    return {
      data: null,
      status: !isSignedIn ? 'unauthenticated' as const : 'loading' as const,
      update: async () => null,
    }
  }

  return {
    data: session,
    status: 'authenticated' as const,
    update: async () => null,
  }
}
