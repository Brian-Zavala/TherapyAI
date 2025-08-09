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

// Static therapeutic color palette to avoid recreating on every render
const THERAPEUTIC_COLORS = [
  // Red: Energy, vitality, stimulation
  'rgba(255, 64, 64, OPACITY)',
  
  // Orange: Energy, creativity, enthusiasm, positive outlook
  'rgba(255, 165, 0, OPACITY)',
  
  // Yellow: Happiness, optimism, creativity, mental clarity
  'rgba(255, 215, 0, OPACITY)',
  
  // Green: Balance, harmony, nature, equilibrium
  'rgba(50, 205, 50, OPACITY)',
  
  // Blue: Calming, soothing, relaxation, stress reduction
  'rgba(30, 144, 255, OPACITY)',
  
  // Indigo: Intuition, inner wisdom, mental clarity
  'rgba(75, 0, 130, OPACITY)',
  
  // Violet: Spirituality, intuition, transformation
  'rgba(138, 43, 226, OPACITY)',
  
  // Pink: Love, compassion, emotional well-being
  'rgba(255, 105, 180, OPACITY)',
  
  // White/Turquoise: Purity, clarity, cleansing
  'rgba(173, 216, 230, OPACITY)',
];

// Memoized particle component with color transitions for chromatherapy effects
const Particle = memo(({ particle }: { particle: BokehParticle }) => {
  const prefersReducedMotion = useReducedMotion();
  const [colorIndex, setColorIndex] = useState(0);
  
  // Memoize therapeutic colors with proper opacity
  const therapeuticColors = useMemo(() => {
    return THERAPEUTIC_COLORS.map(color => 
      color.replace('OPACITY', particle.opacity.toString())
    );
  }, [particle.opacity]);
  
  // Remove color transitions for better performance
  useEffect(() => {
    if (prefersReducedMotion) return;
    // Color transitions disabled for performance
  }, [prefersReducedMotion]);
  
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
        contain: 'layout style paint',
        willChange: 'transform',
        transform: 'translateZ(0)',
      }}
      initial={{ opacity: 0, scale: 0 }}
      animate={animationProps}
      transition={transitionProps}
    />
  );
});

Particle.displayName = 'Particle';

export default function TherapeuticBokehBackground() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [windowSize, setWindowSize] = useState<{width: number, height: number} | null>(null)
  
  // Generate particles only once and cache them with useMemo
  const particles = useMemo(() => {
    // Chromatherapy color palette with healing properties:
    // - Red: Energy, vitality, stimulation
    // - Orange: Energy, creativity, enthusiasm, positive outlook
    // - Yellow: Happiness, optimism, creativity, mental clarity
    // - Green: Balance, harmony, nature, equilibrium
    // - Blue: Calming, soothing, relaxation, stress reduction
    // - Indigo: Intuition, inner wisdom, mental clarity
    // - Violet: Spirituality, intuition, transformation
    // - Pink: Love, compassion, emotional well-being
    // - White/Turquoise: Purity, clarity, cleansing
    const colors = [
      // Base colors for initial state - particles will transition through the full therapeutic spectrum
      'rgba(255, 64, 64, 0.6)',   // Vibrant red - energy
      'rgba(255, 165, 0, 0.6)',   // Bright orange - enthusiasm
      'rgba(255, 215, 0, 0.65)',  // Golden yellow - optimism
      'rgba(50, 205, 50, 0.7)',   // Lime green - balance
      'rgba(30, 144, 255, 0.65)', // Dodger blue - calm
      'rgba(75, 0, 130, 0.6)',    // Indigo - wisdom
      'rgba(138, 43, 226, 0.6)',  // Violet - spirituality
      'rgba(255, 105, 180, 0.65)', // Hot pink - love
      'rgba(173, 216, 230, 0.7)'  // Light blue - clarity
    ]

    // Drastically reduce particle count for performance
    let particleCount = 8; // Much fewer particles
    
    if (windowSize) {
      if (windowSize.width < 768) {
        particleCount = 5; // Minimal particles on mobile
      } else if (windowSize.width < 1280) {
        particleCount = 6;
      }
    }

    const newParticles: BokehParticle[] = []

    for (let i = 0; i < particleCount; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 300 + 150, // Smaller particles for performance
        opacity: Math.random() * 0.3 + 0.2, // Lower opacity
        blur: Math.random() * 40 + 20, // More blur to hide fewer particles
        color: colors[Math.floor(Math.random() * colors.length)],
        duration: Math.random() * 30 + 25, // Even slower for less CPU usage
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
      {/* Dynamic background that complements color cycling */}
      <div className="absolute inset-0">
        {/* Base healing gradient that cycles through colors */}
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-800/20 via-cyan-700/20 to-emerald-800/20 animate-gradient-slow" />
        
        {/* Energy center gradients */}
        <div className="absolute inset-0 bg-gradient-radial from-red-500/5 via-transparent to-transparent" style={{ top: '70%', left: '30%' }} />
        <div className="absolute inset-0 bg-gradient-radial from-blue-500/5 via-transparent to-transparent" style={{ top: '30%', left: '70%' }} />
        <div className="absolute inset-0 bg-gradient-radial from-purple-500/5 via-transparent to-transparent" style={{ top: '50%', left: '50%' }} />
        <div className="absolute inset-0 bg-gradient-radial from-green-500/5 via-transparent to-transparent" style={{ top: '20%', left: '40%' }} />
        <div className="absolute inset-0 bg-gradient-radial from-yellow-500/5 via-transparent to-transparent" style={{ top: '60%', left: '80%' }} />
        <div className="absolute inset-0 bg-gradient-radial from-pink-500/5 via-transparent to-transparent" style={{ top: '80%', left: '20%' }} />
      </div>
      
      {/* Use a batched rendering approach to improve performance */}
      <div className="relative w-full h-full" style={{ contain: 'strict' }}>
        {particles.map((particle) => (
          <Particle key={particle.id} particle={particle} />
        ))}
      </div>
      
      {/* Add subtle light beam effects */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute h-[200px] w-[1px] bg-white blur-[20px] top-[30%] left-[25%] rotate-[30deg] animate-pulse-slow" />
        <div className="absolute h-[300px] w-[1px] bg-white blur-[20px] top-[50%] left-[75%] rotate-[-30deg] animate-pulse-slower" />
        <div className="absolute h-[250px] w-[1px] bg-white blur-[20px] top-[70%] left-[45%] rotate-[60deg] animate-pulse-slowest" />
      </div>
    </div>
  )
}