'use client'

import { motion } from 'framer-motion'
import { useRef, useEffect, useState } from 'react'

interface BokehParticle {
  id: number
  x: number
  y: number
  size: number
  opacity: number
  blur: number
  color: string
  duration: number
  delay: number
}

export default function BokehBackground() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [particles, setParticles] = useState<BokehParticle[]>([])

  useEffect(() => {
    const generateParticles = () => {
      const colors = [
        'rgba(59, 130, 246, 0.5)', // blue
        'rgba(96, 165, 250, 0.4)', // light blue
        'rgba(37, 99, 235, 0.6)', // darker blue
        'rgba(147, 197, 253, 0.35)', // very light blue
        'rgba(219, 234, 254, 0.3)', // blue-50
      ]

      const newParticles: BokehParticle[] = []
      const particleCount = 35

      for (let i = 0; i < particleCount; i++) {
        newParticles.push({
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: Math.random() * 400 + 150,
          opacity: Math.random() * 0.7 + 0.4,
          blur: Math.random() * 50 + 20,
          color: colors[Math.floor(Math.random() * colors.length)],
          duration: Math.random() * 20 + 15,
          delay: Math.random() * 5,
        })
      }

      setParticles(newParticles)
    }

    generateParticles()
  }, [])

  return (
    <div ref={containerRef} className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Add a subtle gradient overlay to enhance visibility */}
      <div className="absolute inset-0 bg-gradient-radial from-blue-500/5 via-transparent to-transparent" />
      
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full mix-blend-screen"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
            background: `radial-gradient(circle, ${particle.color} 0%, transparent 70%)`,
            filter: `blur(${particle.blur}px)`,
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0, particle.opacity, 0],
            scale: [0.8, 1.2, 0.8],
            x: [0, 30, -30, 0],
            y: [0, -20, 20, 0],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  )
}