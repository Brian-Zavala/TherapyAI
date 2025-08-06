'use client'

import { motion } from 'framer-motion'

export default function ProfileLoadingSpinner() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="relative">
        {/* Modern 2025 Multi-Ring Loader with Morphing Effect */}
        <div className="profile-loader-container">
          {/* Outer morphing ring */}
          <div className="morph-ring outer-ring">
            <div className="ring-segment"></div>
            <div className="ring-segment"></div>
            <div className="ring-segment"></div>
            <div className="ring-segment"></div>
          </div>
          
          {/* Middle pulsing ring */}
          <div className="pulse-ring middle-ring">
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke="url(#gradient1)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="150 50"
                className="rotating-stroke"
              />
              <defs>
                <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#60A5FA" />
                  <stop offset="50%" stopColor="#A78BFA" />
                  <stop offset="100%" stopColor="#F472B6" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          
          {/* Inner spinning dots */}
          <div className="dots-container">
            <div className="dot dot-1"></div>
            <div className="dot dot-2"></div>
            <div className="dot dot-3"></div>
            <div className="dot dot-4"></div>
          </div>
          
          {/* Center pulse */}
          <div className="center-pulse">
            <div className="pulse-core"></div>
          </div>
        </div>
        
        {/* Loading text with typewriter effect */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mt-12 text-center"
        >
          <div className="loading-text">
            <span className="letter letter-1">L</span>
            <span className="letter letter-2">o</span>
            <span className="letter letter-3">a</span>
            <span className="letter letter-4">d</span>
            <span className="letter letter-5">i</span>
            <span className="letter letter-6">n</span>
            <span className="letter letter-7">g</span>
            <span className="letter letter-8 ml-2">p</span>
            <span className="letter letter-9">r</span>
            <span className="letter letter-10">o</span>
            <span className="letter letter-11">f</span>
            <span className="letter letter-12">i</span>
            <span className="letter letter-13">l</span>
            <span className="letter letter-14">e</span>
            <span className="dots-animate">...</span>
          </div>
          <div className="text-sm text-gray-500 mt-2 opacity-75">
            Preparing your personalized experience
          </div>
        </motion.div>
      </div>
      
      <style jsx>{`
        .profile-loader-container {
          position: relative;
          width: 200px;
          height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        /* Morphing outer ring */
        .morph-ring {
          position: absolute;
          width: 100%;
          height: 100%;
          animation: morphRotate 4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        
        .ring-segment {
          position: absolute;
          width: 180px;
          height: 180px;
          border: 2px solid transparent;
          border-top-color: rgba(96, 165, 250, 0.8);
          border-radius: 50%;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }
        
        .ring-segment:nth-child(1) {
          animation: segmentRotate1 3s ease-in-out infinite;
          border-top-color: rgba(96, 165, 250, 0.8);
        }
        
        .ring-segment:nth-child(2) {
          animation: segmentRotate2 3s ease-in-out infinite;
          border-right-color: rgba(167, 139, 250, 0.8);
          animation-delay: 0.15s;
        }
        
        .ring-segment:nth-child(3) {
          animation: segmentRotate3 3s ease-in-out infinite;
          border-bottom-color: rgba(244, 114, 182, 0.8);
          animation-delay: 0.3s;
        }
        
        .ring-segment:nth-child(4) {
          animation: segmentRotate4 3s ease-in-out infinite;
          border-left-color: rgba(134, 239, 172, 0.8);
          animation-delay: 0.45s;
        }
        
        /* Middle pulsing ring */
        .pulse-ring {
          position: absolute;
          width: 120px;
          height: 120px;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation: pulseScale 2s ease-in-out infinite;
        }
        
        .rotating-stroke {
          animation: strokeRotate 3s linear infinite;
          transform-origin: center;
        }
        
        /* Inner spinning dots */
        .dots-container {
          position: absolute;
          width: 60px;
          height: 60px;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation: dotsRotate 2s linear infinite;
        }
        
        .dot {
          position: absolute;
          width: 8px;
          height: 8px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 50%;
          box-shadow: 0 0 10px rgba(102, 126, 234, 0.5);
        }
        
        .dot-1 {
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          animation: dotPulse 1.5s ease-in-out infinite;
        }
        
        .dot-2 {
          right: 0;
          top: 50%;
          transform: translateY(-50%);
          animation: dotPulse 1.5s ease-in-out infinite 0.375s;
        }
        
        .dot-3 {
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          animation: dotPulse 1.5s ease-in-out infinite 0.75s;
        }
        
        .dot-4 {
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          animation: dotPulse 1.5s ease-in-out infinite 1.125s;
        }
        
        /* Center pulse effect */
        .center-pulse {
          position: absolute;
          width: 30px;
          height: 30px;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }
        
        .pulse-core {
          width: 100%;
          height: 100%;
          background: radial-gradient(circle, rgba(96, 165, 250, 0.9) 0%, rgba(167, 139, 250, 0.7) 50%, transparent 70%);
          border-radius: 50%;
          animation: corePulse 1.5s ease-in-out infinite;
        }
        
        /* Loading text animation */
        .loading-text {
          font-size: 1.25rem;
          font-weight: 500;
          color: #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .letter {
          display: inline-block;
          animation: letterWave 2s ease-in-out infinite;
          animation-fill-mode: both;
        }
        
        .letter-1 { animation-delay: 0s; }
        .letter-2 { animation-delay: 0.05s; }
        .letter-3 { animation-delay: 0.1s; }
        .letter-4 { animation-delay: 0.15s; }
        .letter-5 { animation-delay: 0.2s; }
        .letter-6 { animation-delay: 0.25s; }
        .letter-7 { animation-delay: 0.3s; }
        .letter-8 { animation-delay: 0.35s; }
        .letter-9 { animation-delay: 0.4s; }
        .letter-10 { animation-delay: 0.45s; }
        .letter-11 { animation-delay: 0.5s; }
        .letter-12 { animation-delay: 0.55s; }
        .letter-13 { animation-delay: 0.6s; }
        .letter-14 { animation-delay: 0.65s; }
        
        .dots-animate {
          display: inline-block;
          animation: dotsFlash 1.5s ease-in-out infinite;
        }
        
        /* Keyframe animations */
        @keyframes morphRotate {
          0% {
            transform: rotate(0deg) scale(1);
          }
          25% {
            transform: rotate(90deg) scale(0.95);
          }
          50% {
            transform: rotate(180deg) scale(1);
          }
          75% {
            transform: rotate(270deg) scale(1.05);
          }
          100% {
            transform: rotate(360deg) scale(1);
          }
        }
        
        @keyframes segmentRotate1 {
          0%, 100% {
            transform: translate(-50%, -50%) rotate(0deg);
            opacity: 0.3;
          }
          50% {
            transform: translate(-50%, -50%) rotate(180deg);
            opacity: 1;
          }
        }
        
        @keyframes segmentRotate2 {
          0%, 100% {
            transform: translate(-50%, -50%) rotate(90deg);
            opacity: 0.3;
          }
          50% {
            transform: translate(-50%, -50%) rotate(270deg);
            opacity: 1;
          }
        }
        
        @keyframes segmentRotate3 {
          0%, 100% {
            transform: translate(-50%, -50%) rotate(180deg);
            opacity: 0.3;
          }
          50% {
            transform: translate(-50%, -50%) rotate(360deg);
            opacity: 1;
          }
        }
        
        @keyframes segmentRotate4 {
          0%, 100% {
            transform: translate(-50%, -50%) rotate(270deg);
            opacity: 0.3;
          }
          50% {
            transform: translate(-50%, -50%) rotate(450deg);
            opacity: 1;
          }
        }
        
        @keyframes pulseScale {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.8;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.1);
            opacity: 1;
          }
        }
        
        @keyframes strokeRotate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        
        @keyframes dotsRotate {
          from {
            transform: translate(-50%, -50%) rotate(0deg);
          }
          to {
            transform: translate(-50%, -50%) rotate(360deg);
          }
        }
        
        @keyframes dotPulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.5);
            opacity: 0.5;
          }
        }
        
        @keyframes corePulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.5;
          }
          50% {
            transform: scale(1.3);
            opacity: 0.8;
          }
        }
        
        @keyframes letterWave {
          0%, 100% {
            transform: translateY(0);
            color: #e5e7eb;
          }
          50% {
            transform: translateY(-5px);
            color: #60a5fa;
          }
        }
        
        @keyframes dotsFlash {
          0%, 100% {
            opacity: 0.2;
          }
          50% {
            opacity: 1;
          }
        }
        
        /* Performance optimizations */
        .morph-ring,
        .pulse-ring,
        .dots-container,
        .dot,
        .pulse-core {
          will-change: transform, opacity;
          transform: translateZ(0);
          backface-visibility: hidden;
        }
      `}</style>
    </div>
  )
}