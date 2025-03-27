'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export function useAuth() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const isAuthenticated = status === 'authenticated'
  const isLoading = status === 'loading'
  
  const logout = () => {
    signOut({ redirect: false }).then(() => {
      router.push('/auth/login')
      router.refresh()
    })
  }
  
  return {
    user: session?.user,
    isAuthenticated,
    isLoading,
    logout
  }
}