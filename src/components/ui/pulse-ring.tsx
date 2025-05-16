'use client'

import { motion } from 'framer-motion'

interface PulseRingProps {
  duration?: number
  color?: string
}

export default function PulseRing({ duration = 2, color = 'rgba(147, 51, 234, 0.5)' }: PulseRingProps) {
  return (
    <motion.div
      className="absolute inset-0 rounded-xl"
      style={{ borderColor: color }}
      initial={{ opacity: 0, scale: 1 }}
      animate={{
        opacity: [0, 0.5, 0],
        scale: [1, 1.05, 1.1],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: "easeOut",
      }}
    />
  )
}