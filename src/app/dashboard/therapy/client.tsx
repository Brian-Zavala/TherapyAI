'use client'

import { useState, useEffect, useRef } from "react"
import TherapyButton from "@/components/TherapyButton"
import { motion, AnimatePresence } from 'framer-motion'

export default function TherapyPageClient({ userId }) {
  const [isSessionActive, setIsSessionActive] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const animationRef = useRef(null)
  
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
    
    // Update time every minute
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)
    
    return () => {
      observer.disconnect()
      clearInterval(timer)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  // Format time
  const formattedTime = currentTime.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  })
  
  // Format date
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  }).format(currentTime)

  const inactiveFeatures = [
    {
      title: "Voice Interaction",
      description: "Natural conversation with our AI therapist using your voice",
      icon: (
        <svg className="h-6 w-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      )
    },
    {
      title: "Session Transcripts",
      description: "Review conversation history after your therapy session",
      icon: (
        <svg className="h-6 w-6 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      title: "Private Environment",
      description: "Secure and confidential therapy experience",
      icon: (
        <svg className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      )
    }
  ]
  
  const sessionTips = [
    {
      tip: "Speak naturally as if talking to a real therapist",
      icon: "🎙️",
      color: "bg-gradient-to-br from-violet-500/20 to-purple-500/20 border-purple-400/30"
    },
    {
      tip: "Take a moment to breathe if emotions feel overwhelming",
      icon: "🧘",
      color: "bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-400/30"
    },
    {
      tip: "End your session by clicking the button or saying 'end session'",
      icon: "👋",
      color: "bg-gradient-to-br from-pink-500/20 to-rose-500/20 border-pink-400/30"
    }
  ]

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`min-h-screen transition-all duration-700 ease-in-out ${
        isSessionActive 
          ? 'bg-gradient-to-b from-slate-950 via-indigo-950 to-purple-950' 
          : 'bg-gradient-to-b from-slate-50 via-indigo-50/50 to-purple-50/50'
      }`}
    >
      {/* Ambient background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute inset-0 ${isSessionActive ? 'opacity-50' : 'opacity-10'} mix-blend-soft-light transition-opacity duration-700`}>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2IiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDEwMCAwIEwgMCAwIDAgMTAwIiBmaWxsPSJub25lIiBzdHJva2U9ImJsYWNrIiBzdHJva2Utd2lkdGg9IjAuNSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIgLz48L3N2Zz4=')]"></div>
        </div>
        
        <AnimatePresence>
          {isSessionActive && (
            <>
              {/* Animated ambient orbs */}
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ 
                    opacity: [0.1, 0.3, 0.1],
                    scale: [1, 1.5, 1],
                    x: [0, i % 2 ? 100 : -100, 0],
                    y: [0, i % 3 ? -100 : 100, 0],
                  }}
                  exit={{ opacity: 0, scale: 0 }}
                  transition={{ 
                    duration: 20 + i * 5, 
                    repeat: Infinity,
                    repeatType: "mirror"
                  }}
                  className={`absolute rounded-full blur-3xl ${
                    i % 3 === 0 ? 'bg-purple-600/10' : 
                    i % 3 === 1 ? 'bg-indigo-600/10' : 'bg-blue-600/10'
                  }`}
                  style={{
                    top: `${10 + i * 10}%`,
                    left: `${5 + i * 12}%`,
                    width: `${150 + i * 40}px`,
                    height: `${150 + i * 40}px`,
                  }}
                />
              ))}
              
              {/* Subtle pulsing glow */}
              <motion.div 
                className="absolute inset-0 bg-gradient-radial from-indigo-500/5 to-transparent"
                animate={{ 
                  opacity: [0.4, 0.6, 0.4] 
                }}
                transition={{ 
                  duration: 8, 
                  repeat: Infinity,
                  repeatType: "mirror"
                }}
              />
            </>
          )}
        </AnimatePresence>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16 relative z-10">
        {/* Date/Time and Session Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-4 md:mb-0"
          >
            <h1 className={`text-3xl md:text-4xl font-bold transition-colors duration-500 ${isSessionActive ? 'text-white' : 'text-indigo-800'}`}>
              {isSessionActive ? 'Therapy Session' : 'Start a Session'}
            </h1>
            <p className={`text-sm mt-1 transition-colors duration-500 ${isSessionActive ? 'text-indigo-300' : 'text-indigo-600'}`}>
              {formattedDate}
            </p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className={`flex items-center transition-colors duration-500 ${
              isSessionActive ? 'text-indigo-200' : 'text-indigo-700'
            }`}
          >
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-lg font-medium">{formattedTime}</span>
          </motion.div>
        </div>
        
        {/* Main content area */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Main session card - spans 2 columns when session is inactive */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={`${isSessionActive ? 'md:col-span-3' : 'md:col-span-2'} relative overflow-hidden rounded-2xl shadow-xl transition-all duration-700 ${
              isSessionActive 
                ? 'bg-gradient-to-br from-slate-900/80 to-indigo-900/80 backdrop-blur-lg border border-indigo-500/30 p-6' 
                : 'bg-white p-8'
            }`}
          >
            {/* Absolute positioned decorations */}
            <div className="absolute top-0 right-0 h-24 w-24 opacity-10">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`w-full h-full transition-colors duration-500 ${isSessionActive ? 'text-indigo-300' : 'text-indigo-500'}`}>
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 13.5997 2.37562 15.1116 3.04346 16.4525C3.22094 16.8088 3.28001 17.2161 3.17712 17.6006L2.58151 19.8267C2.32295 20.793 3.20701 21.677 4.17335 21.4185L6.39939 20.8229C6.78393 20.72 7.19121 20.7791 7.54753 20.9565C8.88837 21.6244 10.4003 22 12 22Z" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 10.5H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M8 14H13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            
            {/* Glass effect for active session */}
            {isSessionActive && (
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/0"></div>
            )}
            
            <div className="relative z-10">
              {/* Session header with status indicator */}
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-10 h-10 flex items-center justify-center rounded-full mr-4 transition-colors duration-500 ${
                    isSessionActive 
                      ? 'bg-gradient-to-br from-purple-500 to-indigo-600' 
                      : 'bg-gradient-to-br from-indigo-100 to-purple-100'
                  }`}>
                    <svg 
                      className={`h-5 w-5 transition-colors duration-500 ${isSessionActive ? 'text-white' : 'text-indigo-600'}`} 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className={`text-xl font-bold transition-colors duration-500 ${isSessionActive ? 'text-white' : 'text-indigo-800'}`}>
                      Dr. Maya Thompson
                    </h2>
                    <p className={`text-sm transition-colors duration-500 ${isSessionActive ? 'text-indigo-300' : 'text-indigo-600'}`}>
                      AI Relationship Therapist
                    </p>
                  </div>
                </div>
                
                {isSessionActive && (
                  <div className="flex items-center">
                    <div className="h-2.5 w-2.5 bg-green-400 rounded-full animate-pulse mr-2"></div>
                    <span className="text-indigo-200 text-sm font-medium">Live Session</span>
                  </div>
                )}
              </div>
              
              {/* Session content */}
              <div className={`transition-colors duration-500 ${isSessionActive ? 'text-white' : 'text-gray-700'}`}>
                {isSessionActive ? (
                  <div className={`p-5 rounded-xl mb-8 bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 backdrop-blur-md`}>
                    <div className="flex items-start">
                      <svg className="w-6 h-6 text-indigo-300 mr-3 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-indigo-100">
                        Your session is now active. Speak naturally and I'll respond to help with your relationship concerns. Everything you share is completely private and secure.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 mb-8">
                    <p>
                      Welcome to your confidential therapy space. I'm Dr. Maya Thompson, your AI relationship therapist, here to support your journey toward a healthier relationship.
                    </p>
                    <p className="text-indigo-600 font-medium">
                      Click the button below to start a session whenever you're ready to talk.
                    </p>
                  </div>
                )}
                
                {/* Therapy button with responsive styling */}
                <div className={`${isSessionActive ? 'flex justify-center mt-8' : 'mt-10'}`}>
                  <TherapyButton userId={userId} />
                </div>
              </div>
            </div>
            
            {/* Decorative element */}
            <div className={`absolute bottom-0 right-0 w-24 h-24 rounded-tl-3xl transition-colors duration-500 ${
              isSessionActive 
                ? 'bg-gradient-to-br from-indigo-600/10 to-purple-600/10' 
                : 'bg-gradient-to-br from-indigo-50 to-purple-50'
            }`}></div>
          </motion.div>
          
          {/* Feature cards - only shown when session is not active */}
          {!isSessionActive && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="md:col-span-1 space-y-6"
            >
              {inactiveFeatures.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  whileHover={{ y: -4, boxShadow: '0 12px 24px -8px rgba(99, 102, 241, 0.15)' }}
                  className="bg-white rounded-xl shadow-md p-5 border border-indigo-50 transition-all duration-300"
                >
                  <div className="flex mb-3">
                    <div className="h-10 w-10 flex-shrink-0 rounded-full bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
                      {feature.icon}
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-indigo-800 mb-2">{feature.title}</h3>
                  <p className="text-gray-600 text-sm">{feature.description}</p>
                </motion.div>
              ))}
            </motion.div>
          )}
          
          {/* Active session tips - only visible when in session */}
          {isSessionActive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6"
            >
              {sessionTips.map((tip, i) => (
                <motion.div 
                  key={i} 
                  whileHover={{ y: -4 }}
                  className={`${tip.color} backdrop-blur-md border rounded-xl p-5 flex flex-col items-center text-center`}
                >
                  <div className="text-3xl mb-3">{tip.icon}</div>
                  <p className="text-white text-sm font-medium">{tip.tip}</p>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
        
        {/* Optional: Ambient footer when session is active */}
        {isSessionActive && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="mt-12 text-center"
          >
            <p className="text-indigo-300 text-sm">
              Creating a safe space for honest conversation and growth
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}