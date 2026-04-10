// @ts-nocheck
// src/components/dashboard/UnifiedLoadingState.tsx
"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, 
  Loader2, 
  MessageSquare, 
  TrendingUp, 
  Calendar,
  Heart,
  Activity,
  BarChart3,
  Sparkles
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { dashboardTheme } from '@/lib/dashboard-theme';
import '@/styles/dashboard-modern.css';

// ========================================
// TYPES
// ========================================

export interface UnifiedLoadingStateProps {
  type: 'brain' | 'skeleton' | 'spinner' | 'none' | 'communication' | 'progress' | 'session' | 'insights';
  message?: string;
  className?: string;
  variant?: 'card' | 'inline' | 'fullscreen';
  metricType?: keyof typeof dashboardTheme.loadingStates;
}

// ========================================
// PERFORMANCE UTILITIES
// ========================================

// Hook to manage animation performance
function useOptimizedAnimations() {
  const prefersReducedMotion = React.useRef(false);
  const [isVisible, setIsVisible] = React.useState(true);
  
  React.useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    prefersReducedMotion.current = mediaQuery.matches;
    
    // Update on preference change
    const handleChange = () => {
      prefersReducedMotion.current = mediaQuery.matches;
    };
    
    mediaQuery.addEventListener('change', handleChange);
    
    // Pause animations when page is not visible (performance optimization)
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
  
  return {
    prefersReducedMotion: prefersReducedMotion.current,
    isVisible,
    getAnimationConfig: (duration: number, repeat: number | boolean = Infinity) => ({
      duration: prefersReducedMotion.current ? 0.01 : duration,
      repeat: prefersReducedMotion.current || !isVisible ? 0 : repeat,
    })
  };
}

// ========================================
// LOADING COMPONENTS
// ========================================

// Enhanced Communication metrics loader with 2025 modern CSS animations
function CommunicationLoader({ message }: { message?: string }) {
  const { prefersReducedMotion, isVisible, getAnimationConfig } = useOptimizedAnimations();

  return (
    <div 
      className="flex flex-col items-center justify-center space-y-6 py-12"
      role="status"
      aria-label="Loading communication metrics"
      aria-live="polite"
    >
      {/* Main animated container with layered effects */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ 
          duration: prefersReducedMotion.current ? 0.1 : 0.6, 
          ease: "easeOut" 
        }}
        className="relative gpu-acceleration will-change-transform"
      >
        {/* Gradient background glow effect */}
        <motion.div
          className="absolute -inset-12 bg-gradient-radial from-blue-500/30 via-cyan-500/20 to-transparent rounded-full blur-xl gpu-acceleration will-change-transform"
          animate={prefersReducedMotion.current ? {} : { 
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.6, 0.3],
            rotateZ: [0, 180, 360]
          }}
          transition={{ 
            duration: prefersReducedMotion.current ? 0 : 4, 
            repeat: prefersReducedMotion.current ? 0 : Infinity,
            ease: "easeInOut"
          }}
          style={{ 
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden' 
          }}
        />
        
        {/* Speech bubble morphing animation */}
        <motion.div className="relative flex items-center justify-center">
          {/* Main message bubble */}
          <motion.div
            className="relative w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-2xl"
            animate={{
              borderRadius: ["16px", "50%", "16px"],
              rotate: [0, 5, -5, 0],
              scale: [1, 1.05, 1]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            style={{
              boxShadow: "0 0 40px rgba(59, 130, 246, 0.5), inset 0 0 20px rgba(255, 255, 255, 0.2)"
            }}
          >
            <MessageSquare className="h-7 w-7 text-white drop-shadow-lg" />
          </motion.div>
          
          {/* Floating conversation bubbles */}
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-3 h-3 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full shadow-lg"
              initial={{ 
                x: 0, 
                y: 0, 
                scale: 0,
                opacity: 0 
              }}
              animate={{
                x: [0, Math.cos(i * 120 * Math.PI / 180) * 40, 0],
                y: [0, Math.sin(i * 120 * Math.PI / 180) * 40, 0],
                scale: [0, 1, 0],
                opacity: [0, 0.8, 0],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                delay: i * 0.4,
                ease: "easeInOut"
              }}
              style={{
                filter: 'blur(0.5px)',
                boxShadow: "0 0 10px rgba(59, 130, 246, 0.6)"
              }}
            />
          ))}
          
          {/* Liquid morphing ring */}
          <motion.div
            className="absolute inset-0 border-2 border-transparent rounded-full"
            animate={{
              borderRadius: ["50%", "30% 70% 70% 30% / 30% 30% 70% 70%", "50%"],
              scale: [1, 1.2, 1.4, 1],
              opacity: [0.6, 0.8, 0.4, 0.6]
            }}
            transition={{
              duration: 3.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            style={{
              background: 'linear-gradient(45deg, transparent 30%, rgba(59, 130, 246, 0.3) 50%, transparent 70%)',
              filter: 'blur(1px)'
            }}
          />
        </motion.div>
        
        {/* Particle trail effect */}
        <motion.div className="absolute inset-0 pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-blue-400 rounded-full"
              style={{
                left: '50%',
                top: '50%',
              }}
              animate={{
                x: [0, Math.cos(i * 60 * Math.PI / 180) * 60, 0],
                y: [0, Math.sin(i * 60 * Math.PI / 180) * 60, 0],
                opacity: [0, 1, 0],
                scale: [0, 1.5, 0]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeOut"
              }}
            />
          ))}
        </motion.div>
      </motion.div>
      
      {/* Enhanced text with wavy animation */}
      <motion.div 
        className="text-center space-y-3 relative z-10"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
      >
        <motion.p 
          className="text-xl font-semibold text-gray-800 dark:text-gray-100 tracking-wide"
          style={{
            background: 'linear-gradient(45deg, #3b82f6, #06b6d4, #3b82f6)',
            backgroundSize: '300% 100%',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            animation: 'gradient-wave 3s ease-in-out infinite'
          }}
        >
          {message || dashboardTheme.loadingStates.communication.message}
        </motion.p>
        <motion.p 
          className="text-sm text-gray-600 dark:text-gray-400"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Analyzing conversation dynamics...
        </motion.p>
      </motion.div>
    </div>
  );
}

