"use client"

import { motion } from "framer-motion"
import React from 'react'

interface Props {
  className?: string
}

const SpiralTextAnimation: React.FC<Props> = ({ className = '' }) => {
  // Animation settings for revealing each letter
  const letterVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.08, // Staggered delay for each letter
        duration: 0.4,
        ease: "easeOut"
      }
    })
  }
  
  // The text to be revealed
  const text = "Strengthen Your Relationships"
  const letters = text.split('')

  return (
    <div className={`relative overflow-visible ${className}`}>
      {/* Hidden text for SEO */}
      <span className="sr-only">Strengthen Your Relationships</span>
      
      {/* Text that appears letter by letter */}
      <div className="text-2xl sm:text-4xl md:text-6xl font-bold flex justify-center overflow-visible">
        <div className="flex flex-wrap justify-center px-2 text-center overflow-visible py-2 min-h-[5rem]">
          {letters.map((letter, index) => (
            <motion.span
              key={`letter-${index}`}
              variants={letterVariants}
              initial="hidden"
              animate="visible"
              custom={index}
              className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-blue-600 overflow-visible"
            >
              {letter === ' ' ? <span>&nbsp;</span> : letter}
            </motion.span>
          ))}
        </div>
      </div>
    </div>
  )
}

export default SpiralTextAnimation