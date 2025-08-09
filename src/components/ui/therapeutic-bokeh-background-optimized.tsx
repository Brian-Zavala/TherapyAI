'use client'

import { useMemo, memo } from 'react'

// Ultra-optimized version with minimal JavaScript and CSS-only animations
const TherapeuticBokehBackgroundOptimized = memo(() => {
  // Generate static particles once - no state, no re-renders
  const particles = useMemo(() => {
    // Drastically reduced particle count for performance
    const particleCount = typeof window !== 'undefined' && window.innerWidth < 768 ? 5 : 8;
    
    const particles = [];
    const colors = [
      'rgba(59, 130, 246, 0.15)',  // Blue - calming
      'rgba(168, 85, 247, 0.15)',  // Purple - soothing
      'rgba(236, 72, 153, 0.15)',  // Pink - warmth
      'rgba(34, 197, 94, 0.15)',   // Green - balance
      'rgba(251, 146, 60, 0.15)',  // Orange - energy
    ];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 300 + 150,
        color: colors[i % colors.length],
        duration: 20 + Math.random() * 10, // Slower, smoother animations
        delay: i * 0.5,
      });
    }
    return particles;
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-[-1]">
      {/* Single static gradient background - no animations */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-black opacity-95" />
      
      {/* Ultra-light gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-blue-950/10 via-transparent to-purple-950/10" />
      
      {/* CSS-only animated particles */}
      <div className="relative w-full h-full">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute rounded-full animate-float-gentle"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: particle.size,
              height: particle.size,
              background: `radial-gradient(circle, ${particle.color} 0%, transparent 70%)`,
              filter: 'blur(40px)',
              animationDelay: `${particle.delay}s`,
              animationDuration: `${particle.duration}s`,
              willChange: 'transform',
              transform: 'translateZ(0)',
            }}
          />
        ))}
      </div>
      
      {/* Add CSS for animations */}
      <style jsx>{`
        @keyframes float-gentle {
          0%, 100% {
            transform: translate(0, 0) scale(1);
            opacity: 0.3;
          }
          33% {
            transform: translate(10px, -10px) scale(1.05);
            opacity: 0.4;
          }
          66% {
            transform: translate(-10px, 5px) scale(0.95);
            opacity: 0.3;
          }
        }
        
        .animate-float-gentle {
          animation: float-gentle 30s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
});

TherapeuticBokehBackgroundOptimized.displayName = 'TherapeuticBokehBackgroundOptimized';

export default TherapeuticBokehBackgroundOptimized;