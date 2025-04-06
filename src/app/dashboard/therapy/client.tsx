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

  const inactiveFeatures = [
    {
      title: "Voice Interaction",
      description: "Natural conversation with AI therapist via voice",
      icon: (
        <svg className="h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      )
    },
    {
      title: "Session Recording",
      description: "Transcripts available for review after completion",
      icon: (
        <svg className="h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      title: "Secure Communication",
      description: "Private and confidential session environment",
      icon: (
        <svg className="h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      )
    }
  ];

  return (
    <div className={`min-h-screen transition-all duration-700 ease-in-out ${isSessionActive ? 'bg-gradient-to-br from-slate-900 to-indigo-950' : 'bg-gradient-to-b from-white to-indigo-50'}`}>
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12 relative z-10">
        {/* Session header with enhanced styling */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <h1 className={`text-2xl md:text-3xl font-bold transition-colors duration-500 flex items-center ${isSessionActive ? 'text-indigo-400' : 'text-indigo-700'}`}>
            <svg className="h-6 w-6 mr-2 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
            </svg>
            {isSessionActive ? 'Session In Progress' : 'Start Therapy Session'}
          </h1>
          {!isSessionActive && (
            <p className="mt-2 text-gray-600 max-w-2xl">
              Begin a confidential therapy session with our AI assistant. Discuss relationship challenges, 
              receive guidance, and develop strategies for improved communication.
            </p>
          )}
        </motion.div>
        
        {/* Main content area */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {/* Main session card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={`bg-white rounded-xl shadow-md transition-all duration-500 ${
              isSessionActive 
                ? 'bg-opacity-10 backdrop-blur-md border border-indigo-500/30 p-4 sm:p-6 col-span-2' 
                : 'p-6 md:row-span-2 md:flex md:flex-col md:justify-between'
            }`}
          >
            <div>
              <h2 className={`text-xl font-semibold mb-4 flex items-center transition-colors duration-500 ${isSessionActive ? 'text-indigo-300' : 'text-indigo-800'}`}>
                <span className="text-indigo-400 mr-2">🧠</span>
                TherapyAI Assistant
              </h2>
              
              <div className={`mb-6 transition-colors duration-500 ${isSessionActive ? 'text-indigo-200' : 'text-gray-600'}`}>
                {isSessionActive ? (
                  <div className="flex items-center text-indigo-200 bg-indigo-900/30 p-3 rounded-lg border border-indigo-500/30 mb-4">
                    <div className="mr-3 flex-shrink-0">
                      <div className="h-3 w-3 bg-green-400 rounded-full animate-pulse"></div>
                    </div>
                    <p>Speak freely. Your voice is being analyzed and processed.</p>
                  </div>
                ) : (
                  <p className="text-gray-600">
                    Connect with our AI therapist for personalized relationship support and guidance.
                  </p>
                )}
              </div>
            </div>
            
            {/* Therapy button with responsive styling */}
            <div className={`${isSessionActive ? 'flex justify-center' : ''}`}>
              <TherapyButton userId={userId} />
            </div>
          </motion.div>
          
          {/* Feature cards that are only shown when session is not active */}
          {!isSessionActive && (
            <div className="space-y-4">
              {inactiveFeatures.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex"
                >
                  <div className="flex-shrink-0 mr-4">
                    <div className="h-12 w-12 bg-indigo-50 rounded-full flex items-center justify-center">
                      {feature.icon}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-800">{feature.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
          
          {/* Active session tips - only visible when in session */}
          {isSessionActive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="col-span-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4"
            >
              {['Speak clearly and at a normal pace', 'If you need a break, say "pause session"', 'End the session by saying "end session"'].map((tip, i) => (
                <div key={i} className="bg-indigo-900/20 backdrop-blur-sm border border-indigo-500/20 rounded-lg p-3 flex items-start">
                  <div className="text-indigo-400 mr-2 mt-0.5">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-xs sm:text-sm text-indigo-200">{tip}</p>
                </div>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}