// Enhanced Progress metrics loader with 2025 modern CSS animations
function ProgressLoader({ message }: { message?: string }) {
  const { prefersReducedMotion, isVisible, getAnimationConfig } = useOptimizedAnimations();

  return (
    <div 
      className="flex flex-col items-center justify-center space-y-6 py-12"
      role="status"
      aria-label="Loading relationship progress"
      aria-live="polite"
    >
      {/* Main animated container with growth visualization */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ 
          duration: prefersReducedMotion.current ? 0.1 : 0.6, 
          ease: "easeOut" 
        }}
        className="relative gpu-acceleration will-change-transform"
      >
        {/* Gradient background with breathing effect */}
        <motion.div
          className="absolute -inset-16 bg-gradient-radial from-emerald-500/25 via-teal-500/15 to-transparent rounded-full blur-2xl"
          animate={{ 
            scale: [1, 1.4, 1],
            opacity: [0.4, 0.7, 0.4],
          }}
          transition={{ 
            duration: 3.5, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        {/* Central progress visualization */}
        <motion.div className="relative flex items-center justify-center">
          {/* Growing heart/progress container */}
          <motion.div
            className="relative w-18 h-18 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center shadow-2xl overflow-hidden"
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 2, -2, 0]
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            style={{
              boxShadow: "0 0 50px rgba(16, 185, 129, 0.4), inset 0 0 30px rgba(255, 255, 255, 0.2)"
            }}
          >
            {/* Animated progress icon */}
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                y: [0, -2, 0]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <TrendingUp className="h-8 w-8 text-white drop-shadow-lg" />
            </motion.div>
            
            {/* Inner liquid wave effect */}
            <motion.div
              className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white/30 to-transparent"
              animate={{
                height: ["20%", "60%", "20%"],
                borderRadius: ["0 0 50% 50%", "50% 50% 0 0", "0 0 50% 50%"]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              style={{
                filter: 'blur(2px)'
              }}
            />
          </motion.div>
          
          {/* Orbital progress rings */}
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute border-2 border-emerald-400/30 rounded-full"
              style={{
                width: `${(i + 1) * 30 + 60}px`,
                height: `${(i + 1) * 30 + 60}px`,
              }}
              animate={{
                rotate: 360,
                scale: [1, 1.05, 1],
                opacity: [0.3, 0.6, 0.3]
              }}
              transition={{
                rotate: {
                  duration: 4 + i * 2,
                  repeat: Infinity,
                  ease: "linear"
                },
                scale: {
                  duration: 3 + i,
                  repeat: Infinity,
                  ease: "easeInOut"
                },
                opacity: {
                  duration: 2 + i * 0.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }
              }}
            />
          ))}
          
          {/* Growth sparkle particles */}
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-yellow-400 rounded-full"
              style={{
                left: '50%',
                top: '50%',
              }}
              initial={{
                scale: 0,
                opacity: 0,
                x: 0,
                y: 0
              }}
              animate={{
                scale: [0, 1, 0],
                opacity: [0, 1, 0],
                x: [0, Math.cos(i * 45 * Math.PI / 180) * 50],
                y: [0, Math.sin(i * 45 * Math.PI / 180) * 50],
                rotate: [0, 360]
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeOut"
              }}
            />
          ))}
        </motion.div>
        
        {/* Progress indicator arcs */}
        <motion.div className="absolute inset-0 pointer-events-none">
          <motion.div
            className="w-full h-full border-4 border-transparent rounded-full"
            style={{
              background: `conic-gradient(from 0deg, transparent 0%, rgba(16, 185, 129, 0.4) 30%, transparent 70%)`,
              borderRadius: '50%'
            }}
            animate={{
              rotate: 360
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        </motion.div>
      </motion.div>
      
      {/* Enhanced text with growth emphasis */}
      <motion.div 
        className="text-center space-y-3 relative z-10"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
      >
        <motion.p 
          className="text-xl font-semibold text-gray-800 dark:text-gray-100 tracking-wide"
          style={{
            background: 'linear-gradient(45deg, #10b981, #14b8a6, #10b981)',
            backgroundSize: '300% 100%',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            animation: 'gradient-wave 3s ease-in-out infinite'
          }}
        >
          {message || dashboardTheme.loadingStates.progress.message}
        </motion.p>
        <motion.p 
          className="text-sm text-gray-600 dark:text-gray-400"
          animate={{ 
            opacity: [0.7, 1, 0.7],
            scale: [1, 1.02, 1]
          }}
          transition={{ duration: 2.5, repeat: Infinity }}
        >
          Measuring relationship growth...
        </motion.p>
      </motion.div>
    </div>
  );
}

