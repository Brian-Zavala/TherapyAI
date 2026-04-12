"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const phrases = [
  "Take a moment to breathe...",
  "You showed up today. That takes courage.",
  "Every step forward matters, no matter how small.",
  "Be gentle with yourself.",
  "Healing is not linear — and that's okay.",
  "What you shared today was brave.",
  "Growth happens one conversation at a time.",
  "You are worthy of peace.",
  "Rest in this stillness for a moment.",
  "Thank you for investing in yourself today.",
];

interface SessionWindDownModalProps {
  isOpen: boolean;
}

export default function SessionWindDownModal({ isOpen }: SessionWindDownModalProps) {
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    setPhraseIndex(0);
    const id = setInterval(() => {
      setPhraseIndex((i) => (i + 1) % phrases.length);
    }, 3800);
    return () => clearInterval(id);
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="wind-down-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: "easeInOut" }}
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center overflow-hidden"
          style={{
            background:
              "linear-gradient(160deg, #0d0b1e 0%, #110d2e 35%, #0a1628 65%, #0b1020 100%)",
          }}
        >
          {/* Ambient orbs */}
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 340,
              height: 340,
              top: "10%",
              left: "15%",
              background:
                "radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 70%)",
              filter: "blur(40px)",
            }}
            animate={{ x: [0, 30, -20, 0], y: [0, -20, 15, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 280,
              height: 280,
              bottom: "12%",
              right: "10%",
              background:
                "radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)",
              filter: "blur(50px)",
            }}
            animate={{ x: [0, -25, 20, 0], y: [0, 20, -15, 0] }}
            transition={{
              duration: 22,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 3,
            }}
          />
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 200,
              height: 200,
              top: "55%",
              left: "5%",
              background:
                "radial-gradient(circle, rgba(20,184,166,0.10) 0%, transparent 70%)",
              filter: "blur(35px)",
            }}
            animate={{ x: [0, 20, -10, 0], y: [0, -25, 10, 0] }}
            transition={{
              duration: 26,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 7,
            }}
          />

          {/* Breathing pulse ring */}
          <div className="relative mb-10 flex items-center justify-center">
            {/* Outer glow rings */}
            {[1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className="absolute rounded-full border border-purple-400/20"
                style={{ width: 80 + i * 36, height: 80 + i * 36 }}
                animate={{ scale: [1, 1.12, 1], opacity: [0.4, 0.1, 0.4] }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.6,
                }}
              />
            ))}
            {/* Center orb */}
            <motion.div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{
                background:
                  "radial-gradient(circle, rgba(167,139,250,0.6) 0%, rgba(139,92,246,0.3) 60%, transparent 100%)",
                boxShadow: "0 0 30px rgba(139,92,246,0.4)",
              }}
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              {/* Heart icon */}
              <motion.svg
                className="w-6 h-6"
                viewBox="0 0 24 24"
                fill="none"
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <path
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  stroke="rgba(216,180,254,0.9)"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </motion.svg>
            </motion.div>
          </div>

          {/* Quote area */}
          <div className="relative w-full max-w-xs px-6 text-center" style={{ minHeight: 96 }}>
            <AnimatePresence mode="wait">
              <motion.p
                key={phraseIndex}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.9, ease: "easeInOut" }}
                className="text-white/90 text-xl sm:text-2xl font-light leading-relaxed tracking-wide"
              >
                {phrases[phraseIndex]}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Dot progress indicators */}
          <div className="flex gap-1.5 mt-8">
            {phrases.map((_, i) => (
              <motion.div
                key={i}
                className="rounded-full bg-white"
                animate={{
                  opacity: i === phraseIndex ? 0.7 : 0.15,
                  scale: i === phraseIndex ? 1 : 0.7,
                }}
                transition={{ duration: 0.4 }}
                style={{ width: 5, height: 5 }}
              />
            ))}
          </div>

          {/* Subtle processing label */}
          <motion.p
            className="absolute bottom-10 text-white/25 text-xs tracking-widest uppercase"
            animate={{ opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            Saving your session&hellip;
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
