"use client";

import { motion } from "motion/react";
import React, { memo } from "react";

interface Props {
  className?: string;
}

const SpiralTextAnimation: React.FC<Props> = memo(({ className = "" }) => {
  // Animation settings for revealing each letter - optimized for performance
  const letterVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.04, // Reduced delay for faster animation
        duration: 0.2, // Reduced duration
        ease: [0.4, 0, 0.2, 1], // Optimized ease curve
      },
    }),
  };

  // The text to be revealed
  const text = "";
  const letters = text.split("");

  return (
    <div className={`relative overflow-visible ${className}`}>
      {/* Hidden text for SEO */}
      <span className="sr-only"></span>

      {/* Text that appears letter by letter */}
      <div className="text-2xl sm:text-5xl md:text-9xlxl font-bold flex justify-center overflow-visible will-change-transform">
        <div className="flex flex-wrap justify-center px-2 text-center overflow-visible py-2 min-h-[5rem]">
          {letters.map((letter, index) => (
            <motion.span
              key={`letter-${index}`}
              variants={letterVariants}
              initial="hidden"
              animate="visible"
              custom={index}
              className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-blue-600 overflow-visible inline-block"
              style={{
                willChange: "opacity, transform"
              }}
            >
              {letter === " " ? <span>&nbsp;</span> : letter}
            </motion.span>
          ))}
        </div>
      </div>
    </div>
  );
});

export default SpiralTextAnimation;
