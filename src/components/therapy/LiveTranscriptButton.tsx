'use client'

import React from 'react'
import { motion } from 'framer-motion'

interface LiveTranscriptButtonProps {
  onClick: () => void
  hasNewMessages?: boolean
  className?: string
}

export default function LiveTranscriptButton({ 
  onClick, 
  hasNewMessages = false,
  className = '' 
}: LiveTranscriptButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      className={`
        relative inline-flex items-center space-x-2 px-4 py-2.5 
        bg-black/80 backdrop-blur-md rounded-full 
        border border-white/20 shadow-lg
        hover:bg-black/90 hover:border-white/30
        transition-all duration-300 group
        ${className}
      `}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", damping: 20, stiffness: 300 }}
    >
      {/* Blinking Green Dot */}
      <div className="relative">
        <motion.div
          className="w-2.5 h-2.5 bg-green-500 rounded-full shadow-lg"
          animate={{ 
            scale: [1, 1.3, 1],
            opacity: [1, 0.6, 1],
            boxShadow: [
              "0 0 0 0 rgba(34, 197, 94, 0)",
              "0 0 0 6px rgba(34, 197, 94, 0.3)",
              "0 0 0 0 rgba(34, 197, 94, 0)"
            ]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        {/* Inner bright spot */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-1 h-1 bg-white rounded-full opacity-80"></div>
        </div>
      </div>
      
      {/* Live Text */}
      <span className="text-white font-medium text-sm select-none">
        Live
      </span>
      
      {/* Message Count Badge */}
      {hasNewMessages && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center"
        >
          <span className="text-white text-[10px] font-bold">•</span>
        </motion.div>
      )}
      
      {/* Hover Effect Glow */}
      <motion.div
        className="absolute inset-0 rounded-full bg-gradient-to-r from-green-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300"
        animate={{
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    </motion.button>
  )
}