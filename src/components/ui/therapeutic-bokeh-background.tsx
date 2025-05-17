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

// Memoized particle component with color transitions for chromatherapy effects
const Particle = memo(({ particle }: { particle: BokehParticle }) => {
  const prefersReducedMotion = useReducedMotion();
  const [colorIndex, setColorIndex] = useState(0);
  
  // Therapeutic color palette based on chromatherapy principles
  const therapeuticColors = [
    // Red: Energy, vitality, stimulation
    particle.color.includes('red') ? particle.color : `rgba(255, 64, 64, ${particle.opacity})`,
    
    // Orange: Energy, creativity, enthusiasm, positive outlook
    `rgba(255, 165, 0, ${particle.opacity})`,
    
    // Yellow: Happiness, optimism, creativity, mental clarity
    `rgba(255, 215, 0, ${particle.opacity})`,
    
    // Green: Balance, harmony, nature, equilibrium
    `rgba(50, 205, 50, ${particle.opacity})`,
    
    // Blue: Calming, soothing, relaxation, stress reduction
    `rgba(30, 144, 255, ${particle.opacity})`,
    
    // Indigo: Intuition, inner wisdom, mental clarity
    `rgba(75, 0, 130, ${particle.opacity})`,
    
    // Violet: Spirituality, intuition, transformation
    `rgba(138, 43, 226, ${particle.opacity})`,
    
    // Pink: Love, compassion, emotional well-being
    `rgba(255, 105, 180, ${particle.opacity})`,
    
    // White/Turquoise: Purity, clarity, cleansing
    `rgba(173, 216, 230, ${particle.opacity})`,
  ];
  
  // Color transition effect
  useEffect(() => {
    if (prefersReducedMotion) return;
    
    const interval = setInterval(() => {
      setColorIndex((prevIndex) => (prevIndex + 1) % therapeuticColors.length);
    }, 5000 + Math.random() * 5000); // Random interval between 5-10 seconds
    
    return () => clearInterval(interval);
  }, [prefersReducedMotion, therapeuticColors.length]);
  
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
        background: `radial-gradient(circle, ${therapeuticColors[colorIndex]} 0%, transparent 70%)`,
        filter: `blur(${particle.blur}px)`,
        contain: 'layout',
        transition: 'background 2s ease-in-out',
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

    // Reduce particle count on smaller screens
    let particleCount = 30; // Slightly more particles for richer effect
    
    if (windowSize) {
      if (windowSize.width < 768) {
        particleCount = 20; // Still more particles on mobile than standard
      } else if (windowSize.width < 1280) {
        particleCount = 25;
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
        blur: Math.random() * 35 + 10, // Less blur for sharper definition
        color: colors[Math.floor(Math.random() * colors.length)],
        duration: Math.random() * 25 + 20, // Slightly slower, more calming motion
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