'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/hooks/useClerkSession'
import IntroWelcomeScreen from '@/components/IntroWelcomeScreen'
import { motion } from 'framer-motion'
import { enhancedScrollToTop } from '@/lib/scroll-utils'

export default function IntroPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(true)
  const [hasSeenIntro, setHasSeenIntro] = useState(false)
  const [hasChecked, setHasChecked] = useState(false)

  useEffect(() => {
    async function checkIntroStatus() {
      // Wait for session to be loaded before proceeding
      if (status === 'loading') {
        return
      }
      
      // Mark that we've performed the check
      setHasChecked(true)
      
      if (status === 'unauthenticated' || !session?.user) {
        router.push('/auth/login')
        return
      }

      try {
        // Check if user has already seen intro
        const response = await fetch('/api/user/profile')
        if (response.ok) {
          const data = await response.json()
          // Only redirect if explicitly true, not undefined or null
          if (data.hasSeenIntro === true) {
            setHasSeenIntro(true)
            router.push('/welcome')
            return
          }
        }
        // If profile fetch fails or hasSeenIntro is false/undefined, show intro
        setLoading(false)
      } catch (error) {
        console.error('Error checking intro status:', error)
        // On error, assume they haven't seen intro and show it
        setLoading(false)
      }
    }

    // Only run if we haven't checked yet
    if (!hasChecked) {
      checkIntroStatus()
    }
  }, [session, status, router, hasChecked])

  // Scroll to top when component mounts (user navigated to this page)
  useEffect(() => {
    enhancedScrollToTop('IntroPage-Mount');
  }, []);

  // Fallback timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading && status !== 'loading') {
        console.warn('Intro page loading timeout - forcing load completion')
        setLoading(false)
      }
    }, 3000) // 3 second timeout

    return () => clearTimeout(timeout)
  }, [loading, status])

  if (status === 'loading' || loading) {
    return (
      <div className="fixed inset-0 bg-gray-900 z-50">
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="text-center w-full max-w-sm">
          <motion.div
            className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 rounded-full relative overflow-hidden"
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.8, 1, 0.8],
              background: [
                'linear-gradient(135deg, #9333ea 0%, #ec4899 100%)', // purple-pink
                'linear-gradient(135deg, #8b5cf6 0%, #f472b6 100%)', // purple-500 to pink-500
                'linear-gradient(135deg, #2563eb 0%, #0891b2 100%)', // blue-cyan
                'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)', // blue-500 to cyan-500
                'linear-gradient(135deg, #16a34a 0%, #0d9488 100%)', // green-teal
                'linear-gradient(135deg, #22c55e 0%, #14b8a6 100%)', // green-500 to teal-500
                'linear-gradient(135deg, #9333ea 0%, #ec4899 100%)'  // back to start
              ]
            }}
            transition={{
              scale: {
                duration: 2,
                repeat: Infinity,
                ease: [0.4, 0.0, 0.2, 1]
              },
              opacity: {
                duration: 2,
                repeat: Infinity,
                ease: [0.4, 0.0, 0.2, 1]
              },
              background: {
                duration: 8,
                repeat: Infinity,
                ease: [0.4, 0.0, 0.2, 1]
              }
            }}
          >
            {/* Inner spinning element for extra visual interest */}
            <motion.div
              className="absolute inset-2 rounded-full bg-gradient-to-r from-white/20 to-white/5"
              animate={{
                rotate: [0, 360]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "linear"
              }}
            />
          </motion.div>
          <motion.p 
            className="text-white/80 text-base sm:text-lg font-medium"
            animate={{
              opacity: [0.6, 1, 0.6]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: [0.4, 0.0, 0.2, 1]
            }}
          >
            Loading your introduction...
          </motion.p>
          </div>
        </div>
      </div>
    )
  }

  if (hasSeenIntro) {
    return null // Will redirect
  }

  return (
    <div className="intro-page">
      <IntroWelcomeScreen />
    </div>
  )
}