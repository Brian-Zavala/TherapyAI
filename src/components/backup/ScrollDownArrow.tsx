"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";

interface ScrollDownArrowProps {
  onClick?: () => void;
}

export default function ScrollDownArrow({ onClick }: ScrollDownArrowProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  const handleHoverStart = useCallback(() => setIsHovered(true), []);
  const handleHoverEnd = useCallback(() => setIsHovered(false), []);

  return (
    <motion.div
      className="cursor-pointer will-change-transform"
      onHoverStart={handleHoverStart}
      onHoverEnd={handleHoverEnd}
      onClick={onClick}
      animate={{
        y: [0, 8, 0],
        opacity: [0.7, 1, 0.7],
      }}
      transition={{
        y: {
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        },
        opacity: {
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        },
      }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      style={{
        transform: "translateZ(0)", // Enable hardware acceleration
      }}
    >
      <AnimatePresence mode="wait">
        {isHovered ? (
          <motion.div
            key="text"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 6 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.2 }}
            className="text-stone-50 font-medium text-3xl will-change-transform"
          >
            Scroll Down
          </motion.div>
        ) : (
          <motion.div
            key="arrow"
            initial={{ opacity: 0, y: -3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 3 }}
            transition={{ duration: 0.2 }}
            className="will-change-transform"
          >
            <svg
              className="w-8 h-8 text-stone-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