// AI insights loader (Brain)
function BrainLoader({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center space-y-6 py-12">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative"
      >
        {/* Gradient background glow */}
        <motion.div
          className="absolute -inset-8 bg-gradient-to-r from-purple-600 via-purple-500 to-pink-500 rounded-full blur-2xl opacity-30"
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        
        {/* Brain icon with enhanced purple gradient */}
        <Brain className="h-16 w-16 text-purple-500 relative z-10" 
          style={{
            filter: 'drop-shadow(0 0 12px rgba(168, 85, 247, 0.5))'
          }}
        />
        
        {/* Enhanced spinning ring with glow effect */}
        <motion.div
          className="absolute inset-0 z-20"
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        >
          <div 
            className="h-full w-full rounded-full border-2 border-transparent"
            style={{
              background: 'linear-gradient(90deg, transparent 50%, rgba(255, 255, 255, 0.9) 70%, transparent 100%)',
              backgroundSize: '200% 100%',
              boxShadow: '0 0 20px rgba(255, 255, 255, 0.5), inset 0 0 20px rgba(255, 255, 255, 0.3)',
            }}
          />
        </motion.div>
        
        {/* Additional particle effects */}
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              top: '50%',
              left: '50%',
            }}
            animate={{
              x: [0, Math.cos(i * 120 * Math.PI / 180) * 30, 0],
              y: [0, Math.sin(i * 120 * Math.PI / 180) * 30, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.3,
              ease: "easeInOut"
            }}
          />
        ))}
      </motion.div>
      
      {/* Enhanced text with better visibility */}
      <motion.div 
        className="text-center space-y-3 relative z-10"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <p className="text-xl font-semibold text-white/95 tracking-wide drop-shadow-lg">
          {message || dashboardTheme.loadingStates.insights.message}
        </p>
        <motion.p 
          className="text-base text-white/80 drop-shadow-md"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Creating personalized recommendations
        </motion.p>
      </motion.div>
    </div>
  );
}

