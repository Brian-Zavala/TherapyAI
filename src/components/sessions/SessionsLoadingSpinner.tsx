'use client'

import React from 'react'
import { motion } from 'framer-motion'

export default function SessionsLoadingSpinner() {
  return (
    <div className="fixed inset-0 w-full h-full flex items-center justify-center overflow-hidden">
      {/* Animated gradient background */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/30 to-indigo-900/20"
        animate={{
          background: [
            'linear-gradient(to bottom right, rgba(88, 28, 135, 0.2), rgba(29, 78, 216, 0.3), rgba(67, 56, 202, 0.2))',
            'linear-gradient(to bottom right, rgba(29, 78, 216, 0.3), rgba(67, 56, 202, 0.2), rgba(88, 28, 135, 0.2))',
            'linear-gradient(to bottom right, rgba(67, 56, 202, 0.2), rgba(88, 28, 135, 0.2), rgba(29, 78, 216, 0.3))',
            'linear-gradient(to bottom right, rgba(88, 28, 135, 0.2), rgba(29, 78, 216, 0.3), rgba(67, 56, 202, 0.2))',
          ]
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'linear'
        }}
      />

      {/* Floating particles effect */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 sm:w-1.5 sm:h-1.5 bg-white/30 rounded-full"
            style={{
              left: `${20 + i * 15}%`,
              top: '50%',
            }}
            animate={{
              y: [-200, 200],
              x: [0, i % 2 === 0 ? 50 : -50, 0],
              opacity: [0, 1, 1, 0],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              delay: i * 1.2,
              ease: 'easeInOut'
            }}
          />
        ))}
      </div>

      {/* Main loading animation container */}
      <div className="relative z-10 flex flex-col items-center justify-center p-6 sm:p-8">
        
        {/* Chat bubble animation */}
        <div className="relative w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 lg:w-56 lg:h-56">
          
          {/* Glowing orb background */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full blur-xl opacity-30"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.3, 0.5, 0.3]
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          />

          {/* Chat bubbles */}
          <div className="absolute inset-0 flex items-center justify-center">
            {/* User message bubble */}
            <motion.div
              className="absolute right-0 top-4 w-16 h-10 sm:w-20 sm:h-12 md:w-24 md:h-14 bg-white/25 backdrop-blur-md rounded-lg rounded-br-none border border-white/40 shadow-xl"
              initial={{ opacity: 0, x: 20 }}
              animate={{
                opacity: [0, 1, 1, 0],
                x: [20, 0, 0, -20],
                scale: [0.8, 1, 1, 0.8]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                times: [0, 0.3, 0.7, 1]
              }}
            >
              {/* Typing dots */}
              <div className="flex items-center justify-center h-full gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white/60 rounded-full"
                    animate={{
                      y: [0, -4, 0],
                      opacity: [0.6, 1, 0.6]
                    }}
                    transition={{
                      duration: 0.6,
                      repeat: Infinity,
                      delay: i * 0.1
                    }}
                  />
                ))}
              </div>
            </motion.div>

            {/* AI response bubble */}
            <motion.div
              className="absolute left-0 bottom-4 w-16 h-10 sm:w-20 sm:h-12 md:w-24 md:h-14 bg-white/15 backdrop-blur-md rounded-lg rounded-bl-none border border-white/20 shadow-xl"
              initial={{ opacity: 0, x: -20 }}
              animate={{
                opacity: [0, 1, 1, 0],
                x: [-20, 0, 0, 20],
                scale: [0.8, 1, 1, 0.8]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                times: [0, 0.3, 0.7, 1],
                delay: 1.5
              }}
            >
              {/* Voice wave animation */}
              <div className="flex items-center justify-center h-full gap-0.5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <motion.div
                    key={i}
                    className="w-0.5 bg-white/50 rounded-full"
                    animate={{
                      height: ['8px', '20px', '8px'],
                    }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      delay: i * 0.1,
                      ease: 'easeInOut'
                    }}
                  />
                ))}
              </div>
            </motion.div>

            {/* Center microphone icon */}
            <motion.div
              className="relative z-20"
              animate={{
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-white/20 backdrop-blur-lg rounded-full flex items-center justify-center border-2 border-white/40 shadow-2xl">
                <svg
                  className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
              </div>

              {/* Pulsing rings */}
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-white/30"
                animate={{
                  scale: [1, 1.5, 2],
                  opacity: [0.5, 0.2, 0]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeOut'
                }}
              />
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-white/30"
                animate={{
                  scale: [1, 1.5, 2],
                  opacity: [0.5, 0.2, 0]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeOut',
                  delay: 0.5
                }}
              />
            </motion.div>
          </div>

          {/* Rotating transcript lines */}
          <motion.div
            className="absolute inset-0"
            animate={{ rotate: 360 }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: 'linear'
            }}
          >
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
              <motion.div
                key={angle}
                className="absolute top-1/2 left-1/2 w-full h-0.5"
                style={{
                  transform: `translate(-50%, -50%) rotate(${angle}deg)`,
                  transformOrigin: 'center',
                }}
              >
                <motion.div
                  className="h-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  animate={{
                    scaleX: [0, 1, 0],
                    opacity: [0, 0.5, 0]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    delay: angle / 180,
                    ease: 'easeInOut'
                  }}
                />
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Loading text */}
        <motion.div
          className="mt-8 flex flex-col items-center justify-center w-full"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-white mb-2 text-center">
            Loading Session Transcripts
          </h2>
          <div className="flex items-center justify-center gap-1">
            <p className="text-xs sm:text-sm md:text-base text-white/80 text-center">
              Preparing your conversation history
            </p>
            <motion.span
              className="text-xs sm:text-sm md:text-base text-white/80"
              animate={{ opacity: [0, 1, 0] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            >
              ...
            </motion.span>
          </div>

          {/* Progress indicator */}
          <div className="mt-4 flex items-center justify-center w-full">
            <div className="w-48 sm:w-56 md:w-64 lg:w-72 h-1 bg-white/10 rounded-full overflow-hidden mx-auto">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400"
                animate={{
                  x: ['-100%', '200%']
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
                style={{
                  width: '50%'
                }}
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Performance-optimized shimmer overlay */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(105deg, transparent 40%, rgba(255, 255, 255, 0.05) 50%, transparent 60%)',
          animation: 'shimmer 3s infinite',
        }}
      />

      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%) translateZ(0);
          }
          100% {
            transform: translateX(100%) translateZ(0);
          }
        }
      `}</style>
    </div>
  )
}