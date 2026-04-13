"use client";

import React from 'react';
import { motion } from 'framer-motion';

const CalendarLoadingSpinner = React.memo(() => {
  const days = Array.from({ length: 7 }, (_, i) => i);
  const dates = Array.from({ length: 28 }, (_, i) => i + 1);
  
  return (
    <div className="min-h-[520px] flex items-center justify-center bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl shadow-xl hover:shadow-2xl hover:border-white/30 transition-all duration-300 p-3 sm:p-4 md:p-6">
      <motion.div 
        animate={{ 
          scale: [1, 1.02, 1],
          opacity: [0.8, 1, 0.8]
        }}
        transition={{ 
          repeat: Infinity,
          duration: 3,
          ease: "easeInOut"
        }}
        className="flex flex-col items-center text-center"
      >
        {/* Creative Calendar Loading Animation */}
        <div className="relative w-32 h-32 mb-8">
          {/* Calendar Base */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl backdrop-blur-md border border-white/20"
            animate={{
              rotateY: [0, 5, -5, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          
          {/* Calendar Header */}
          <motion.div 
            className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-t-2xl flex items-center justify-center"
            animate={{
              opacity: [0.7, 1, 0.7],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <div className="flex space-x-2">
              <div className="w-2 h-6 bg-white/80 rounded-full" />
              <div className="w-2 h-6 bg-white/80 rounded-full" />
            </div>
          </motion.div>
          
          {/* Calendar Grid - simplified for performance */}
          <div className="absolute top-12 left-2 right-2 bottom-2 grid grid-cols-7 gap-1">
            {Array.from({ length: 21 }).map((_, i) => (
              <motion.div
                key={i}
                className="bg-white/10 rounded-sm backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ 
                  opacity: [0, 0.5, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.05,
                  ease: "easeInOut"
                }}
              />
            ))}
          </div>
          
          {/* Floating Calendar Pages */}
          <motion.div
            className="absolute -right-4 -top-4 w-16 h-20 bg-gradient-to-br from-blue-400/30 to-blue-600/30 rounded-lg backdrop-blur-sm border border-blue-400/20"
            animate={{
              y: [-10, 10, -10],
              rotate: [-15, 15, -15],
              opacity: [0.3, 0.7, 0.3],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          
          <motion.div
            className="absolute -left-4 -bottom-4 w-16 h-20 bg-gradient-to-br from-green-400/30 to-green-600/30 rounded-lg backdrop-blur-sm border border-green-400/20"
            animate={{
              y: [10, -10, 10],
              rotate: [15, -15, 15],
              opacity: [0.3, 0.7, 0.3],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1.5
            }}
          />
          
          {/* Center Checkmark Animation */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: 1,
              ease: "easeInOut"
            }}
          >
            <motion.svg
              className="w-12 h-12 text-green-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={3}
            >
              <motion.path
                d="M5 13l4 4L19 7"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  repeatDelay: 1.5,
                  ease: "easeInOut"
                }}
              />
            </motion.svg>
          </motion.div>
        </div>
        
        {/* Loading Text */}
        <motion.p 
          className="text-white/90 font-medium text-lg leading-relaxed"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          Organizing your schedule...
        </motion.p>
        <motion.p 
          className="mt-2 text-white/60 text-sm leading-relaxed flex items-center"
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        >
          <motion.span
            className="inline-block mr-2"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </motion.span>
          Finding the perfect time for your sessions
        </motion.p>
      </motion.div>
    </div>
  );
});

CalendarLoadingSpinner.displayName = 'CalendarLoadingSpinner';

export default CalendarLoadingSpinner;