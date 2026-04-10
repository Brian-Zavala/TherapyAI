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

  // Update audioLevel ref (no re-render needed for canvas)
  useEffect(() => {
    audioLevelRef.current = audioLevel;
  }, [audioLevel]);

  // Update speaking state based on audio level
  useEffect(() => {
    if (isTransitioning) return;
    if (audioLevel > 30 && !isSpeaking) {
      setIsSpeaking(true);
    } else if (audioLevel < 20 && isSpeaking) {
      setIsSpeaking(false);
    }
  }, [audioLevel, isSpeaking, isTransitioning]);

  // Combined canvas init + animation loop
  // Restarts when isTransitioning changes (pause → resume)
  useEffect(() => {
    if (isTransitioning) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isAnimating = true;

    // Resize handling
    const resizeCanvas = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect || rect.width === 0 || rect.height === 0) return;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Animation render loop
    const render = () => {
      if (!isAnimating) return;

      const w = canvas.width / (window.devicePixelRatio || 1);
      const h = canvas.height / (window.devicePixelRatio || 1);

      if (w === 0 || h === 0) {
        animationRef.current = requestAnimationFrame(render);
        return;
      }

      const centerY = h / 2;

      timeRef.current += 16;
      const time = timeRef.current * 0.001;

      // Clear canvas
      ctx.clearRect(0, 0, w, h);

      // Create gradient
      const gradient = ctx.createLinearGradient(0, 0, w, 0);
      gradient.addColorStop(0, '#6366f1');
      gradient.addColorStop(0.5, '#a78bfa');
      gradient.addColorStop(1, '#ec4899');

      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = gradient;

      const segments = 100;
      const segmentWidth = w / segments;
      ctx.moveTo(0, centerY);

      const currentAudioLevel = audioLevelRef.current;
      let intensity = 0;

      if (currentAudioLevel <= 5) {
        intensity = 0;
      } else if (currentAudioLevel <= 15) {
        intensity = 0.3;
      } else if (currentAudioLevel <= 30) {
        intensity = 0.6;
      } else if (currentAudioLevel <= 50) {
        intensity = 0.8;
      } else {
        intensity = 1.0;
      }

      const baseAmplitude = h * 0.3;
      const effectiveAmplitude = intensity > 0
        ? (currentAudioLevel / 100) * baseAmplitude * intensity
        : 0;
      const secondaryAmplitude = intensity > 0 ? h * 0.05 * intensity : 0;

      for (let i = 0; i <= segments; i++) {
        const x = i * segmentWidth;
        let y = centerY;

        if (intensity > 0) {
          const position = i / segments;
          const centerWeighting = Math.sin(position * Math.PI);
          const speedFactor = 2 + (intensity * 3);

          y += Math.sin(i * 0.2 + time * speedFactor) * effectiveAmplitude * centerWeighting;

          if (secondaryAmplitude > 0) {
            y += Math.sin(i * 0.1 + time * intensity) * secondaryAmplitude;
          }

          if (intensity > 0.5) {
            y += Math.sin(i * 0.3 + time * 1.5) * effectiveAmplitude * 0.2 * centerWeighting;
          }
        }

        ctx.lineTo(x, y);
      }

      ctx.stroke();

      // Glow effect when speaking
      if (intensity > 0.1) {
        ctx.save();
        ctx.filter = `blur(${Math.min(currentAudioLevel / 60, 2) * intensity}px)`;
        ctx.globalAlpha = 0.3 * intensity;
        ctx.stroke();
        ctx.restore();
      }

      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);

    return () => {
      isAnimating = false;
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isTransitioning]);

  return (
    <div className="w-full py-2 px-0">
      <div
        className="relative h-20 sm:h-24 md:h-32 w-full overflow-hidden rounded-lg shadow-md bg-gradient-to-r from-indigo-500/5 to-purple-500/5 flex items-center justify-center"
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full z-10"
          style={{ willChange: 'transform' }}
        />

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
