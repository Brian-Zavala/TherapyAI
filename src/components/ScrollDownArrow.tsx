'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface ScrollDownArrowProps {
  onClick?: () => void
}

export default function ScrollDownArrow({ onClick }: ScrollDownArrowProps) {
  const [isHovered, setIsHovered] = useState(false)
  
  return (
    <motion.div 
      className="cursor-pointer"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onClick}
      animate={{ 
        y: [0, 10, 0],
        opacity: [0.7, 1, 0.7]
      }}
      transition={{ 
        y: { 
          duration: 2.5, 
          repeat: Infinity, 
          ease: "easeInOut"
        },
        opacity: {
          duration: 2.5,
          repeat: Infinity,
          ease: "easeInOut"
        }
      }}
      whileHover={{ scale: 1.2 }}
      whileTap={{ scale: 0.9 }}
    >
      <AnimatePresence mode="wait">
        {isHovered ? (
          <motion.div
            key="text"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.3 }}
            className="text-blue-700 font-medium text-sm"
          >
            Scroll Down
          </motion.div>
        ) : (
          <motion.div
            key="arrow"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.3 }}
          >
            <svg className="w-8 h-8 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}