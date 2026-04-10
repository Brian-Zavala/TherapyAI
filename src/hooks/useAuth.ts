'use client'

import { useClerk } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useSession } from '@/hooks/useClerkSession'

export function useAuth() {
  const { data: session, status } = useSession()
  const { signOut } = useClerk()
  const router = useRouter()

  const isAuthenticated = status === 'authenticated'
  const isLoading = status === 'loading'

  const logout = async () => {
    try {
      sessionStorage.removeItem('db_user_id')
      await signOut({ redirectUrl: '/sign-in' })
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Logout failed:', error)
      }
      router.push('/sign-in')
    }
  }

  return {
    user: session?.user,
    isAuthenticated,
    isLoading,
    logout
  }
}
