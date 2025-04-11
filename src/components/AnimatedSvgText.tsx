"use client"

import React from 'react'
import { motion, Variants } from "framer-motion"

// Define letter paths for "Strengthen Your Relationships"
const letterPaths: Record<string, string> = {
  'S': "M 0,20 C 0,10 10,5 20,10 C 30,15, 20,25 10,30 C 0,35 10,45 25,40",
  't': "M 15,0 L 15,40 M 0,15 L 30,15",
  'r': "M 0,15 L 0,40 C 0,15 15,15 25,20",
  'e': "M 30,20 C 30,10 20,5 15,5 C 5,5 0,15 5,25 C 10,35 20,35 30,25 M 5,20 L 25,20",
  'n': "M 0,15 L 0,40 M 0,15 C 0,15 10,10 20,15 L 20,40",
  'g': "M 25,15 L 25,45 C 25,55 15,55 5,45 M 25,15 C 25,5 15,5 5,15 C 0,25 5,35 25,30",
  'h': "M 0,0 L 0,40 M 0,15 C 5,10 15,10 20,15 L 20,40",
  'Y': "M 0,0 L 15,20 L 30,0 M 15,20 L 15,40",
  'o': "M 15,15 C 25,15 25,35 15,35 C 5,35 5,15 15,15",
  'u': "M 0,15 L 0,35 C 0,40 30,40 30,30 L 30,15",
  'R': "M 0,0 L 0,40 M 0,5 C 15,5 30,10 30,20 C 30,30 15,35 0,35 M 15,35 C 20,35 30,40 30,40",
  'l': "M 10,0 L 10,40",
  'a': "M 25,15 L 25,40 M 25,15 C 20,5 0,5 0,15 C 0,25 25,25 25,15",
  'i': "M 10,0 L 10,5 M 10,10 L 10,40",
  'p': "M 0,15 L 0,50 M 0,15 C 0,5 30,0 30,15 C 30,30 0,30 0,20",
  's': "M 25,10 C 15,5 5,10 10,20 C 15,30 25,25 20,35 C 15,45 0,40 0,40",
  ' ': ""
}

// Animation variants
const drawVariants: Variants = {
  hidden: {
    pathLength: 0,
    opacity: 0
  },
  visible: (i: number) => {
    const delay = i * 0.08 // Stagger delay between letters
    return {
      pathLength: 1,
      opacity: 1,
      transition: {
        pathLength: { delay, type: "spring", duration: 1.5, bounce: 0 },
        opacity: { delay, duration: 0.01 }
      }
    }
  }
}

// SVG container and path styles
const svgContainerStyle: React.CSSProperties = {
  width: "100%",
  height: "auto",
  maxWidth: "100%",
  display: 'block',
  overflow: 'visible'
}

const pathBaseStyle: React.CSSProperties = {
  fill: "none",
  strokeWidth: 3,
  strokeLinecap: "round",
  strokeLinejoin: "round"
}

interface Props {
  className?: string
}

const AnimatedSvgText: React.FC<Props> = ({ className = '' }) => {
  // Convert "Strengthen Your Relationships" to an array of letters
  const text = "Strengthen Your Relationships"
  const letters = text.split('')
  
  return (
    <div className={className}>
      {/* Hidden element for SEO and screen readers */}
      <span className="sr-only">Strengthen Your Relationships</span>
      
      <motion.svg
        width="100%"
        height="70"
        viewBox={`0 0 ${letters.length * 35}, 70`}
        style={svgContainerStyle}
        initial="hidden"
        animate="visible"
        className="overflow-visible"
      >
        <defs>
          <linearGradient id="textGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" /> {/* blue-500 */}
            <stop offset="100%" stopColor="#2563eb" /> {/* blue-600 */}
          </linearGradient>
        </defs>
        
        {letters.map((char, index) => {
          // Get the path data for this character
          const pathData = letterPaths[char] || letterPaths[char.toLowerCase()] || ""
          
          // Skip rendering spaces but maintain positioning
          if (char === ' ') {
            return null
          }
          
          return (
            <motion.path
              key={index}
              d={pathData}
              transform={`translate(${index * 35}, 15)`}
              style={{
                ...pathBaseStyle,
                stroke: "url(#textGradient)"
              }}
              variants={drawVariants}
              custom={index}
            />
          )
        })}
      </motion.svg>
    </div>
  )
}

export default AnimatedSvgText