// src/components/VoiceWaveform.tsx
import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

interface VoiceWaveformProps {
  audioLevel: number;
}

export default function VoiceWaveform({ audioLevel }: VoiceWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Normalize audio level to a scale of 0-100
  const normalizedLevel = Math.min(100, Math.max(0, audioLevel * 2));
  
  // Generate bars for visualization
  const generateBars = () => {
    const bars = [];
    const barCount = 50;
    
    for (let i = 0; i < barCount; i++) {
      // Calculate height based on position and audio level
      const position = i / barCount;
      const amplitude = Math.sin(position * Math.PI);
      const height = amplitude * normalizedLevel;
      
      bars.push(
        <motion.div
          key={i}
          initial={{ height: '5%' }}
          animate={{ 
            height: `${5 + Math.abs(height)}%`,
            backgroundColor: audioLevel > 30 
              ? `rgba(129, 140, 248, ${0.3 + amplitude * 0.7})` 
              : `rgba(129, 140, 248, ${0.3 + amplitude * 0.3})`
          }}
          transition={{ 
            type: "spring", 
            stiffness: 300, 
            damping: 10,
            mass: 0.5 + Math.random() * 0.5
          }}
          className="w-1 md:w-2 rounded-full mx-px transform transition-all duration-75"
          style={{ 
            transformOrigin: 'bottom',
          }}
        />
      );
    }
    
    return bars;
  };

  return (
    <div className="w-full py-8 px-4">
      <div className="relative h-32 md:h-40 w-full overflow-hidden rounded-lg bg-indigo-900/30 backdrop-blur-sm flex items-center justify-center">
        <motion.div 
          className="absolute bottom-0 left-0 right-0 flex justify-center items-end h-full px-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {generateBars()}
        </motion.div>
        
        {/* Glowing effect that responds to audio level */}
        <motion.div 
          className="absolute inset-0 rounded-lg pointer-events-none"
          animate={{ 
            boxShadow: `inset 0 0 ${20 + normalizedLevel / 2}px rgba(99, 102, 241, ${0.2 + normalizedLevel / 300})` 
          }}
          transition={{ duration: 0.1 }}
        />
        
        {/* Subtle instruction/status when idle */}
        {audioLevel < 5 && (
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            transition={{ delay: 1 }}
            className="text-indigo-200 text-opacity-70 text-sm md:text-base"
          >
            Speak to see your voice visualization...
          </motion.p>
        )}
      </div>
    </div>
  );
}