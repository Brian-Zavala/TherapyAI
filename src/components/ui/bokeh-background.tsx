'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { useRef, useEffect, useState, useMemo, memo } from 'react'

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

// Memoized particle component to prevent unnecessary re-renders
const Particle = memo(({ particle }: { particle: BokehParticle }) => {
  const prefersReducedMotion = useReducedMotion();
  
  // Optimize animations for users who prefer reduced motion
  const animationProps = prefersReducedMotion
    ? {
        opacity: particle.opacity,
        scale: 1,
      }
    : {
        opacity: [0, particle.opacity, 0],
        scale: [0.8, 1.2, 0.8],
        x: [0, 30, -30, 0],
        y: [0, -20, 20, 0],
      };
  
  const transitionProps = prefersReducedMotion
    ? {
        duration: 0,
      }
    : {
        duration: particle.duration,
        delay: particle.delay,
        repeat: Infinity,
        ease: "easeInOut",
      };
  
  return (
    <motion.div
      key={particle.id}
      className="absolute rounded-full mix-blend-screen will-change-transform"
      style={{
        left: `${particle.x}%`,
        top: `${particle.y}%`,
        width: particle.size,
        height: particle.size,
        background: `radial-gradient(circle, ${particle.color} 0%, transparent 70%)`,
        filter: `blur(${particle.blur}px)`,
        contain: 'layout',
      }}
      initial={{ opacity: 0, scale: 0 }}
      animate={animationProps}
      transition={transitionProps}
    />
  );
});

Particle.displayName = 'Particle';

export default function BokehBackground() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [windowSize, setWindowSize] = useState<{width: number, height: number} | null>(null)
  
  // Generate particles only once and cache them with useMemo
  const particles = useMemo(() => {
    const colors = [
      'rgba(59, 130, 246, 0.75)', // blue - increased opacity
      'rgba(96, 165, 250, 0.7)', // light blue - increased opacity
      'rgba(37, 99, 235, 0.8)', // darker blue - increased opacity
      'rgba(147, 197, 253, 0.65)', // very light blue - increased opacity
      'rgba(219, 234, 254, 0.6)', // blue-50 - increased opacity
      'rgba(59, 130, 246, 0.85)', // higher contrast blue for more visibility
      'rgba(19, 78, 214, 0.7)', // additional dark blue for contrast
    ]

    // Reduce particle count on smaller screens
    let particleCount = 24;
    
    if (windowSize) {
      if (windowSize.width < 768) {
        particleCount = 15; // Fewer particles on mobile
      } else if (windowSize.width < 1280) {
        particleCount = 20; // Medium number for tablets/small desktops
      }
    }

    const newParticles: BokehParticle[] = []

    for (let i = 0; i < particleCount; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 400 + 200, // Slightly larger particles
        opacity: Math.random() * 0.4 + 0.6, // Higher base opacity
        blur: Math.random() * 40 + 15, // Slightly less blur for more definition
        color: colors[Math.floor(Math.random() * colors.length)],
        duration: Math.random() * 20 + 15,
        delay: Math.random() * 5,
      })
    }

    return newParticles;
  }, [windowSize]);

  // Update window size once on mount and on resize
  useEffect(() => {
    const updateSize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };
    
    // Initial size detection
    updateSize();
    
    // Listen for window resize
    window.addEventListener('resize', updateSize);
    
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  return (
    <div ref={containerRef} className="fixed inset-0 overflow-hidden pointer-events-none z-[-1]">
      {/* Enhanced gradient overlay for better visibility */}
      <div className="absolute inset-0 bg-gradient-radial from-blue-500/15 via-blue-700/10 to-transparent" />
      
      {/* Add a subtle directional light effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-300/10 via-transparent to-blue-600/10" />
      
      {/* Use a batched rendering approach to improve performance */}
      <div className="relative w-full h-full" style={{ contain: 'strict' }}>
        {particles.map((particle) => (
          <Particle key={particle.id} particle={particle} />
        ))}
      </div>
    </div>
  )
}