'use client'

import { useState, useEffect } from "react"
import TherapyButton from "@/components/TherapyButton"
import { motion, AnimatePresence } from 'framer-motion'

export default function TherapyPageClient({ userId }) {
  const [isSessionActive, setIsSessionActive] = useState(false)
  
  // Track session state for styling purposes
  useEffect(() => {
    const checkActive = () => {
      const hasActiveClass = document.body.classList.contains('session-active')
      setIsSessionActive(hasActiveClass)
    }
    
    // Initial check
    checkActive()
    
    // Watch for class changes on body
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.attributeName === 'class') {
          checkActive()
        }
      })
    })
    
    observer.observe(document.body, { attributes: true })
    
    return () => observer.disconnect()
  }, [])

  return (
    <div className={`relative min-h-screen transition-all duration-700 ease-in-out ${isSessionActive ? 'bg-gradient-to-br from-slate-900 to-indigo-950' : 'bg-white'}`}>
      {/* Ambient background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <AnimatePresence>
          {isSessionActive && (
            <>
              {/* Animated ambient shapes */}
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ 
                    opacity: [0.1, 0.2, 0.1],
                    scale: [1, 1.5, 1],
                    x: [0, i % 2 ? 100 : -100, 0],
                    y: [0, i % 3 ? -100 : 100, 0],
                  }}
                  transition={{ 
                    duration: 15 + i * 5, 
                    repeat: Infinity,
                    repeatType: "reverse"
                  }}
                  className="absolute rounded-full blur-3xl bg-indigo-600/10"
                  style={{
                    top: `${20 + i * 15}%`,
                    left: `${10 + i * 20}%`,
                    width: `${200 + i * 50}px`,
                    height: `${200 + i * 50}px`,
                  }}
                />
              ))}
            </>
          )}
        </AnimatePresence>
      </div>

      <div className="container mx-auto p-4 relative z-10">
        {/* Session header with enhanced styling */}
        <motion.h1 
          className={`text-2xl font-bold mb-6 transition-colors duration-500 ${isSessionActive ? 'text-indigo-400' : 'text-slate-800'}`}
          animate={{ 
            color: isSessionActive ? '#8B5CF6' : ''
          }}
          transition={{ duration: 0.7 }}
        >
          {isSessionActive ? 'Therapy Session In Progress' : 'Therapy Session'}
        </motion.h1>
        
        <div className={`bg-white rounded-lg shadow-md p-6 transition-all duration-500 ${isSessionActive ? 'bg-opacity-10 backdrop-blur-md border border-indigo-500/20' : ''}`}>
          <h2 className={`text-xl font-semibold mb-4 transition-colors duration-500 ${isSessionActive ? 'text-indigo-300' : ''}`}>
            AI Therapist
          </h2>
          <p className={`mb-6 transition-colors duration-500 ${isSessionActive ? 'text-indigo-200' : 'text-gray-600'}`}>
            {isSessionActive 
              ? 'Speak freely. Your voice is being analyzed and processed.' 
              : 'Connect with our AI therapist for relationship support.'}
          </p>
          
          <TherapyButton userId={userId} />
        </div>
      </div>
    </div>
  )
}