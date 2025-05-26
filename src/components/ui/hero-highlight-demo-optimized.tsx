"use client";
import { motion } from "motion/react";
import { HeroHighlight, Highlight } from "./hero-highlight-optimized";
import { useEffect, useState } from "react";

export default function HeroHighlightDemo() {
  const [mounted, setMounted] = useState(false);
  const [highlightReady, setHighlightReady] = useState(false);

  useEffect(() => {
    // Two-phase loading approach
    // Phase 1: Mount the container with minimal animation
    const mountTimer = setTimeout(() => setMounted(true), 50);
    
    // Phase 2: After container is mounted, prepare for text highlight animation
    const highlightTimer = setTimeout(() => setHighlightReady(true), 400);
    
    return () => {
      clearTimeout(mountTimer);
      clearTimeout(highlightTimer);
    };
  }, []);

  return (
    <HeroHighlight containerClassName="h-auto min-h-[12rem] md:min-h-[16rem] py-6">
      <motion.h1
        initial={{
          opacity: 0,
          y: 20,
        }}
        animate={{
          opacity: mounted ? 1 : 0,
          y: mounted ? [20, -5, 0] : 20,
        }}
        transition={{
          duration: 0.5,
          ease: [0.4, 0.0, 0.2, 1],
        }}
        className="text-sm px-4 md:text-4xl lg:text-5xl font-bold text-stone-50 max-w-4xl leading-relaxed lg:leading-snug text-center mx-auto"
      >
        Discover AI-powered therapy that helps you build{" "}
        {highlightReady ? (
          <Highlight className="text-white">
            healthier, more fulfilling relationships
          </Highlight>
        ) : (
          <span className="bg-gradient-to-r from-blue-500 to-pink-300 px-1 pb-1 rounded-lg text-white">
            healthier, more fulfilling relationships
          </span>
        )}{" "}
        with those who matter most.
      </motion.h1>
    </HeroHighlight>
  );
}