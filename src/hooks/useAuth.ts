'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export function useAuth() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const isAuthenticated = status === 'authenticated'
  const isLoading = status === 'loading'
  
  const logout = async () => {
    try {
      // Use absolute URL to ensure proper redirect on all environments (local, remote, production)
      await signOut({ 
        callbackUrl: `${window.location.origin}/auth/login`,
        redirect: true
      })
    } catch (error) {
      // Production-ready error handling
      if (process.env.NODE_ENV === 'development') {
        console.error('Logout failed:', error)
      }
      // Fallback: manually redirect if signOut fails
      router.push('/auth/login')
    }
  }
  
  return {
    user: session?.user,
    isAuthenticated,
    isLoading,
    logout
  }
}