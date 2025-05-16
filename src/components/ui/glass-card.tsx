"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  blur?: string;
}

export default function GlassCard({
  children,
  className = "",
  blur = "backdrop-blur-xl",
}: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative ${className}`}
    >
      {/* Glass effect */}
      <div
        className={`absolute inset-0 bg-black/35 ${blur} rounded-3xl border border-black/30 shadow-2xl`}
      />

      {/* Content */}
      <div className="relative z-10 p-8">{children}</div>
    </motion.div>
  );
}
