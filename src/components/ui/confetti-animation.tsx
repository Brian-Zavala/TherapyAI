'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

interface ConfettiParticle {
  id: number
  x: number
  y: number
  rotation: number
  color: string
  delay: number
  duration: number
}

interface ConfettiAnimationProps {
  trigger: boolean
}

export default function ConfettiAnimation({ trigger }: ConfettiAnimationProps) {
  const [particles, setParticles] = useState<ConfettiParticle[]>([])

  useEffect(() => {
    if (trigger) {
      const colors = ['#3b82f6', '#60a5fa', '#2563eb', '#93c5fd', '#dbeafe']
      const newParticles: ConfettiParticle[] = []
      
      for (let i = 0; i < 50; i++) {
        newParticles.push({
          id: i,
          x: Math.random() * window.innerWidth,
          y: -20,
          rotation: Math.random() * 360,
          color: colors[Math.floor(Math.random() * colors.length)],
          delay: Math.random() * 0.5,
          duration: Math.random() * 2 + 2,
        })
      }
      
      setParticles(newParticles)
      
      // Clear particles after animation
      setTimeout(() => {
        setParticles([])
      }, 4500)
    }
  }, [trigger])

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute w-3 h-3"
          style={{
            left: particle.x,
            backgroundColor: particle.color,
          }}
          initial={{
            y: particle.y,
            rotate: particle.rotation,
            opacity: 1,
          }}
          animate={{
            y: window.innerHeight + 20,
            rotate: particle.rotation + 720,
            opacity: 0,
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  )
}