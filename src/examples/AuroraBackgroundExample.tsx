"use client";

import React from "react";
import { motion } from "motion/react";
import { AuroraBackground } from "@/components/ui/aurora-background";

/**
 * Example component demonstrating the AuroraBackground usage
 * 
 * Usage:
 * 1. Import this component: import AuroraBackgroundExample from "@/examples/AuroraBackgroundExample";
 * 2. Use it in your component: <AuroraBackgroundExample />
 * 
 * Properties:
 * - intensity: 'low' | 'medium' | 'high' - Controls animation performance vs quality
 *   - low: Best performance, less visual impact
 *   - medium: Balanced choice
 *   - high: Most visually striking but more resource intensive
 * 
 * - showRadialGradient: boolean - Whether to show the radial gradient effect
 */
export default function AuroraBackgroundExample() {
  return (
    <AuroraBackground intensity="low">
      <div className="min-h-screen w-full flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0.0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.3,
            duration: 0.8,
            ease: "easeInOut",
          }}
          className="relative flex flex-col gap-6 items-center justify-center px-4 text-center"
        >
          <h1 className="text-4xl md:text-7xl font-bold text-white">
            Aurora Background
          </h1>
          <p className="text-xl md:text-3xl text-white/90 max-w-3xl">
            A beautiful animated background effect for your website.
            Customizable intensity and appearance.
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            className="mt-6 bg-white text-blue-600 rounded-full px-8 py-4 font-medium text-lg shadow-lg"
          >
            Example Button
          </motion.button>
        </motion.div>
      </div>
    </AuroraBackground>
  );
}