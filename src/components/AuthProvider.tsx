'use client'

import { SessionProvider } from "next-auth/react"
import { useEffect, useState } from "react"

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  // Add client-side only rendering to prevent hydration mismatch
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={false}>
      {mounted ? children : null}
    </SessionProvider>
  )
}