// Session analytics loader
function SessionLoader({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 py-12">
      <motion.div className="relative">
        <Calendar className="h-12 w-12 text-blue-600" />
        <motion.div
          className="absolute top-0 right-0 flex space-x-1"
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 2, repeat: Infinity, staggerChildren: 0.2 }}
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="h-2 w-2 bg-blue-500 rounded-full"
              animate={{ scale: [0, 1, 0] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </motion.div>
      </motion.div>
      <div className="text-center space-y-2">
        <p className={`text-lg font-medium ${dashboardTheme.typography.h3}`}>
          {message || dashboardTheme.loadingStates.sessions.message}
        </p>
        <p className={`${dashboardTheme.typography.bodySmall} text-muted-foreground`}>
          Organizing your therapy timeline
        </p>
      </div>
    </div>
  );
}

function SkeletonLoader({ message }: { message?: string }) {
  return (
    <div className="space-y-4">
      {message && (
        <p className="text-sm text-muted-foreground text-center mb-4">
          {message}
        </p>
      )}
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SpinnerLoader({ message }: { message?: string }) {
  return (
    <div className="flex items-center justify-center space-x-2 py-4">
      <Loader2 className="h-5 w-5 animate-spin text-primary" />
      {message && (
        <span className="text-sm text-muted-foreground">{message}</span>
      )}
    </div>
  );
}

// ========================================
// MAIN COMPONENT
// ========================================

export function UnifiedLoadingState({
  type,
  message,
  className = '',
  variant = 'card',
  metricType
}: UnifiedLoadingStateProps) {
  if (type === 'none') return null;
  
  const content = (
    <AnimatePresence mode="wait">
      {(type === 'brain' || type === 'insights') && <BrainLoader message={message} />}
      {type === 'communication' && <CommunicationLoader message={message} />}
      {type === 'progress' && <ProgressLoader message={message} />}
      {type === 'session' && <SessionLoader message={message} />}
      {type === 'skeleton' && <SkeletonLoader message={message} />}
      {type === 'spinner' && <SpinnerLoader message={message} />}
    </AnimatePresence>
  );
  
  if (variant === 'inline') {
    return <div className={className}>{content}</div>;
  }
  
  if (variant === 'fullscreen') {
    return (
      <div className={`fixed inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 backdrop-blur-sm z-50 ${className}`}>
        {/* Subtle animated background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.1),transparent_50%)]" />
          <motion.div
            className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(219,39,119,0.1),transparent_50%)]"
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [0, 5, 0] 
            }}
            transition={{ duration: 10, repeat: Infinity }}
          />
        </div>
        {content}
      </div>
    );
  }
  
  // Default card variant
  return (
    <Card className={`w-full ${className}`}>
      <CardContent className="p-6">
        {content}
      </CardContent>
    </Card>
  );
}

// ========================================
// PRESET LOADING STATES
// ========================================

export const LoadingStates = {
  TherapyInsights: () => (
    <UnifiedLoadingState
      type="brain"
      message="Analyzing your therapy journey..."
    />
  ),
  
  CommunicationMetrics: () => (
    <UnifiedLoadingState
      type="skeleton"
      message="Loading communication metrics..."
    />
  ),
  
  ProgressData: () => (
    <UnifiedLoadingState
      type="skeleton"
      message="Loading progress data..."
    />
  ),
  
  SessionAnalytics: () => (
    <UnifiedLoadingState
      type="skeleton"
      message="Loading session analytics..."
    />
  ),
  
  RefreshingData: () => (
    <UnifiedLoadingState
      type="spinner"
      message="Updating..."
      variant="inline"
    />
  )
};