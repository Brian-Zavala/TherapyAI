'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import IntroWelcomeScreen from '@/components/IntroWelcomeScreen'
import { motion } from 'framer-motion'

export default function IntroPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(true)
  const [hasSeenIntro, setHasSeenIntro] = useState(false)

  useEffect(() => {
    async function checkIntroStatus() {
      if (status === 'loading') return
      
      if (status === 'unauthenticated' || !session?.user) {
        router.push('/auth/login')
        return
      }

      try {
        // Check if user has already seen intro
        const response = await fetch('/api/user/profile')
        if (response.ok) {
          const data = await response.json()
          if (data.hasSeenIntro) {
            setHasSeenIntro(true)
            router.push('/welcome')
            return
          }
        }
      } catch (error) {
        console.error('Error checking intro status:', error)
      } finally {
        setLoading(false)
      }
    }

    checkIntroStatus()
  }, [session, status, router])

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <motion.div
            className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.7, 1, 0.7],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <p className="text-white/70">Loading your introduction...</p>
        </div>
      </div>
    )
  }

  if (hasSeenIntro) {
    return null // Will redirect
  }

  return <IntroWelcomeScreen />
}