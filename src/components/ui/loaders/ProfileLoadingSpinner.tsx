'use client'

import { motion } from 'framer-motion'

export default function ProfileLoadingSpinner() {
  return (
    <div className="fixed inset-0 w-full h-full bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center px-4 py-8 overflow-y-auto">
      {/* Animated background gradient spots for depth and vibrancy */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl animate-blob" />
        <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute bottom-1/4 left-1/2 w-80 h-80 bg-teal-500/15 rounded-full blur-3xl animate-blob animation-delay-4000" />
        <div className="absolute top-1/2 right-1/3 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl animate-blob animation-delay-3000" />
      </div>
      <div className="relative flex flex-col items-center justify-center z-10">
        {/* Enhanced Multi-Ring Loader with Vibrant Glow Effects */}
        <div className="profile-loader-container scale-75 sm:scale-90 md:scale-100 lg:scale-110">
          {/* Central glow effect */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 bg-gradient-to-r from-cyan-500/30 via-purple-500/30 to-teal-500/30 rounded-full blur-2xl animate-pulse-glow" />
          </div>
          {/* Outer morphing ring with enhanced glow */}
          <div className="morph-ring outer-ring relative">
            <div className="ring-segment ring-glow-1"></div>
            <div className="ring-segment ring-glow-2"></div>
            <div className="ring-segment ring-glow-3"></div>
            <div className="ring-segment ring-glow-4"></div>
          </div>
          
          {/* Middle pulsing ring */}
          <div className="pulse-ring middle-ring">
            <svg className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32" viewBox="0 0 120 120">
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
                filter="url(#glow)"
              />
              <defs>
                <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.9" />
                  <stop offset="33%" stopColor="#a855f7" stopOpacity="0.9" />
                  <stop offset="66%" stopColor="#14b8a6" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.9" />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
            </svg>
          </div>
          
          {/* Inner spinning dots with enhanced glow */}
          <div className="dots-container">
            <div className="dot dot-1 dot-glow"></div>
            <div className="dot dot-2 dot-glow"></div>
            <div className="dot dot-3 dot-glow"></div>
            <div className="dot dot-4 dot-glow"></div>
          </div>
          
          {/* Center pulse with vibrant glow */}
          <div className="center-pulse">
            <div className="pulse-core"></div>
            <div className="pulse-core-glow"></div>
          </div>
        </div>
        
        {/* Loading text with enhanced glow effect */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mt-8 sm:mt-10 md:mt-12 text-center relative"
        >
          <div className="loading-text text-glow">
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
          <div className="text-xs sm:text-sm text-cyan-300/70 mt-2 font-medium">
            Preparing your personalized experience
          </div>
        </motion.div>
      </div>
      
      <style jsx>{`
        /* Animated background blobs */
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          25% {
            transform: translate(20px, -30px) scale(1.1);
          }
          50% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          75% {
            transform: translate(30px, 10px) scale(1.05);
          }
        }
        
        .animate-blob {
          animation: blob 20s infinite ease-in-out;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animation-delay-3000 {
          animation-delay: 3s;
        }
        
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        
        /* Pulse glow animation */
        @keyframes pulse-glow {
          0%, 100% {
            transform: scale(1);
            opacity: 0.3;
          }
          50% {
            transform: scale(1.3);
            opacity: 0.6;
          }
        }
        
        .animate-pulse-glow {
          animation: pulse-glow 3s ease-in-out infinite;
        }
        
        /* Text glow effect */
        .text-glow {
          text-shadow: 0 0 20px rgba(6, 182, 212, 0.5),
                       0 0 40px rgba(168, 85, 247, 0.3),
                       0 0 60px rgba(20, 184, 166, 0.2);
        }
        
        .profile-loader-container {
          position: relative;
          width: 160px;
          height: 160px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        @media (min-width: 640px) {
          .profile-loader-container {
            width: 180px;
            height: 180px;
          }
        }
        
        @media (min-width: 768px) {
          .profile-loader-container {
            width: 200px;
            height: 200px;
          }
        }
        
        /* Morphing outer ring */
        .morph-ring {
          position: absolute;
          width: 100%;
          height: 100%;
          animation: morphRotate 4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        
        /* Enhanced ring segments with individual glows */
        .ring-glow-1 {
          box-shadow: 0 0 30px rgba(6, 182, 212, 0.6),
                      0 0 60px rgba(6, 182, 212, 0.3),
                      inset 0 0 20px rgba(6, 182, 212, 0.2);
        }
        
        .ring-glow-2 {
          box-shadow: 0 0 30px rgba(168, 85, 247, 0.6),
                      0 0 60px rgba(168, 85, 247, 0.3),
                      inset 0 0 20px rgba(168, 85, 247, 0.2);
        }
        
        .ring-glow-3 {
          box-shadow: 0 0 30px rgba(20, 184, 166, 0.6),
                      0 0 60px rgba(20, 184, 166, 0.3),
                      inset 0 0 20px rgba(20, 184, 166, 0.2);
        }
        
        .ring-glow-4 {
          box-shadow: 0 0 30px rgba(59, 130, 246, 0.6),
                      0 0 60px rgba(59, 130, 246, 0.3),
                      inset 0 0 20px rgba(59, 130, 246, 0.2);
        }
        
        .ring-segment {
          position: absolute;
          width: 140px;
          height: 140px;
          border: 2px solid transparent;
          border-top-color: rgba(96, 165, 250, 0.8);
          border-radius: 50%;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }
        
        @media (min-width: 640px) {
          .ring-segment {
            width: 160px;
            height: 160px;
          }
        }
        
        @media (min-width: 768px) {
          .ring-segment {
            width: 180px;
            height: 180px;
          }
        }
        
        .ring-segment:nth-child(1) {
          animation: segmentRotate1 3s ease-in-out infinite;
          border-top-color: rgba(6, 182, 212, 0.9);
        }
        
        .ring-segment:nth-child(2) {
          animation: segmentRotate2 3s ease-in-out infinite;
          border-right-color: rgba(168, 85, 247, 0.9);
          animation-delay: 0.15s;
        }
        
        .ring-segment:nth-child(3) {
          animation: segmentRotate3 3s ease-in-out infinite;
          border-bottom-color: rgba(20, 184, 166, 0.9);
          animation-delay: 0.3s;
        }
        
        .ring-segment:nth-child(4) {
          animation: segmentRotate4 3s ease-in-out infinite;
          border-left-color: rgba(59, 130, 246, 0.9);
          animation-delay: 0.45s;
        }
        
        /* Middle pulsing ring */
        .pulse-ring {
          position: absolute;
          width: 96px;
          height: 96px;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation: pulseScale 2s ease-in-out infinite;
        }
        
        @media (min-width: 640px) {
          .pulse-ring {
            width: 112px;
            height: 112px;
          }
        }
        
        @media (min-width: 768px) {
          .pulse-ring {
            width: 120px;
            height: 120px;
          }
        }
        
        .rotating-stroke {
          animation: strokeRotate 3s linear infinite;
          transform-origin: center;
        }
        
        /* Inner spinning dots */
        .dots-container {
          position: absolute;
          width: 48px;
          height: 48px;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation: dotsRotate 2s linear infinite;
        }
        
        @media (min-width: 640px) {
          .dots-container {
            width: 54px;
            height: 54px;
          }
        }
        
        @media (min-width: 768px) {
          .dots-container {
            width: 60px;
            height: 60px;
          }
        }
        
        .dot {
          position: absolute;
          width: 6px;
          height: 6px;
          background: linear-gradient(135deg, #06b6d4 0%, #a855f7 100%);
          border-radius: 50%;
        }
        
        .dot-glow {
          box-shadow: 0 0 15px rgba(6, 182, 212, 0.8),
                      0 0 30px rgba(168, 85, 247, 0.5),
                      0 0 45px rgba(20, 184, 166, 0.3);
        }
        
        @media (min-width: 640px) {
          .dot {
            width: 7px;
            height: 7px;
          }
        }
        
        @media (min-width: 768px) {
          .dot {
            width: 8px;
            height: 8px;
          }
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
          width: 24px;
          height: 24px;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }
        
        @media (min-width: 640px) {
          .center-pulse {
            width: 27px;
            height: 27px;
          }
        }
        
        @media (min-width: 768px) {
          .center-pulse {
            width: 30px;
            height: 30px;
          }
        }
        
        .pulse-core {
          width: 100%;
          height: 100%;
          background: radial-gradient(circle, rgba(6, 182, 212, 0.9) 0%, rgba(168, 85, 247, 0.7) 50%, transparent 70%);
          border-radius: 50%;
          animation: corePulse 1.5s ease-in-out infinite;
          filter: blur(0.5px);
        }
        
        .pulse-core-glow {
          position: absolute;
          width: 100%;
          height: 100%;
          background: radial-gradient(circle, rgba(6, 182, 212, 0.4) 0%, rgba(168, 85, 247, 0.3) 40%, transparent 60%);
          border-radius: 50%;
          animation: corePulse 1.5s ease-in-out infinite;
          filter: blur(8px);
          transform: scale(1.5);
        }
        
        /* Loading text animation */
        .loading-text {
          font-size: 1rem;
          font-weight: 500;
          color: #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        @media (min-width: 640px) {
          .loading-text {
            font-size: 1.125rem;
          }
        }
        
        @media (min-width: 768px) {
          .loading-text {
            font-size: 1.25rem;
          }
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
            opacity: 0.5;
            filter: brightness(1);
          }
          50% {
            transform: translate(-50%, -50%) rotate(180deg);
            opacity: 1;
            filter: brightness(1.3);
          }
        }
        
        @keyframes segmentRotate2 {
          0%, 100% {
            transform: translate(-50%, -50%) rotate(90deg);
            opacity: 0.5;
            filter: brightness(1);
          }
          50% {
            transform: translate(-50%, -50%) rotate(270deg);
            opacity: 1;
            filter: brightness(1.3);
          }
        }
        
        @keyframes segmentRotate3 {
          0%, 100% {
            transform: translate(-50%, -50%) rotate(180deg);
            opacity: 0.5;
            filter: brightness(1);
          }
          50% {
            transform: translate(-50%, -50%) rotate(360deg);
            opacity: 1;
            filter: brightness(1.3);
          }
        }
        
        @keyframes segmentRotate4 {
          0%, 100% {
            transform: translate(-50%, -50%) rotate(270deg);
            opacity: 0.5;
            filter: brightness(1);
          }
          50% {
            transform: translate(-50%, -50%) rotate(450deg);
            opacity: 1;
            filter: brightness(1.3);
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
            filter: brightness(1);
          }
          50% {
            transform: scale(1.5);
            opacity: 0.7;
            filter: brightness(1.5);
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
            filter: brightness(1);
          }
          50% {
            transform: translateY(-5px);
            color: #06b6d4;
            filter: brightness(1.2);
            text-shadow: 0 0 10px rgba(6, 182, 212, 0.5);
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