'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import GlassCard from './ui/glass-card'
import { CheckCircleIcon } from '@heroicons/react/24/solid'

interface OnboardingSuccessSplashProps {
  userData: Record<string, any>
  onComplete: () => void
}

export default function OnboardingSuccessSplash({ userData, onComplete }: OnboardingSuccessSplashProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [progress, setProgress] = useState(0)
  
  // Define the steps in the personalization process
  const processingSteps = [
    'Analyzing your preferences...',
    'Creating your personalized therapy profile...',
    'Setting up your communication style...',
    'Configuring your therapy sessions...',
    'Finalizing your personalized experience...'
  ]

  // Extract user data for personalization messages
  const nickname = userData.nickname || 'your'
  const relationshipStatus = userData.relationshipStatus || 'personal'
  
  // Personalized messages to show
  const personalizedMessages = [
    `Tailoring the experience for ${nickname}...`,
    `Optimizing your sessions for your needs...`,
    `Building your ${relationshipStatus} growth path...`,
    'Almost there! Just a few more moments...'
  ]

  // Simulated progress 
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prevProgress => {
        const newProgress = prevProgress + 1
        
        // Change steps based on progress
        if (newProgress === 25) setCurrentStep(1)
        if (newProgress === 50) setCurrentStep(2)
        if (newProgress === 75) setCurrentStep(3)
        if (newProgress === 95) setCurrentStep(4)
        
        // Complete when progress reaches 100
        if (newProgress >= 100) {
          clearInterval(timer)
          
          // Wait a moment at 100% before completing
          setTimeout(() => {
            onComplete()
          }, 500)
          
          return 100
        }
        
        return newProgress
      })
    }, 50)
    
    return () => clearInterval(timer)
  }, [onComplete])
  
  // Show random personalized message that changes
  const [messageIndex, setMessageIndex] = useState(0)
  
  useEffect(() => {
    const messageTimer = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % personalizedMessages.length)
    }, 3000)
    
    return () => clearInterval(messageTimer)
  }, [personalizedMessages.length])

  // Generate random positions for particles (safely for SSR)
  const [particles, setParticles] = useState<Array<{
    id: number,
    initialX: number,
    initialY: number,
    targetX: number,
    targetY: number,
    scale: number,
    size: number,
    duration: number
  }>>([])
  
  // Initialize particles after component mounts to avoid hydration errors
  useEffect(() => {
    const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1000
    const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 800
    
    const newParticles = Array(20).fill(0).map((_, i) => ({
      id: i,
      initialX: Math.random() * windowWidth,
      initialY: Math.random() * windowHeight,
      targetX: Math.random() * windowWidth,
      targetY: Math.random() * windowHeight,
      scale: Math.random() * 0.5 + 0.5,
      size: Math.random() * 100 + 50,
      duration: Math.random() * 10 + 10
    }))
    
    setParticles(newParticles)
  }, [])
  
  return (
    <div className="h-screen overflow-hidden bg-gray-900 flex items-center justify-center p-4">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden">
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute rounded-full bg-blue-500/20"
            initial={{ 
              x: particle.initialX, 
              y: particle.initialY,
              scale: particle.scale
            }}
            animate={{ 
              x: particle.targetX, 
              y: particle.targetY 
            }}
            transition={{ 
              duration: particle.duration, 
              repeat: Infinity, 
              repeatType: "reverse" 
            }}
            style={{
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              filter: 'blur(8px)'
            }}
          />
        ))}
      </div>
      
      <GlassCard className="w-full max-w-lg text-center z-10">
        <div className="p-6">
          <motion.div 
            className="mx-auto w-24 h-24 mb-6 bg-blue-500/20 rounded-full flex items-center justify-center"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                opacity: [0.7, 1, 0.7] 
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                repeatType: "reverse"
              }}
            >
              <CheckCircleIcon className="w-16 h-16 text-blue-500" />
            </motion.div>
          </motion.div>
          
          <motion.h2 
            className="text-2xl font-bold text-white mb-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            Creating Your Experience
          </motion.h2>
          
          <motion.p 
            className="text-white/70 mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {personalizedMessages[messageIndex]}
          </motion.p>

          {/* Current processing step */}
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.3 }}
            className="mb-6 min-h-[24px]"
          >
            <span className="text-white text-sm">{processingSteps[currentStep]}</span>
          </motion.div>
          
          {/* Progress bar */}
          <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-6">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ type: "tween" }}
            />
          </div>
          
          {/* Progress percentage */}
          <motion.p 
            className="text-white/50 text-sm"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {progress}% complete
          </motion.p>
        </div>
      </GlassCard>
    </div>
  )
}