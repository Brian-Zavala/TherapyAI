'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export function useAuth() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const isAuthenticated = status === 'authenticated'
  const isLoading = status === 'loading'
  
  const logout = () => {
    // Use redirect: true to ensure proper redirect to login page after signout
    signOut({ 
      callbackUrl: '/auth/login',
      redirect: true
    })
  }
  
  return {
    user: session?.user,
    isAuthenticated,
    isLoading,
    logout
  }
}