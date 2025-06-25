'use client'

import { SessionProvider } from "next-auth/react"
import { useEffect, useState } from "react"
import { getBaseUrl } from "@/lib/next-auth-config"

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  // Add client-side only rendering to prevent hydration mismatch
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  // 2025 Standard: Configure NextAuth with proper base URL
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : getBaseUrl()

  return (
    <SessionProvider 
      refetchInterval={0} 
      refetchOnWindowFocus={false}
      baseUrl={baseUrl}
    >
      {mounted ? children : null}
    </SessionProvider>
  )
}