'use client'

import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface VoiceWaveformProps {
  audioLevel: number;
  isTransitioning?: boolean;
}

function VoiceWaveform({ audioLevel, isTransitioning = false }: VoiceWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const timeRef = useRef(0);
  const audioLevelRef = useRef(audioLevel);
  
  // Update audioLevel ref
  useEffect(() => {
    audioLevelRef.current = audioLevel;
    console.log('🎤 VoiceWaveform audioLevel updated:', audioLevel);
  }, [audioLevel]);
  
  // Update speaking state based on audio level
  useEffect(() => {
    // Don't update during transitions to prevent flickering
    if (isTransitioning) return;
    
    // Simple, reliable thresholds - only count significant audio
    if (audioLevel > 30 && !isSpeaking) {
      setIsSpeaking(true);
    } else if (audioLevel < 20 && isSpeaking) {
      setIsSpeaking(false);
    }
  }, [audioLevel, isSpeaking, isTransitioning]);
  
  // Canvas initialization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Preserve state during transitions
    if (isTransitioning) {
      console.log('🎨 VoiceWaveform: Preserving state during transition');
      return;
    }
    
    // Resize handling
    const resizeCanvas = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect) return;
      
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      ctx.scale(dpr, dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isTransitioning]); // Add isTransitioning to deps
  
  // Simple animation loop
  useEffect(() => {
    let isAnimating = true;
    let frameCount = 0;
    
    const render = () => {
      if (!isAnimating) return;
      
      const canvas = canvasRef.current;
      if (!canvas) {
        console.warn('🎨 VoiceWaveform: Canvas not ready yet');
        animationRef.current = requestAnimationFrame(render);
        return;
      }
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.warn('🎨 VoiceWaveform: Context not ready yet');
        animationRef.current = requestAnimationFrame(render);
        return;
      }
      
      // Log every 60 frames (approximately once per second)
      frameCount++;
      if (frameCount % 60 === 0) {
        console.log('🎨 VoiceWaveform animation running, audioLevel:', audioLevelRef.current);
      }
      
      timeRef.current += 16;
      const time = timeRef.current * 0.001;
      
      // Get dimensions
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);
      const centerY = height / 2;
      
      
      // Clear canvas
      ctx.clearRect(0, 0, width, height);
      
      // Create gradient (used for all states)
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, '#6366f1');  // Indigo
      gradient.addColorStop(0.5, '#a78bfa'); // Purple
      gradient.addColorStop(1, '#ec4899');  // Pink
      
      // Set up for drawing
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = gradient;
      
      // How many points to draw
      const segments = 100;
      const segmentWidth = width / segments;
      
      // Start at left edge
      ctx.moveTo(0, centerY);
      
      // Determine animation state based on audio level (use ref value)
      const currentAudioLevel = audioLevelRef.current;
      let animationIntensity = 0;
      
      // Multiple thresholds for smoother transitions
      // Always have some base animation for visual feedback
      if (currentAudioLevel <= 3) {
        // Completely silent - minimal movement
        animationIntensity = 0.1;
      } else if (currentAudioLevel <= 10) {
        // Very quiet - slight ripple
        animationIntensity = 0.2;
      } else if (currentAudioLevel <= 20) {
        // Low voice - gentle wave
        animationIntensity = 0.4;
      } else if (currentAudioLevel <= 40) {
        // Normal speech - moderate wave
        animationIntensity = 0.7;
      } else {
        // Loud speech - full wave
        animationIntensity = 1.0;
      }
      
      // Maximum amplitude is scaled by intensity
      const baseAmplitude = height * 0.004;
      const maxAmplitude = 40 * baseAmplitude;
      
      // Apply audio level and intensity scaling with minimum value
      const minimumAmplitude = height * 0.02; // Always have some movement
      const effectiveAmplitude = Math.max(minimumAmplitude, Math.min(currentAudioLevel * baseAmplitude, maxAmplitude) * animationIntensity);
      
      // Secondary wave effect that's always present but varies with intensity
      // Ensure there's always some minimal movement even when silent
      const baseMovement = height * 0.01; // Minimal wave even when silent
      const secondaryAmplitude = baseMovement + (height * 0.003 * Math.max(0.05, animationIntensity / 5));
      const secondarySpeed = 1 + animationIntensity;
      
      // Draw the wave points with varied intensities
      for (let i = 0; i <= segments; i++) {
        const x = i * segmentWidth;
        const position = i / segments;
        
        // Center weighting (stronger in middle of line, subtle at edges)
        const centerWeighting = Math.sin(position * Math.PI);
        
        // Primary animation speed based on intensity
        const speedFactor = 2 + (animationIntensity * 3);
        
        // Combine waves of different frequencies
        let y = centerY;
        
        // Primary wave - always present with varying intensity
        y += Math.sin(i * 0.2 + time * speedFactor) * effectiveAmplitude * centerWeighting;
        
        // Always-present secondary gentle wave
        y += Math.sin(i * 0.1 + time * secondarySpeed) * secondaryAmplitude;
        
        // Third subtle micro-movement (very gentle)
        if (animationIntensity > 0.3) {
          y += Math.sin(i * 0.3 + time * 1.5) * effectiveAmplitude * 0.2 * centerWeighting;
        }
        
        // Add the point
        ctx.lineTo(x, y);
      }
      
      // Draw the line
      ctx.stroke();
      
      // Add glow effect that scales with intensity
      if (animationIntensity > 0.1) {
        ctx.save();
        ctx.filter = `blur(${Math.min(currentAudioLevel / 60, 2) * animationIntensity}px)`;
        ctx.globalAlpha = 0.3 * animationIntensity;
        ctx.stroke();
        ctx.restore();
      }
      
      animationRef.current = requestAnimationFrame(render);
    };
    
    // Start the animation loop
    animationRef.current = requestAnimationFrame(render);
    
    return () => {
      isAnimating = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, []); // Remove audioLevel dependency to prevent restart on every change
  
  return (
    <div className="w-full py-2 px-0">
      <div 
        className="relative h-20 sm:h-24 md:h-32 w-full overflow-hidden rounded-lg shadow-md bg-gradient-to-r from-indigo-500/5 to-purple-500/5 flex items-center justify-center"
        style={{ 
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
        }}
      >
        {/* Canvas for waveform */}
        <canvas 
          ref={canvasRef} 
          className="absolute inset-0 w-full h-full z-10"
          style={{ 
            willChange: 'transform' /* Hint for browser to optimize */
          }}
        />
        
        {/* Speaking indicator */}
        <AnimatePresence>
          {isSpeaking && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.2 }}
              className="absolute top-2 left-2 px-2.5 py-1.5 sm:px-2 sm:py-1 rounded-full bg-indigo-600 text-white text-xs font-medium flex items-center z-20"
            >
              <motion.span 
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="w-2.5 h-2.5 sm:w-2 sm:h-2 bg-white rounded-full mr-1.5 sm:mr-1"
              />
              <span className="text-sm sm:text-xs">Speaking</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default VoiceWaveform;